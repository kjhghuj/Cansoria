import type { MedusaRequest, MedusaResponse, MedusaNextFunction, AuthenticatedMedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { verifyAccessToken } from "./access-tokens"
import { portraitCartReady, PORTRAIT_CART_FIELDS } from "./portrait-photos"

export function sensitiveResponse(res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Referrer-Policy", "no-referrer")
}

export function customerActor(req: MedusaRequest): string | undefined {
  return (req as AuthenticatedMedusaRequest).auth_context?.actor_id
}

function resourceId(req: MedusaRequest, prefix: string): string | undefined {
  const pathname = req.originalUrl?.split("?")[0] || req.path || ""
  return pathname.match(new RegExp(`^/store/${prefix}/([^/]+)`, "i"))?.[1] || req.params.id
}

/** Medusa links guest carts to customer records with has_account=false. Missing account state fails closed. */
export function registeredOwner(resource: any): boolean {
  return Boolean(resource.customer_id && resource.customer?.has_account !== false)
}

export async function authorizeCart(req: MedusaRequest, id: string): Promise<boolean> {
  if (typeof id !== "string" || !/^cart_[a-zA-Z0-9_-]{1,128}$/.test(id)) return false
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "cart", fields: ["id", "customer_id", "customer.has_account"], filters: { id } })
  const cart = data?.[0]
  if (!cart) return false
  if (registeredOwner(cart)) return Boolean(customerActor(req) && customerActor(req) === cart.customer_id)
  return verifyAccessToken(req.headers["x-cart-access-token"], "cart", id)
}

export async function cartAccessGuard(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  sensitiveResponse(res)
  try {
    const id = resourceId(req, "carts")
    const pathname = req.originalUrl?.split("?")[0] || req.path || ""
    const claiming = /\/customer\/?$/i.test(pathname)
    if (!id || (claiming && !customerActor(req)) || !(await authorizeCart(req, id))) {
      return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
    }
    const lineId = pathname.match(/\/line-items\/([^/]+)\/?$/i)?.[1]
    if (lineId) {
      try {
        const item = await req.scope.resolve(Modules.CART).retrieveLineItem(lineId, { select: ["id", "cart_id"] })
        if (item.cart_id !== id) return res.status(403).json({ type: "forbidden", message: "Line item access denied" })
      } catch {
        return res.status(403).json({ type: "forbidden", message: "Line item access denied" })
      }
    }
    return next()
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Cart access unavailable" })
  }
}

export async function paymentAccessGuard(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  sensitiveResponse(res)
  const pathname = req.originalUrl?.split("?")[0] || req.path || ""
  if (req.method === "POST" && /\/payment-sessions\/?$/i.test(pathname) && (req.body as any)?.provider_id !== "pp_stripe_stripe") return res.status(403).json({ type: "forbidden", message: "Unsupported payment provider" })
  try {
    const collectionId = resourceId(req, "payment-collections")
    let cartId = (req.body as any)?.cart_id
    if (collectionId) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "cart_payment_collection", fields: ["cart_id"], filters: { payment_collection_id: collectionId } })
      cartId = data?.[0]?.cart_id
    }
    if (!cartId || !(await authorizeCart(req, cartId))) {
      return res.status(403).json({ type: "forbidden", message: "Payment access denied" })
    }
    if (req.method === "POST") {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "cart", fields: PORTRAIT_CART_FIELDS, filters: { id: cartId } })
      if (!data[0] || !portraitCartReady(data[0], cartId)) return res.status(400).json({ type: "invalid_request", message: "Each pet portrait needs a valid photo and painting style before payment." })
    }
    return next()
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Payment access unavailable" })
  }
}

export function disableOrderTransfer(_req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  return res.status(410).json({ type: "gone", message: "Use the verified order claim flow" })
}
