import handler from "../../subscribers/customer-created"
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
function setup(customer: any) {
  const customers = { retrieveCustomer: jest.fn().mockResolvedValue(customer), updateCustomers: jest.fn().mockResolvedValue({}) }
  const promotions = { listPromotions: jest.fn().mockResolvedValue([]), listCampaigns: jest.fn().mockResolvedValue([]), createCampaigns: jest.fn().mockResolvedValue({ id: "camp_a" }), createPromotions: jest.fn().mockResolvedValue({ id: "promo_a" }) }
  const notification = { createNotifications: jest.fn().mockResolvedValue({}) }
  const locking = { execute: jest.fn(async (_key, fn) => fn()) }
  const args = { event: { data: { id: "cus_a" } }, container: { resolve: jest.fn(key => ({ logger, customer: customers, promotion: promotions, notification, locking }[key])) } } as any
  return { customers, promotions, notification, locking, args }
}
describe("welcome coupon eligibility and idempotency", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters" })
  it("never mints coupons for checkout guest customer records", async () => {
    const { args, promotions, notification } = setup({ id: "cus_a", email: "guest@example.com", has_account: false })
    await handler(args)
    expect(promotions.createPromotions).not.toHaveBeenCalled()
    expect(notification.createNotifications).not.toHaveBeenCalled()
  })
  it("binds a registered customer's welcome promotion to customer and email with a single-use campaign budget", async () => {
    const { args, promotions, locking } = setup({ id: "cus_a", email: "owner@example.com", has_account: true })
    await handler(args)
    expect(locking.execute).toHaveBeenCalled()
    expect(promotions.createCampaigns).toHaveBeenCalledWith(expect.objectContaining({ budget: { type: "usage", limit: 1 } }))
    expect(promotions.createPromotions).toHaveBeenCalledWith(expect.objectContaining({ rules: expect.arrayContaining([
      { attribute: "customer.id", operator: "eq", values: ["cus_a"] }, { attribute: "email", operator: "eq", values: ["owner@example.com"] },
    ]) }))
  })
  it("does not create or send another welcome promotion when metadata records completion", async () => {
    const { args, promotions, notification } = setup({ id: "cus_a", email: "owner@example.com", has_account: true, metadata: { welcome_discount_code: "ART15-SAFE", welcome_email_sent: true } })
    await handler(args)
    expect(promotions.createPromotions).not.toHaveBeenCalled()
    expect(notification.createNotifications).not.toHaveBeenCalled()
  })
})
