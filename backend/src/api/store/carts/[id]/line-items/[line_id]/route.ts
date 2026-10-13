import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { deleteLineItemsWorkflowId, updateLineItemInCartWorkflowId } from "@medusajs/medusa/core-flows"
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers"
import { authorizeCart, sensitiveResponse } from "../../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../../lib/cart-fields"

/**
 * Overrides the native item update/delete routes for the same reason as the
 * add-item route: authorization must be re-checked under the cart identity
 * lock right before the write, never only in middleware.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    const result = await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return null
      const lineId = req.params.line_id
      if (typeof lineId === "string" && lineId.length) {
        const item = await req.scope.resolve(Modules.CART).retrieveLineItem(lineId, { select: ["id", "cart_id"] })
        if (item.cart_id !== id) return null
      }
      await req.scope.resolve(Modules.WORKFLOW_ENGINE).run(updateLineItemInCartWorkflowId, {
        input: {
          cart_id: id,
          item_id: req.params.line_id,
          update: req.validatedBody,
          additional_data: (req.validatedBody as Record<string, unknown> | undefined)?.additional_data,
        },
      })
      return refetchCart(id, req.scope, req.queryConfig.fields)
    }, { timeout: 300 })
    if (!result) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
    return res.status(200).json({ cart: result })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Cart update unavailable" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  const lineId = req.params.line_id
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    const cart = await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return null
      if (typeof lineId === "string" && lineId.length) {
        const item = await req.scope.resolve(Modules.CART).retrieveLineItem(lineId, { select: ["id", "cart_id"] })
        if (item.cart_id !== id) return null
      }
      await req.scope.resolve(Modules.WORKFLOW_ENGINE).run(deleteLineItemsWorkflowId, {
        input: { cart_id: id, ids: [lineId] },
      })
      return refetchCart(id, req.scope, req.queryConfig.fields)
    }, { timeout: 300 })
    if (!cart) return res.status(403).json({ type: "forbidden", message: "Cart access denied" })
    return res.status(200).json({ id: lineId, object: "line-item", deleted: true, parent: cart })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Cart update unavailable" })
  }
}
