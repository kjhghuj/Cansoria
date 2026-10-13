import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { addToCartWorkflowId } from "@medusajs/medusa/core-flows"
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers"
import { authorizeCart, sensitiveResponse } from "../../../../../lib/resource-access"
import { applyCartFields } from "../../../../../lib/cart-fields"

/**
 * Overrides the native POST /store/carts/:id/line-items. Native cart writes
 * were only authorized once in middleware: a guest request that passed the
 * guard could still mutate a cart after an account claimed it. Like the
 * custom update/claim routes, the write executes inside the cart identity
 * lock with authorization re-checked under that lock, so a claim that lands
 * mid-request forces re-authorization instead of racing it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const id = req.params.id
  try {
    const locking = req.scope.resolve(Modules.LOCKING)
    const result = await locking.execute(`cart-identity:${id}`, async () => {
      if (!(await authorizeCart(req, id))) return null
      await req.scope.resolve(Modules.WORKFLOW_ENGINE).run(addToCartWorkflowId, {
        input: {
          cart_id: id,
          items: [req.validatedBody],
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
