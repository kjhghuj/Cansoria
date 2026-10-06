import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { subscribeToNewsletter } from "../../../lib/klaviyo"
import { verifyTurnstileToken } from "../../../lib/turnstile"
import { customerActor } from "../../../lib/resource-access"
import { isBoundWelcomePromotion } from "../../../lib/welcome-promotions"

export async function POST(req: MedusaRequest<{ email?: unknown; turnstile_token?: unknown }>, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const { email, turnstile_token } = req.body || {}
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ type: "invalid_request", message: "A valid email is required" })
  if (typeof turnstile_token !== "string" || !turnstile_token || turnstile_token.length > 2048 || !(await verifyTurnstileToken(turnstile_token))) return res.status(400).json({ type: "invalid_request", message: "Invalid Turnstile token" })
  const normalizedEmail = email.trim().toLowerCase()
  try {
    let discountCode: string | undefined, validUntil: string | undefined
    if (customerActor(req)) {
      const customers = req.scope.resolve(Modules.CUSTOMER)
      const customer = await customers.retrieveCustomer(customerActor(req)! )
      if (customer?.email?.trim().toLowerCase() !== normalizedEmail) return res.status(403).json({ type: "forbidden", message: "Use your account email" })
      if (typeof customer.metadata?.welcome_discount_code === "string" && typeof customer.metadata?.welcome_discount_valid_until === "string" && Date.parse(customer.metadata.welcome_discount_valid_until) > Date.now()) {
        const promotions = req.scope.resolve(Modules.PROMOTION)
        const [promotion] = await promotions.listPromotions({ code: customer.metadata.welcome_discount_code }, { relations: ["rules", "rules.values", "campaign.budget"] })
        if (isBoundWelcomePromotion(promotion, customer.id, normalizedEmail)) {
          discountCode = customer.metadata.welcome_discount_code
          validUntil = customer.metadata.welcome_discount_valid_until
        }
      }
    }
    // Anonymous subscription requires the configured Klaviyo list to use double opt-in. It never mints a promotion.
    await subscribeToNewsletter(normalizedEmail, { source: "cansoria-storefront" })
    return res.status(200).json({ message: "Please check your email to confirm your subscription.", klaviyo_subscribed: true, ...(discountCode ? { discount_code: discountCode, valid_until: validUntil } : {}) })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Subscription is unavailable. Please try again later." })
  }
}
