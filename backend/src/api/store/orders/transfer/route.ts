import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { verifyAccessToken } from "../../../../lib/access-tokens"
import { registeredOwner, sensitiveResponse, customerActor } from "../../../../lib/resource-access"

export async function POST(req: MedusaRequest<{ order_id?: unknown }>, res: MedusaResponse) {
  sensitiveResponse(res)
  const actor = customerActor(req)
  if (!actor) return res.status(401).json({ type: "unauthorized", message: "Sign in to claim an order" })
  const id = req.body?.order_id
  if (typeof id !== "string" || !verifyAccessToken(req.headers["x-order-access-token"], "order", id)) return res.status(403).json({ type: "forbidden", message: "Order claim denied" })
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    const result = await locking.execute(`order-claim:${id}`, async () => {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "order", fields: ["id", "customer_id", "customer.has_account"], filters: { id, is_draft_order: false } as any })
      const order = data?.[0]
      if (!order || (registeredOwner(order) && order.customer_id !== actor)) return false
      if (order.customer_id !== actor) {
        const orders = req.scope.resolve(Modules.ORDER)
        await orders.updateOrders(id, { customer_id: actor })
      }
      return true
    }, { timeout: 10 })
    if (!result) return res.status(403).json({ type: "forbidden", message: "Order claim denied" })
    return res.status(200).json({ success: true, order_id: id })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Order claim unavailable" })
  }
}
