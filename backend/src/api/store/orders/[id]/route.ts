import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { verifyAccessToken } from "../../../../lib/access-tokens"
import { sensitiveResponse, customerActor } from "../../../../lib/resource-access"

const publicFields = ["id", "display_id", "email", "status", "created_at", "total", "subtotal", "shipping_total", "currency_code", "items.id", "items.title", "items.quantity", "items.unit_price", "items.total", "items.variant_id", "items.product_id", "items.thumbnail", "items.variant_title", "items.product_title"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  const id = req.params.id
  const tokenValid = verifyAccessToken(req.headers["x-order-access-token"], "order", id)
  const actor = customerActor(req)
  if (!tokenValid && !actor) return res.status(403).json({ type: "forbidden", message: "Order access denied" })
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "order", fields: ["id", "customer_id"], filters: { id, is_draft_order: false } as any })
    const order = data?.[0]
    if (!order || (!tokenValid && order.customer_id !== actor)) return res.status(403).json({ type: "forbidden", message: "Order access denied" })
    const { data: details } = await query.graph({ entity: "order", fields: publicFields, filters: { id, is_draft_order: false } as any })
    const detail = details?.[0]
    if (!detail) return res.status(403).json({ type: "forbidden", message: "Order access denied" })
    const result: Record<string, unknown> = {}
    for (const field of publicFields.filter(x => !x.includes("."))) if (field in detail) result[field] = detail[field]
    result.items = (detail.items || []).map((item: any) => {
      const output: Record<string, unknown> = {}
      for (const field of publicFields.filter(x => x.startsWith("items.")).map(x => x.slice(6))) if (field in item) output[field] = item[field]
      return output
    })
    return res.status(200).json({ order: result })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Order access unavailable" })
  }
}
