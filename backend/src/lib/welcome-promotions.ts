import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { customerActor } from "./resource-access"

export type CheckoutCart = {
  id: string
  email?: string | null
  customer_id?: string | null
  completed_at?: Date | string | null
  promotions?: ({ code?: string } | null)[] | null
  payment_collection?: { payment_sessions?: ({ provider_id?: string } | null)[] | null } | null
}

export function normalizeWelcomeEmail(email: unknown): string | undefined {
  if (typeof email !== "string") return undefined
  const normalized = email.trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : undefined
}

export const WELCOME_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000
type WelcomeCustomer = { id?: string; email?: string | null; has_account?: boolean; created_at?: Date | string | null }
/** Store customer write validators do not accept created_at; metadata is deliberately ignored. */
export function welcomeCustomerExpiry(customer: WelcomeCustomer, now = Date.now()): Date | undefined {
  const created = customer.created_at ? new Date(customer.created_at).getTime() : NaN
  if (customer.has_account !== true || !customer.id || !normalizeWelcomeEmail(customer.email) || !Number.isFinite(created) || created > now || now >= created + WELCOME_VALIDITY_MS) return undefined
  return new Date(created + WELCOME_VALIDITY_MS)
}

export function welcomePromotionEligible(promotion: any, customer: WelcomeCustomer, cartEmail: unknown, now = Date.now()): boolean {
  const email = normalizeWelcomeEmail(customer.email), starts = promotion?.campaign?.starts_at
  return Boolean(welcomeCustomerExpiry(customer, now) && email && email === normalizeWelcomeEmail(cartEmail) && isBoundWelcomePromotion(promotion, customer.id!, email) && promotion.status === "active" && promotion.campaign && promotion.campaign.ends_at == null && (starts == null || Number.isFinite(new Date(starts).getTime()) && new Date(starts).getTime() <= now) && Number.isFinite(Number(promotion.campaign.budget?.used)) && Number(promotion.campaign.budget.used) >= 0 && Number(promotion.campaign.budget.used) < 1)
}

export function isBoundWelcomePromotion(promotion: any, customerId: string, email: string): boolean {
  const matches = (attribute: string, value: string) => promotion?.rules?.some((rule: any) => rule.attribute === attribute && rule.operator === "eq" && rule.values?.length === 1 && (rule.values[0]?.value ?? rule.values[0]) === value)
  return Boolean(matches("customer.id", customerId) && matches("email", email.trim().toLowerCase()) && promotion?.campaign?.budget?.type === "usage" && Number(promotion.campaign.budget.limit) === 1)
}

/** Old anonymous ART15 promotions remain in deployed databases; reject them at application/checkout too. */
export async function welcomePromotionGuard(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (req.method !== "POST") return next()
  // Completion verifies and locks inside its awaited route handler, independent of response lifetime.
  if (/\/complete\/?$/i.test(req.originalUrl?.split("?")[0] || req.path || "")) return next()
  const id = (req.originalUrl?.split("?")[0] || req.path || "").match(/^\/store\/carts\/([^/]+)/i)?.[1] || req.params.id
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "cart", fields: ["id", "email", "customer_id", "customer.id", "customer.email", "customer.has_account", "customer.created_at", "promotions.code"], filters: { id } })
    const cart = data?.[0] as unknown as CheckoutCart | undefined
    const input = (req.body as any)?.promo_codes
    const codes = [...(Array.isArray(input) ? input : []), ...(cart?.promotions || []).map(p => p?.code)].filter((code: unknown) => typeof code === "string" && /^ART15-/i.test(code as string))
    if (!codes.length) return next()
    const actor = customerActor(req)
    if (!actor || actor !== cart?.customer_id || !cart.email) return res.status(403).json({ type: "forbidden", message: "Welcome code requires its eligible account" })
    if (!(await eligibleWelcomeCodes(req, codes, actor, cart.email, data[0]?.customer ?? undefined))) return res.status(403).json({ type: "forbidden", message: "Welcome code is not eligible for this account. Older codes may require support." })
    return next()
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Promotion validation unavailable" })
  }
}

export async function eligibleWelcomeCodes(req: MedusaRequest, codes: string[], actor: string, email: string, snapshotCustomer?: WelcomeCustomer): Promise<boolean> {
  const customer = snapshotCustomer || await req.scope.resolve(Modules.CUSTOMER).retrieveCustomer(actor)
  if (customer?.id !== actor) return false
  const promotions = req.scope.resolve(Modules.PROMOTION)
  const matching = await promotions.listPromotions({ code: codes }, { relations: ["rules", "rules.values", "campaign.budget"] })
  return codes.every(code => {
    const promotion = matching.find(p => p.code === code)
    return welcomePromotionEligible(promotion, customer, email)
  })
}
