import { buildPriceRepairPlan, CatalogPriceRow } from "../price-unit-repair"

function petPrice(overrides: Partial<CatalogPriceRow> = {}): CatalogPriceRow {
  return {
    id: "price_pet_gbp", price_set_id: "pset_pet", amount: "8502",
    raw_amount: { value: "8502", precision: 20 }, currency_code: "gbp",
    price_list_id: null, min_quantity: null, max_quantity: null,
    rules_count: 0, rules: [], kind: "product",
    handle: "pet-portrait-oil-painting", sku: "CAN-PET-8X10-CANVAS-ONLY-PORTRAIT",
    options: { Size: "8x10", Framing: "Canvas Only", Orientation: "Portrait" },
    option_count: 3,
    metadata: { size: "8x10", framing: "Canvas Only", orientation: "Portrait" },
    ...overrides,
  }
}

describe("price-unit repair plan", () => {
  it("plans an exact known legacy price without replacing the price ID", () => {
    const plan = buildPriceRepairPlan([petPrice()])
    expect(plan.rejected).toEqual([])
    expect(plan.changes).toEqual([expect.objectContaining({
      id: "price_pet_gbp", before: 8502, after: 85.02,
      raw_before: { value: "8502", precision: 20 },
    })])
  })

  it("is a no-op for already corrected values, including free shipping", () => {
    const corrected = petPrice({ amount: "85.02", raw_amount: { value: "85.02", precision: 20 } })
    const free = petPrice({
      id: "price_free", kind: "shipping", shipping_name: "Free Art Delivery",
      shipping_code: "free-art-delivery", price_type: "flat", provider_id: "manual_manual",
      amount: "0", raw_amount: { value: "0", precision: 20 },
    })
    expect(buildPriceRepairPlan([corrected, free])).toMatchObject({ changes: [], already_correct: 2, rejected: [] })
  })

  it.each([
    { amount: "87", raw_amount: { value: "87", precision: 20 } },
    { sku: "CUSTOM-PRICE" },
    { metadata: { size: "12x16", framing: "Canvas Only", orientation: "Portrait" } },
    { options: { Size: "8x10", Framing: "Framed", Orientation: "Portrait" } },
    { price_list_id: "sale_list" },
    { min_quantity: "5" },
    { raw_amount: { value: "999", precision: 20 } },
    { rules_count: 1, rules: [{ attribute: "customer_group_id", value: "vip", operator: "eq" }] },
  ])("rejects unknown or modified managed price: %j", (overrides) => {
    const plan = buildPriceRepairPlan([petPrice(overrides)])
    expect(plan.changes).toEqual([])
    expect(plan.rejected).toHaveLength(1)
  })

  it("leaves an unrelated product untouched, even if its price looks like cents", () => {
    expect(buildPriceRepairPlan([petPrice({ handle: "owner-custom-product" })])).toMatchObject({
      changes: [], unmanaged: 1, rejected: [],
    })
  })

  it("checks the region-specific shipping rule before planning a change", () => {
    const shipping = petPrice({
      kind: "shipping", shipping_name: "Standard Art Delivery", shipping_code: "standard-art-delivery",
      price_type: "flat", provider_id: "manual_manual", amount: "900",
      raw_amount: { value: "900", precision: 20 }, rules_count: 1,
      rules: [{ attribute: "region_id", value: "reg_uk", operator: "eq", region_currency: "gbp", region_name: "United Kingdom" }],
    })
    expect(buildPriceRepairPlan([shipping]).changes[0].after).toBe(9)
    expect(buildPriceRepairPlan([{ ...shipping, currency_code: "usd" }]).rejected).toHaveLength(1)
  })

  it("refuses duplicate IDs rather than updating a shared price twice", () => {
    expect(buildPriceRepairPlan([petPrice(), petPrice()]).rejected).toHaveLength(1)
  })
})
