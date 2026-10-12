import { CatalogPriceRow, expectedCatalogAmount } from "./price-unit-repair"

export type CartPriceSnapshot = {
  cart: { id: string; currency_code: string; region_currency: string; metadata: unknown; completed_at: unknown; [key: string]: unknown }
  items: { id: string; variant_id: string; quantity: number; metadata: unknown; unit_price: string; raw_unit_price: { value: string }; is_custom_price: boolean; [key: string]: unknown }[]
  shipping: { id: string; shipping_option_id: string; amount: string; raw_amount: { value: string }; [key: string]: unknown }[]
  collections: { id: string; amount: string; status: string; authorized_amount: string | null; captured_amount: string | null; refunded_amount: string | null; completed_at: unknown; [key: string]: unknown }[]
  session_count: number; payment_count: number; order_count: number
}

export function planCartPriceRefresh(snapshot: CartPriceSnapshot, catalog: CatalogPriceRow[]) {
  const { cart } = snapshot
  if (cart.completed_at || snapshot.order_count || snapshot.session_count || snapshot.payment_count ||
      snapshot.collections.some(collection => collection.completed_at ||
        !["not_paid", "awaiting"].includes(collection.status) ||
        [collection.authorized_amount, collection.captured_amount, collection.refunded_amount].some(amount => {
          const value = amount === null ? 0 : Number(amount)
          return !Number.isFinite(value) || value !== 0
        }))) {
    throw new Error("Cart has an order, payment session, payment, or completed/authorized collection")
  }
  if (cart.currency_code !== cart.region_currency) throw new Error("Cart and region currencies differ")
  let old_items = 0
  let old_shipping = 0
  const classify = (amount: string, raw: { value: string }, expected: number) => {
    const current = Number(amount)
    if (Number(raw?.value) !== current || !Number.isFinite(current)) throw new Error("Inconsistent cart raw amount")
    if (current === expected) return false
    if (current === Math.round(expected * 100)) return true
    throw new Error("Cart amount does not exactly match an approved or legacy seed price")
  }
  for (const item of snapshot.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new Error("Invalid cart item quantity")
    if (item.is_custom_price !== false) throw new Error("Custom cart item price")
    const matches = catalog.filter(row => row.kind === "product" && (row as any).variant_id === item.variant_id && row.currency_code === cart.currency_code)
    if (matches.length !== 1) throw new Error("Missing/ambiguous catalog price for cart item")
    const expected = expectedCatalogAmount(matches[0])
    if (expected === undefined) throw new Error("Unmanaged cart item")
    if (classify(item.unit_price, item.raw_unit_price, expected)) old_items++
  }
  for (const method of snapshot.shipping) {
    const matches = catalog.filter(row => row.kind === "shipping" && (row as any).shipping_option_id === method.shipping_option_id && row.currency_code === cart.currency_code)
    // The seed has one currency base and one region override with equal amounts.
    const amounts = matches.map(row => expectedCatalogAmount(row))
    if (!amounts.length || amounts.some(amount => amount === undefined || amount !== amounts[0])) throw new Error("Unmanaged/ambiguous cart shipping price")
    if (classify(method.amount, method.raw_amount, amounts[0]!)) old_shipping++
  }
  return { cart_id: cart.id, old_items, old_shipping, needs_refresh: old_items + old_shipping > 0 }
}

export function cartProtectedData(snapshot: CartPriceSnapshot) {
  return {
    id: snapshot.cart.id, metadata: snapshot.cart.metadata,
    items: snapshot.items.map(item => ({ id: item.id, variant_id: item.variant_id, quantity: item.quantity, metadata: item.metadata })),
    shipping: snapshot.shipping.map(method => ({ id: method.id, shipping_option_id: method.shipping_option_id, metadata: method.metadata, data: method.data })),
    collections: snapshot.collections.map(collection => collection.id),
  }
}
