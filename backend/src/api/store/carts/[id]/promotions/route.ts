import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { POST as nativePost, DELETE as nativeDelete } from "@medusajs/medusa/api/store/carts/[id]/promotions/route"
import { authorizeCart, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"
import { welcomePromotionGuard } from "../../../../../lib/welcome-promotions"

async function mutate(req: MedusaRequest, res: MedusaResponse, removing: boolean) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  try {
    return await req.scope.resolve(Modules.LOCKING).execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
      if (!removing) {
        let eligible = false
        await welcomePromotionGuard(req, res, () => { eligible = true })
        if (!eligible) return
      }
      // Prevent a coupon from entering/leaving a cart between completion's entitlement read and workflow use.
      return await (removing ? nativeDelete : nativePost)(req as any, res)
    }, { timeout: 300 })
  } catch {
    if (!res.headersSent && !res.destroyed) return res.status(503).json({ type: "unavailable", message: "Promotion update unavailable" })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) { return mutate(req, res, false) }
export async function DELETE(req: MedusaRequest, res: MedusaResponse) { return mutate(req, res, true) }
