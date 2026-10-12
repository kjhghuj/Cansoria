import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { POST as nativeComplete } from "@medusajs/medusa/api/store/carts/[id]/complete/route"
import { authorizeCart, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"
import { CheckoutCompletionError } from "../../../../../lib/checkout-completion"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req, true)
  const id = req.params.id
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    // Identity updates and explicit claims use this same lock; authorization is checked again inside it.
    return await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      // Shared native validate hook also covers the payment callback and order-link retries.
      return await nativeComplete(req as Parameters<typeof nativeComplete>[0], res)
    }, { timeout: 300 })
  } catch (error) {
    if (res.headersSent || res.destroyed) return
    if (error instanceof CheckoutCompletionError) return res.status(error.status).json({ type: error.status === 403 ? "forbidden" : "invalid_request", message: error.message })
    if (error && MedusaError.isMedusaError(error) && [MedusaError.Types.INVALID_DATA, MedusaError.Types.NOT_ALLOWED, MedusaError.Types.CONFLICT].includes(error.type)) return res.status(error.type === MedusaError.Types.NOT_ALLOWED ? 403 : error.type === MedusaError.Types.CONFLICT ? 409 : 400).json({ type: error.type, message: error.message })
    return res.status(503).json({ type: "unavailable", message: "Checkout completion unavailable" })
  }
}
