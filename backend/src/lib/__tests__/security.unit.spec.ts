import { issueAccessToken, verifyAccessToken, storefrontUrl } from "../access-tokens"
import { authorizeCart, cartAccessGuard, paymentAccessGuard, disableOrderTransfer } from "../resource-access"
import { createRateLimiter, clientAddress } from "../rate-limit"

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
const request = (cart: any = { id: "cart_a", customer_id: null }) => ({
  params: { id: "cart_a" }, headers: {}, method: "GET", path: "/store/carts/cart_a", body: {},
  scope: { resolve: () => ({ graph: jest.fn().mockResolvedValue({ data: cart ? [cart] : [] }) }) },
}) as any

describe("resource capability tokens", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters" })
  it("binds a capability to purpose, object and expiration", () => {
    const token = issueAccessToken("cart", "cart_a", 60, 100)
    expect(verifyAccessToken(token, "cart", "cart_a", 101)).toBe(true)
    expect(verifyAccessToken(token, "order", "cart_a", 101)).toBe(false)
    expect(verifyAccessToken(token, "cart", "cart_b", 101)).toBe(false)
    expect(verifyAccessToken(token, "cart", "cart_a", 160)).toBe(false)
  })
  it.each(["", "bad", "a.b.c", null, undefined, ["a.b"]])("rejects malformed capability %p", (token) => {
    expect(verifyAccessToken(token as any, "cart", "cart_a")).toBe(false)
  })
  it("rejects a changed signature and changed secret", () => {
    const token = issueAccessToken("order", "order_a")
    expect(verifyAccessToken(`${token.slice(0, -3)}xxx`, "order", "order_a")).toBe(false)
    process.env.JWT_SECRET = "changed-secret-with-more-than-thirty-two-characters"
    expect(verifyAccessToken(token, "order", "order_a")).toBe(false)
  })
  it("rejects default and short production secrets", () => {
    const env = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    process.env.JWT_SECRET = "supersecret"
    expect(() => issueAccessToken("cart", "cart_a")).toThrow()
    process.env.NODE_ENV = env
  })
  it.each([["cart", "bad", 60], ["cart", "order_a", 60], ["cart", "cart_a", 0], ["order", "order_a", 604801]])("rejects invalid issued token arguments %p/%p/%p", (purpose, id, ttl) => {
    expect(() => issueAccessToken(purpose as any, id as string, ttl as number)).toThrow()
  })
  it("does not accept a capability issued far beyond the supported maximum window", () => {
    const token = issueAccessToken("cart", "cart_a", 604800, 1000)
    expect(verifyAccessToken(token, "cart", "cart_a", 0)).toBe(false)
    expect(verifyAccessToken(token, "cart", "bad", 1000)).toBe(false)
    expect(verifyAccessToken("a".repeat(1025), "cart", "cart_a")).toBe(false)
  })
})

describe("production storefront URL", () => {
  const saved = { env: process.env.NODE_ENV, url: process.env.STOREFRONT_URL, fallback: process.env.FRONTEND_URL }
  beforeEach(() => { process.env.NODE_ENV = "production"; delete process.env.STOREFRONT_URL; delete process.env.FRONTEND_URL })
  afterEach(() => { for (const [key, value] of Object.entries({ NODE_ENV: saved.env, STOREFRONT_URL: saved.url, FRONTEND_URL: saved.fallback })) if (value === undefined) delete process.env[key]; else process.env[key] = value })
  it.each([undefined, "invalid", "http://cansoria.test", "https://user:password@cansoria.test"])("rejects missing or unsafe storefront URL %p", value => {
    if (value) process.env.STOREFRONT_URL = value
    expect(() => storefrontUrl()).toThrow()
  })
  it("accepts HTTPS and the configured frontend fallback", () => {
    process.env.FRONTEND_URL = "https://cansoria.test/"
    expect(storefrontUrl()).toBe("https://cansoria.test")
  })
})

describe("cart and payment authorization", () => {
  beforeEach(() => { process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters" })
  it("denies guest cart ID without capability and accepts its own capability", async () => {
    const req = request()
    expect(await authorizeCart(req, "cart_a")).toBe(false)
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    expect(await authorizeCart(req, "cart_a")).toBe(true)
  })
  it("rejects other owners even with a guest capability", async () => {
    const req = request({ id: "cart_a", customer_id: "customer_victim" })
    req.auth_context = { actor_id: "customer_attacker" }
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    expect(await authorizeCart(req, "cart_a")).toBe(false)
    req.auth_context.actor_id = "customer_victim"
    expect(await authorizeCart(req, "cart_a")).toBe(true)
  })
  it("customer claim requires both login and guest capability", async () => {
    const req = request()
    req.path += "/customer"; req.method = "POST"
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    const res = response(), next = jest.fn()
    await cartAccessGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    req.auth_context = { actor_id: "customer_a" }
    await cartAccessGuard(req, response(), next)
    expect(next).toHaveBeenCalledTimes(1)
  })
  it("payment collection creation cannot bypass cart authorization", async () => {
    const req = request(); req.body = { cart_id: "cart_a" }; req.params = {}
    const res = response(), next = jest.fn()
    await paymentAccessGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it("rejects unlinked payment collections", async () => {
    const req = request(null)
    req.params.id = "paycol_a"; req.path = "/store/payment-collections/paycol_a/payment-sessions"
    const res = response(), next = jest.fn()
    await paymentAccessGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
  })
  it("recognizes Medusa guest customer records without treating guest ID as a registered owner", async () => {
    const req = request({ id: "cart_a", customer_id: "cus_guest", customer: { has_account: false } })
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    expect(await authorizeCart(req, "cart_a")).toBe(true)
    expect(await authorizeCart(req, "bad")).toBe(false)
    expect(await authorizeCart(request(null), "cart_a")).toBe(false)
  })
  it("denies access when account state cannot be resolved", async () => {
    const req = request({ id: "cart_a", customer_id: "cus_unknown" })
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    expect(await authorizeCart(req, "cart_a")).toBe(false)
  })
  it("rejects a different cart's line-item ID before native DELETE can remove it", async () => {
    const req = request(); req.method = "DELETE"; req.originalUrl = "/store/carts/cart_a/line-items/item_victim"
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    req.scope.resolve = key => key === "cart" ? { retrieveLineItem: async () => ({ id: "item_victim", cart_id: "cart_victim" }) } : { graph: async () => ({ data: [{ id: "cart_a", customer_id: null }] }) }
    const res = response(), next = jest.fn()
    await cartAccessGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it("denies cart and payment access on query errors", async () => {
    const req = request(); req.scope.resolve = () => { throw Error("down") }
    const cartRes = response(), paymentRes = response(), next = jest.fn()
    await cartAccessGuard(req, cartRes, next)
    req.body = { cart_id: "cart_a" }
    await paymentAccessGuard(req, paymentRes, next)
    expect(cartRes.status).toHaveBeenCalledWith(503)
    expect(paymentRes.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })
  it("authorizes a payment collection through its linked cart", async () => {
    const graph = jest.fn().mockResolvedValueOnce({ data: [{ cart_id: "cart_a" }] }).mockResolvedValueOnce({ data: [{ id: "cart_a", customer_id: null }] })
    const req = request(); req.params.id = "paycol_a"; req.path = "/store/payment-collections/paycol_a/payment-sessions"; req.scope.resolve = () => ({ graph })
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    const res = response(), next = jest.fn()
    await paymentAccessGuard(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
  it.each(["pp_system_default", "pp_manual_fake", undefined])("rejects unauthorized payment providers %p even with cart ownership", async provider_id => {
    const req = request(); req.method = "POST"; req.path = "/store/payment-collections/paycol_a/payment-sessions"; req.body = { provider_id }
    req.headers["x-cart-access-token"] = issueAccessToken("cart", "cart_a")
    const res = response(), next = jest.fn()
    await paymentAccessGuard(req, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it("blocks the core order transfer request, accept, decline and cancel routes", () => {
    for (const action of ["request", "accept", "decline", "cancel"]) {
      const res = response()
      disableOrderTransfer({ path: `/store/orders/order_a/transfer/${action}` } as any, res)
      expect(res.status).toHaveBeenCalledWith(410)
    }
  })
})

describe("shared rate limit", () => {
  it("ignores forged forwarded IPs by default", () => {
    expect(clientAddress({ headers: { "x-forwarded-for": "1.2.3.4" }, socket: { remoteAddress: "127.0.0.1" } } as any)).toBe("127.0.0.1")
  })
  it("enforces a window independently by client and emits retry-after", async () => {
    const middleware = createRateLimiter({ name: "test", limit: 1, windowSeconds: 60, consume: async () => 2 })
    const res = response(), next = jest.fn()
    await middleware({ socket: { remoteAddress: "127.0.0.1" }, headers: {} } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "60")
    expect(next).not.toHaveBeenCalled()
  })
  it("fails closed when the shared store fails", async () => {
    const middleware = createRateLimiter({ name: "test", limit: 1, windowSeconds: 60, consume: async () => { throw Error("down") } })
    const res = response(), next = jest.fn()
    await middleware({ socket: { remoteAddress: "127.0.0.1" }, headers: {} } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })
  it("only accepts a single valid address from an explicitly trusted direct proxy", () => {
    process.env.TRUSTED_PROXY_IPS = "127.0.0.1"
    const req = { headers: { "x-real-ip": "2001:db8::1" }, socket: { remoteAddress: "127.0.0.1" } } as any
    expect(clientAddress(req)).toBe("2001:db8::1")
    req.headers["x-real-ip"] = "1.2.3.4,5.6.7.8"
    expect(clientAddress(req)).toBe("127.0.0.1")
    delete process.env.TRUSTED_PROXY_IPS
    expect(clientAddress({ headers: {} } as any)).toBe("unknown")
  })
  it("counts concurrent requests atomically within the local development fallback", async () => {
    const redisUrl = process.env.REDIS_URL; delete process.env.REDIS_URL
    const middleware = createRateLimiter({ name: `concurrent-${Date.now()}`, limit: 3, windowSeconds: 60 })
    const req = { headers: {}, socket: { remoteAddress: "127.0.0.2" } } as any
    const next = jest.fn(), responses = Array.from({ length: 8 }, response)
    await Promise.all(responses.map(res => middleware(req, res, next)))
    expect(next).toHaveBeenCalledTimes(3)
    expect(responses.filter(res => res.status.mock.calls[0]?.[0] === 429)).toHaveLength(5)
    if (redisUrl) process.env.REDIS_URL = redisUrl
  })
  it("does not fall back to process memory in production", async () => {
    const env = process.env.NODE_ENV, redisUrl = process.env.REDIS_URL
    process.env.NODE_ENV = "production"; delete process.env.REDIS_URL
    const res = response(), next = jest.fn()
    await createRateLimiter({ name: "production", limit: 5, windowSeconds: 60, global: true })({ headers: {} } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
    process.env.NODE_ENV = env; if (redisUrl) process.env.REDIS_URL = redisUrl
  })
})
