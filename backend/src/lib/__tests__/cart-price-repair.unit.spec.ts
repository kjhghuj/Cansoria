import path from "node:path"
import { cartProtectedData, CartPriceSnapshot, planCartPriceRefresh } from "../cart-price-repair"
import { CatalogPriceRow } from "../price-unit-repair"

const price = {
  id: "price", kind: "product", variant_id: "variant", currency_code: "gbp", rules: [], rules_count: 0,
  handle: "meridian-automatic", sku: "CAN-MERIDIAN-36MM-LEATHER-STRAP-BLACK", option_count: 3,
  options: { Size: "36mm", Strap: "Leather Strap", Dial: "Black" },
  metadata: { size: "36mm", strap: "Leather Strap", dial: "Black" },
} as unknown as CatalogPriceRow

function cart(): CartPriceSnapshot {
  return {
    cart: { id: "cart", currency_code: "gbp", region_currency: "gbp", completed_at: null, metadata: { gift_message: "For Dad" } },
    items: [{ id: "item", variant_id: "variant", quantity: 1, metadata: { engraving: { text: "For Dad", font: "serif" } }, unit_price: "28782", raw_unit_price: { value: "28782" }, is_custom_price: false }],
    shipping: [], collections: [], session_count: 0, payment_count: 0, order_count: 0,
  }
}

describe("unfinished cart price protection", () => {
  it("plans only exact old units and becomes a no-op after refresh", () => {
    const snapshot = cart()
    expect(planCartPriceRefresh(snapshot, [price])).toMatchObject({ old_items: 1, needs_refresh: true })
    snapshot.items[0].unit_price = "287.82"
    snapshot.items[0].raw_unit_price.value = "287.82"
    expect(planCartPriceRefresh(snapshot, [price])).toMatchObject({ old_items: 0, needs_refresh: false })
  })

  it.each(["session_count", "payment_count", "order_count"] as const)("refuses %s before touching cart amounts", key => {
    const snapshot = cart(); snapshot[key] = 1
    expect(() => planCartPriceRefresh(snapshot, [price])).toThrow()
  })

  it("refuses custom or unknown line prices", () => {
    const snapshot = cart(); snapshot.items[0].is_custom_price = true
    expect(() => planCartPriceRefresh(snapshot, [price])).toThrow()
    snapshot.items[0].is_custom_price = false; snapshot.items[0].unit_price = "28783"
    snapshot.items[0].raw_unit_price.value = "28783"
    expect(() => planCartPriceRefresh(snapshot, [price])).toThrow()
  })

  it.each([0, -1, 1.5, NaN])("refuses invalid item quantity %s", quantity => {
    const snapshot = cart(); snapshot.items[0].quantity = quantity
    expect(() => planCartPriceRefresh(snapshot, [price])).toThrow("quantity")
  })

  it.each([
    { status: "authorized" }, { status: "partially_captured" },
    { authorized_amount: "bad" }, { captured_amount: "-1" },
    { refunded_amount: "0.01" }, { completed_at: "2026-10-09" },
  ])("refuses unsafe collection state %j", overrides => {
    const snapshot = cart()
    snapshot.collections = [{ id: "collection", amount: "28782", status: "not_paid", completed_at: null,
      authorized_amount: null, captured_amount: null, refunded_amount: null, ...overrides }]
    expect(() => planCartPriceRefresh(snapshot, [price])).toThrow()
  })

  it("records engraving metadata, quantity, line IDs and method IDs for post-refresh comparison", () => {
    expect(cartProtectedData(cart())).toMatchObject({
      metadata: { gift_message: "For Dad" },
      items: [{ id: "item", quantity: 1, metadata: { engraving: { text: "For Dad", font: "serif" } } }],
    })
  })

  it("the installed native Medusa line preparation keeps original metadata while changing price", () => {
    const file = path.join(path.dirname(require.resolve("@medusajs/core-flows")), "cart/utils/prepare-line-item-data.js")
    const { prepareLineItemData } = require(file)
    const snapshot = cart()
    const item = prepareLineItemData({ item: snapshot.items[0], cartId: "cart", variant: {
      id: "variant", title: "36mm", product: { id: "product", title: "Meridian Automatic" },
    }, unitPrice: 287.82, isCustomPrice: false, isTaxInclusive: false })
    expect(item.unit_price).toBe(287.82)
    expect(item.quantity).toBe(1)
    expect(item.metadata).toEqual(snapshot.items[0].metadata)
  })
})
