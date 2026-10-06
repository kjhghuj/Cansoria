import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { orderAccessUrl } from "../../../../lib/access-tokens"
import { sensitiveResponse } from "../../../../lib/resource-access"

export async function POST(req: MedusaRequest<{ order_id?: unknown; email?: unknown }>, res: MedusaResponse) {
  sensitiveResponse(res)
  // Respond before lookup or email; failures and mismatches never reveal existence or timing.
  res.status(202).json({ message: "If the details match, an order access link will be emailed." })
  const { order_id, email } = req.body || {}
  if (typeof order_id !== "string" || !/^order_[a-zA-Z0-9_-]{1,128}$/.test(order_id) || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", fields: ["id", "email"], filters: { id: order_id, is_draft_order: false } as any })
    const order = data?.[0]
    if (!order?.email || order.email.trim().toLowerCase() !== email.trim().toLowerCase()) return
    const notifications = req.scope.resolve(Modules.NOTIFICATION)
    await notifications.createNotifications({ to: order.email, channel: "email", template: "order_access", data: { access_url: orderAccessUrl(order.id) } })
  } catch {
    console.warn("[OrderAccess] Access notification could not be processed")
  }
}
