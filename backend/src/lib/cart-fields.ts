import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { defaultStoreCartFields } from "@medusajs/medusa/api/store/carts/query-config"

// Never expand a customer's reverse links, including carts, orders or saved addresses.
export const SAFE_PAYMENT_FIELDS = ["id", "currency_code", "amount", "status", "payment_sessions.id", "payment_sessions.provider_id", "payment_sessions.status", "payment_sessions.data"]
export const SAFE_CART_FIELDS = [...defaultStoreCartFields.filter(field => !/^(customer|payment_collection)(\.|$)/.test(field.replace(/^\*/, ""))), ...SAFE_PAYMENT_FIELDS.map(field => `payment_collection.${field}`), "items.variant.images.*", "items.variant.thumbnail", "region.*"]
export const SAFE_ORDER_FIELDS = ["id", "display_id", "email", "status", "created_at", "total", "subtotal", "shipping_total", "currency_code", "items.id", "items.title", "items.quantity", "items.unit_price", "items.total", "items.variant_id", "items.product_id", "items.thumbnail", "items.variant_title", "items.product_title"]

export function applyCartFields(req: MedusaRequest, completing = false) {
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
    const collection = body?.payment_collection || body?.cart?.payment_collection || body?.parent?.payment_collection
    if (Array.isArray(collection?.payment_sessions)) {
      collection.payment_sessions = collection.payment_sessions.map((session: any) => ({ id: session.id, provider_id: session.provider_id, status: session.status, data: { client_secret: session.data?.client_secret } }))
    }
    return original.call(this, body)
  } as any
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
  return result
}
