import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { transferCartCustomerWorkflowId } from "@medusajs/medusa/core-flows"
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers"
import { authorizeCart, customerActor, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const actor = customerActor(req), id = req.params.id
  if (!actor) return res.status(401).json({ type: "unauthorized", message: "Sign in to claim your cart" })
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    const cart = await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return null
      await req.scope.resolve(Modules.WORKFLOW_ENGINE).run(transferCartCustomerWorkflowId, { input: { id, customer_id: actor, additional_data: (req.validatedBody as any)?.additional_data } })
      return refetchCart(id, req.scope, req.queryConfig.fields)
    }, { timeout: 300 })
    if (!cart) return res.status(403).json({ type: "forbidden", message: "Cart claim denied" })
    return res.status(200).json({ cart })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Cart claim unavailable" })
  }
}
