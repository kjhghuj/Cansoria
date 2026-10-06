import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { POST as nativeComplete } from "@medusajs/medusa/api/store/carts/[id]/complete/route"
import { authorizeCart, customerActor, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"
import { eligibleWelcomeCodes, type CheckoutCart } from "../../../../../lib/welcome-promotions"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req, true)
  const id = req.params.id
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    // Identity updates and explicit claims use this same lock; authorization is checked again inside it.
    await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "cart", fields: ["id", "email", "customer_id", "completed_at", "promotions.code", "payment_collection.payment_sessions.provider_id"], filters: { id } })
      const cart = data?.[0] as unknown as CheckoutCart | undefined
      if (!cart) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      // Preserve the native idempotent retry for the already committed order after mailbox/browser interruption.
      if (cart.completed_at) return nativeComplete(req as any, res)
      if (cart.payment_collection?.payment_sessions?.some(session => session?.provider_id !== "pp_stripe_stripe")) return res.status(403).json({ type: "forbidden", message: "Unsupported payment provider" })
      const codes = (cart.promotions || []).map(p => p?.code).filter((code): code is string => typeof code === "string" && /^ART15-/i.test(code))
      if (!codes.length) return nativeComplete(req as any, res)
      const actor = customerActor(req)
      if (!actor || actor !== cart.customer_id || !cart.email) return res.status(403).json({ type: "forbidden", message: "Welcome code requires its eligible account" })
      return locking.execute(Array.from(new Set(codes)).sort().map(code => `welcome-usage:${code}`), async () => {
        if (!(await eligibleWelcomeCodes(req, codes, actor, cart.email!))) return res.status(403).json({ type: "forbidden", message: "Welcome code is not eligible for this account" })
        // Await the workflow promise itself. A browser disconnect cannot release this lock early.
        return await nativeComplete(req as any, res)
      }, { timeout: 300 })
    }, { timeout: 300 })
  } catch {
    if (!res.headersSent && !res.destroyed) return res.status(503).json({ type: "unavailable", message: "Checkout completion unavailable" })
  }
}
