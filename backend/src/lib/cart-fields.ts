import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { defaultStoreCartFields } from "@medusajs/medusa/api/store/carts/query-config"
import { issueAccessToken } from "./access-tokens"
import { publicPortraitMetadata } from "./portrait-photos"

// Never expand a customer's reverse links, including carts, orders or saved addresses.
export const SAFE_PAYMENT_FIELDS = ["id", "currency_code", "amount", "status", "payment_sessions.id", "payment_sessions.provider_id", "payment_sessions.status", "payment_sessions.data"]
export const SAFE_CART_FIELDS = [...defaultStoreCartFields.filter(field => !/^(customer|payment_collection)(\.|$)/.test(field.replace(/^\*/, ""))), ...SAFE_PAYMENT_FIELDS.map(field => `payment_collection.${field}`), "items.variant.images.*", "items.variant.thumbnail", "region.*"]
export const SAFE_ORDER_FIELDS = ["id", "display_id", "email", "status", "created_at", "total", "subtotal", "shipping_total", "currency_code", "items.id", "items.title", "items.quantity", "items.unit_price", "items.total", "items.variant_id", "items.product_id", "items.thumbnail", "items.variant_title", "items.product_title", "items.metadata"]

export function applyCartFields(req: MedusaRequest, completing = false) {
  // Keep native variant media in the cart without allowing reverse links.
  if (!completing) req.allowed = Array.from(new Set([...(req.allowed || []), "items.variant.images", "items.variant.thumbnail"]))
  const fields = completing ? SAFE_ORDER_FIELDS : SAFE_CART_FIELDS
  req.query = { ...req.query, fields: fields.join(",") } as any
  if (req.queryConfig) req.queryConfig.fields = fields.map(field => field.startsWith("*") ? `${field.slice(1)}.*` : field)
}

export function forceCartFields(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  applyCartFields(req, /\/complete\/?$/i.test(req.originalUrl?.split("?")[0] || req.path || ""))
  projectPaymentResponses(_res)
  return next()
}

function projectPaymentResponses(res: MedusaResponse) {
  const original = res.json
  res.json = function (body: any) {
    projectOrderMetadata(body)
    // Completion attaches a short-lived order read capability so the
    // storefront confirmation page can re-read the order when browser
    // storage is unavailable. It can never claim the order for an account.
    const orderId = body?.order?.id || (body?.type === "order" ? body?.data?.id : null)
    if (typeof orderId === "string" && /^order_[a-zA-Z0-9_-]{1,128}$/.test(orderId)) {
      try { body.order_access_token = issueAccessToken("order-read", orderId, 1800) } catch { /* signing config unavailable */ }
    }
    const collection = body?.payment_collection || body?.cart?.payment_collection || body?.parent?.payment_collection
    if (Array.isArray(collection?.payment_sessions)) {
      collection.payment_sessions = collection.payment_sessions.map((session: any) => ({ id: session.id, provider_id: session.provider_id, status: session.status, data: { client_secret: session.data?.client_secret } }))
    }
    return original.call(this, body)
  } as any
}

export function projectOrderMetadata(body: any) {
  const orders = body?.order ? [body.order] : body?.orders
  if (!Array.isArray(orders)) return
  for (const order of orders) {
    delete order.metadata
    for (const item of order.items || []) {
      const metadata = publicPortraitMetadata(item.metadata)
      if (metadata) item.metadata = metadata
      else delete item.metadata
    }
  }
}

export function forcePaymentFields(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  req.query = { ...req.query, fields: SAFE_PAYMENT_FIELDS.join(",") } as any
  if (req.queryConfig) req.queryConfig.fields = SAFE_PAYMENT_FIELDS.slice()
  projectPaymentResponses(res)
  return next()
}

/** Address IDs are not public write capabilities. A cart receives a new address object. */
export function safeCartInput(input: any): any | null {
  const result = { ...input }
  for (const field of ["shipping_address", "billing_address"]) {
    const address = result[field]
    if (address === undefined || address === null) continue
    if (typeof address !== "object" || Array.isArray(address)) return null
    const { id: _id, ...properties } = address
    result[field] = properties
  }
  delete result.customer_id
  if (result.metadata && typeof result.metadata === "object" && !Array.isArray(result.metadata)) {
    const { portrait_photos: _photos, ...metadata } = result.metadata
    result.metadata = metadata
  }
  return result
}
