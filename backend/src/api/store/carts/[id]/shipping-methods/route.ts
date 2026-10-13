import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { POST as nativePost } from "@medusajs/medusa/api/store/carts/[id]/shipping-methods/route"
import { authorizeCart, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  try {
    // The entry guard alone races a concurrent cart claim: a guest request
    // that passed it may still mutate a freshly claimed cart and read the
    // owner's details from the native refetch. Serialize against claims and
    // re-authorize inside the same identity lock every other write uses.
    return await req.scope.resolve(Modules.LOCKING).execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      return await nativePost(req as Parameters<typeof nativePost>[0], res)
    }, { timeout: 300 })
  } catch {
    if (!res.headersSent && !res.destroyed) return res.status(503).json({ type: "unavailable", message: "Shipping method update unavailable" })
  }
}
