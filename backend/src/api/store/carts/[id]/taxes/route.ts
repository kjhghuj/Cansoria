import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { POST as nativePost } from "@medusajs/medusa/api/store/carts/[id]/taxes/route"
import { authorizeCart, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  try {
    // Same boundary as the other cart writes: authorization is re-checked
    // inside the identity lock so a guest request cannot recalculate a cart's
    // tax lines or read the refetched cart after a concurrent claim.
    return await req.scope.resolve(Modules.LOCKING).execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      return await nativePost(req as Parameters<typeof nativePost>[0], res)
    }, { timeout: 300 })
  } catch {
    if (!res.headersSent && !res.destroyed) return res.status(503).json({ type: "unavailable", message: "Tax recalculation unavailable" })
  }
}
