import { isBoundWelcomePromotion, welcomePromotionGuard, welcomeCustomerExpiry, welcomePromotionEligible, WELCOME_VALIDITY_MS } from "../welcome-promotions"
import { StoreCreateCustomer, StoreUpdateCustomer } from "@medusajs/medusa/api/store/customers/validators"
const safe = { rules: [{ attribute: "customer.id", operator: "eq", values: [{ value: "cus_a" }] }, { attribute: "email", operator: "eq", values: [{ value: "owner@example.com" }] }], campaign: { budget: { type: "usage", limit: 1 } } }
describe("welcome coupon entitlement", () => {
  it("uses server customer creation time, never mutable metadata, for the 30-day window", () => {
    const now = Date.now(), customer = { id: "cus_a", email: "owner@example.com", has_account: true, created_at: new Date(now - 1000) }
    expect(welcomeCustomerExpiry(customer, now)?.getTime()).toBe(now - 1000 + WELCOME_VALIDITY_MS)
    expect(welcomeCustomerExpiry({ ...customer, created_at: new Date(now - WELCOME_VALIDITY_MS) }, now)).toBeUndefined()
    expect(welcomeCustomerExpiry({ ...customer, created_at: new Date(now + 1) }, now)).toBeUndefined()
    expect(welcomeCustomerExpiry({ ...customer, created_at: undefined }, now)).toBeUndefined()
    expect(welcomePromotionEligible({ ...safe, status: "active", campaign: { ...safe.campaign, budget: { type: "usage", limit: 1, used: 0 } } }, customer, " OWNER@example.com ", now)).toBe(true)
    expect(welcomePromotionEligible({ ...safe, status: "active", campaign: { ...safe.campaign, ends_at: new Date(now + 100000), budget: { type: "usage", limit: 1, used: 0 } } }, customer, customer.email, now)).toBe(false)
  })
  it("installed Store customer create/update validators never forward a forged created_at", () => {
    for (const validator of [StoreCreateCustomer, StoreUpdateCustomer]) expect(validator.parse({ created_at: "2099-01-01", metadata: { welcome_discount_valid_until: "2099-01-01" } })).not.toHaveProperty("created_at")
  })
  it("requires both account and email rules and a one-use budget", () => {
    expect(isBoundWelcomePromotion(safe, "cus_a", "owner@example.com")).toBe(true)
    expect(isBoundWelcomePromotion(safe, "cus_other", "owner@example.com")).toBe(false)
    expect(isBoundWelcomePromotion({ ...safe, rules: [] }, "cus_a", "owner@example.com")).toBe(false)
    expect(isBoundWelcomePromotion({ ...safe, campaign: { budget: { type: "usage", limit: 100 } } }, "cus_a", "owner@example.com")).toBe(false)
    expect(isBoundWelcomePromotion({ ...safe, rules: safe.rules.slice(0, 1) }, "cus_a", "owner@example.com")).toBe(false)
  })
  it("denies anonymous application of a legacy anonymous ART15 coupon", async () => {
    const req = { originalUrl: "/store/carts/cart_a/promotions", method: "POST", headers: {}, body: {}, scope: { resolve: () => ({ graph: async () => ({ data: [{ id: "cart_a", promotions: [{ code: "ART15-LEGACY" }] }] }) }) } } as any
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any, next = jest.fn()
    await welcomePromotionGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it("does not block removal of obsolete coupons", async () => {
    const next = jest.fn()
    await welcomePromotionGuard({ originalUrl: "/store/carts/cart_a/promotions", method: "DELETE" } as any, {} as any, next)
    expect(next).toHaveBeenCalled()
  })
  it("leaves complete serialization to the awaited route handler", async () => {
    const next = jest.fn()
    await welcomePromotionGuard({ originalUrl: "/store/carts/cart_a/complete", method: "POST" } as any, {} as any, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
