import { isBoundWelcomePromotion, welcomePromotionGuard } from "../welcome-promotions"
const safe = { rules: [{ attribute: "customer.id", operator: "eq", values: [{ value: "cus_a" }] }, { attribute: "email", operator: "eq", values: [{ value: "owner@example.com" }] }], campaign: { budget: { type: "usage", limit: 1 } } }
describe("welcome coupon entitlement", () => {
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
