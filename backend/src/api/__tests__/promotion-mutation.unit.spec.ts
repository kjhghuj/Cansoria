import { POST, DELETE } from "../store/carts/[id]/promotions/route"
const nativePost = jest.fn().mockResolvedValue(undefined), nativeDelete = jest.fn().mockResolvedValue(undefined)
jest.mock("@medusajs/medusa/api/store/carts/[id]/promotions/route", () => ({ POST: (...args) => nativePost(...args), DELETE: (...args) => nativeDelete(...args) }))
const safe = { code: "ART15-SAFE", rules: [{ attribute: "customer.id", operator: "eq", values: [{ value: "cus_a" }] }, { attribute: "email", operator: "eq", values: [{ value: "owner@example.com" }] }], campaign: { budget: { type: "usage", limit: 1, used: 0 } } }
function setup(method = "POST") {
  const cart = { id: "cart_a", customer_id: "cus_a", customer: { has_account: true }, email: "owner@example.com", promotions: [] }
  const locking = { execute: jest.fn(async (_key, job) => await job()) }
  const req = { method, params: { id: "cart_a" }, originalUrl: "/store/carts/cart_a/promotions", headers: {}, body: { promo_codes: ["ART15-SAFE"] }, auth_context: { actor_id: "cus_a" }, scope: { resolve: key => ({ locking, query: { graph: async () => ({ data: [cart] }) }, promotion: { listPromotions: async () => [safe] } }[key]) } } as any
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
  return { req, res, cart, locking }
}
describe("promotion mutation serialization", () => {
  beforeEach(() => jest.clearAllMocks())
  it("awaits native promotion application under the same identity lock as completion", async () => {
    const { req, res, locking } = setup()
    await POST(req, res)
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(nativePost).toHaveBeenCalledTimes(1)
  })
  it("rechecks ownership inside the shared lock and rejects a stale owner", async () => {
    const { req, res, cart } = setup(); cart.customer_id = "cus_other"
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(nativePost).not.toHaveBeenCalled()
  })
  it("rejects legacy codes again inside the lock", async () => {
    const { req, res } = setup(); req.body.promo_codes = ["ART15-LEGACY"]
    await POST(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(nativePost).not.toHaveBeenCalled()
  })
  it("serializes deletion while allowing obsolete-code removal", async () => {
    const { req, res, locking } = setup("DELETE"); req.body.promo_codes = ["ART15-LEGACY"]
    await DELETE(req, res)
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(nativeDelete).toHaveBeenCalledTimes(1)
  })
})
