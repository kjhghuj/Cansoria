import { buildPriceRepairPlan, CatalogPriceRow } from "../price-unit-repair"

function watchPrice(overrides: Partial<CatalogPriceRow> = {}): CatalogPriceRow {
  return {
    id: "price_watch_gbp", price_set_id: "pset_watch", amount: "28782",
    raw_amount: { value: "28782", precision: 20 }, currency_code: "gbp",
    price_list_id: null, min_quantity: null, max_quantity: null,
    rules_count: 0, rules: [], kind: "product",
    handle: "meridian-automatic", sku: "CAN-MERIDIAN-36MM-LEATHER-STRAP-BLACK",
    options: { Size: "36mm", Strap: "Leather Strap", Dial: "Black" },
    option_count: 3,
    metadata: { size: "36mm", strap: "Leather Strap", dial: "Black" },
    ...overrides,
  }
}

describe("price-unit repair plan", () => {
  it("plans an exact known legacy price without replacing the price ID", () => {
    const plan = buildPriceRepairPlan([watchPrice()])
    expect(plan.rejected).toEqual([])
    expect(plan.changes).toEqual([expect.objectContaining({
      id: "price_watch_gbp", before: 28782, after: 287.82,
      raw_before: { value: "28782", precision: 20 },
    })])
  })

  it("is a no-op for already corrected values, including free shipping", () => {
    const corrected = watchPrice({ amount: "287.82", raw_amount: { value: "287.82", precision: 20 } })
    const free = watchPrice({
      id: "price_free", kind: "shipping", shipping_name: "Free Watch Delivery",
      shipping_code: "free-watch-delivery", price_type: "flat", provider_id: "manual_manual",
      amount: "0", raw_amount: { value: "0", precision: 20 },
    })
    expect(buildPriceRepairPlan([corrected, free])).toMatchObject({ changes: [], already_correct: 2, rejected: [] })
  })

  it.each([
    { amount: "288", raw_amount: { value: "288", precision: 20 } },
    { sku: "CUSTOM-PRICE" },
    { metadata: { size: "38mm", strap: "Leather Strap", dial: "Black" } },
    { options: { Size: "36mm", Strap: "Steel Bracelet", Dial: "Black" } },
    { price_list_id: "sale_list" },
    { min_quantity: "5" },
    { raw_amount: { value: "999", precision: 20 } },
    { rules_count: 1, rules: [{ attribute: "customer_group_id", value: "vip", operator: "eq" }] },
  ])("rejects unknown or modified managed price: %j", (overrides) => {
    const plan = buildPriceRepairPlan([watchPrice(overrides)])
    expect(plan.changes).toEqual([])
    expect(plan.rejected).toHaveLength(1)
  })

  it("leaves an unrelated product untouched, even if its price looks like cents", () => {
    expect(buildPriceRepairPlan([watchPrice({ handle: "owner-custom-product" })])).toMatchObject({
      changes: [], unmanaged: 1, rejected: [],
    })
  })

  it("checks the region-specific shipping rule before planning a change", () => {
    const shipping = watchPrice({
      kind: "shipping", shipping_name: "Standard Watch Delivery", shipping_code: "standard-watch-delivery",
      price_type: "flat", provider_id: "manual_manual", amount: "900",
      raw_amount: { value: "900", precision: 20 }, rules_count: 1,
      rules: [{ attribute: "region_id", value: "reg_uk", operator: "eq", region_currency: "gbp", region_name: "United Kingdom" }],
    })
    expect(buildPriceRepairPlan([shipping]).changes[0].after).toBe(9)
    expect(buildPriceRepairPlan([{ ...shipping, currency_code: "usd" }]).rejected).toHaveLength(1)
  })

  it("refuses duplicate IDs rather than updating a shared price twice", () => {
    expect(buildPriceRepairPlan([watchPrice(), watchPrice()]).rejected).toHaveLength(1)
  })
})
