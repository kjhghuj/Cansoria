import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers"
import { issueAccessToken } from "../../../lib/access-tokens"
import { sensitiveResponse, customerActor } from "../../../lib/resource-access"
import { guestCustomer } from "../../../lib/guest-customer"
import { applyCartFields, safeCartInput } from "../../../lib/cart-fields"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  sensitiveResponse(res)
  applyCartFields(req)
  const input = safeCartInput(req.validatedBody)
  if (!input) return res.status(400).json({ type: "invalid_request", message: "Provide address details rather than address references" })
  if (Array.isArray(input.promo_codes) && input.promo_codes.some((code: unknown) => typeof code === "string" && /^ART15-/i.test(code))) return res.status(400).json({ type: "invalid_request", message: "Apply welcome codes after creating your cart" })
  const customerId = customerActor(req) || await guestCustomer(req, input.email)
  const { result } = await createCartWorkflow(req.scope).run({ input: { ...input, customer_id: customerId } })
  const cart = await refetchCart(result.id, req.scope, req.queryConfig.fields)
  return res.status(200).json({ cart, cart_access_token: issueAccessToken("cart", result.id) })
}
