import { POST as shippingMethodsPost } from "../store/carts/[id]/shipping-methods/route"
import { POST as taxesPost } from "../store/carts/[id]/taxes/route"
import { issueAccessToken } from "../../lib/access-tokens"

const nativeShippingMethods = jest.fn().mockResolvedValue(undefined)
const nativeTaxes = jest.fn().mockResolvedValue(undefined)
jest.mock("@medusajs/medusa/api/store/carts/[id]/shipping-methods/route", () => ({ POST: (...args) => nativeShippingMethods(...args) }))
jest.mock("@medusajs/medusa/api/store/carts/[id]/taxes/route", () => ({ POST: (...args) => nativeTaxes(...args) }))

function setup(claim: (cart: Record<string, unknown>) => void) {
  const cart: Record<string, unknown> = { id: "cart_a", customer_id: null, customer: null }
  const locking = { execute: jest.fn(async (_key: string, job: () => Promise<unknown>) => await job()) }
  const req = {
    method: "POST", params: { id: "cart_a" }, originalUrl: "/store/carts/cart_a/shipping-methods",
    headers: { "x-cart-access-token": issueAccessToken("cart", "cart_a") }, body: { option_id: "opt_a" },
    scope: { resolve: (key: string) => ({ locking, query: { graph: async () => ({ data: [cart] }) } }[key]) },
  } as any
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() } as any
  return { req, res, cart, locking, claim: () => claim(cart) }
}

describe("shipping-method and tax writes share the cart identity lock", () => {
  beforeEach(() => jest.clearAllMocks())
  it.each([
    ["shipping-methods", shippingMethodsPost, nativeShippingMethods],
    ["taxes", taxesPost, nativeTaxes],
  ] as const)("%s re-authorizes inside the lock and awaits the native handler", async (_label, handler, native) => {
    // The guest request passed the entry guard, then the cart was claimed
    // before the write began: the stale guest context must be rejected.
    const { req, res, locking, claim } = setup((cart) => {
      cart.customer_id = "cus_new_owner"
      cart.customer = { has_account: true }
    })
    locking.execute.mockImplementation(async (_key: string, job: () => Promise<unknown>) => {
      claim()
      return await job()
    })
    await handler(req, res)
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(res.status).toHaveBeenCalledWith(403)
    expect(native).not.toHaveBeenCalled()
  })
  it.each([
    ["shipping-methods", shippingMethodsPost, nativeShippingMethods],
    ["taxes", taxesPost, nativeTaxes],
  ] as const)("%s still forwards an authorized guest write", async (_label, handler, native) => {
    const { req, res, locking } = setup(() => {})
    await handler(req, res)
    expect(locking.execute).toHaveBeenCalledWith("cart-identity:cart_a", expect.any(Function), expect.any(Object))
    expect(native).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalledWith(403)
  })
  it.each([
    ["shipping-methods", shippingMethodsPost],
    ["taxes", taxesPost],
  ] as const)("%s fails closed when the lock backend is unavailable", async (_label, handler) => {
    const { req, res, locking } = setup(() => {})
    locking.execute.mockRejectedValue(new Error("lock down"))
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(503)
  })
})
