import { createHmac } from "crypto"
import { clientAddress, createRateLimiter } from "../rate-limit"

const secret = "unit-test-visitor-key-".repeat(4)
const visitor = "a".repeat(32)
const proof = (id = visitor, time = Math.floor(Date.now() / 1000), method = "POST", path = "/store/carts") => {
  const payload = `v1.${id}.${time}`
  return `${payload}.${createHmac("sha256", secret).update(`cansoria:request\n${payload}\n${method}\n${path}`).digest("hex")}`
}
const request = (header?: string) => ({ method: "POST", originalUrl: "/store/carts", headers: header ? { "x-cansoria-visitor-proof": header } : {}, socket: { remoteAddress: "127.0.0.1" } }) as any
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
const originalEnv = { ...process.env }
beforeEach(() => { process.env.STORE_VISITOR_SECRET = secret; delete process.env.TRUSTED_PROXY_IPS; delete process.env.REDIS_URL })
afterEach(() => { process.env = { ...originalEnv } })

describe("verified storefront visitor budgets", () => {
  it("separates two visitors behind the same BFF and limits the first independently", async () => {
    const limiter = createRateLimiter({ name: `visitors-${Date.now()}`, limit: 30, windowSeconds: 900 })
    const next = jest.fn()
    for (let i = 0; i < 30; i++) await limiter(request(proof()), response(), next)
    const denied = response(); await limiter(request(proof()), denied, next)
    expect(denied.status).toHaveBeenCalledWith(429)
    const other = response(); await limiter(request(proof("b".repeat(32))), other, next)
    expect(other.status).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(31)
  })
  it.each(["forged", proof(visitor, 1), proof(visitor, Math.floor(Date.now() / 1000) + 60), proof(visitor, undefined, "GET"), proof(visitor, undefined, "POST", "/auth/customer/emailpass"), proof().slice(0, -1) + "z"])("rejects invalid, expired, future or replayed proofs: %s", async header => {
    const next = jest.fn(), res = response()
    await createRateLimiter({ name: "invalid-proof", limit: 20, windowSeconds: 60 })(request(header), res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })
  it("does not fall back to a shared peer when the signing configuration is absent", async () => {
    delete process.env.STORE_VISITOR_SECRET
    const next = jest.fn(), res = response()
    await createRateLimiter({ name: "missing-key", limit: 20, windowSeconds: 60 })(request(proof()), res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })
  it("rejects cookie signatures as request proofs and rejects mismatched service keys", async () => {
    const payload = `v1.${visitor}.${Math.floor(Date.now() / 1000)}`
    const cookieMac = createHmac("sha256", secret).update(`cansoria:cookie\n${payload}`).digest("hex")
    const limiter = createRateLimiter({ name: "cookie-domain", limit: 20, windowSeconds: 60 }), next = jest.fn()
    const cookieResponse = response(); await limiter(request(`${payload}.${cookieMac}`), cookieResponse, next)
    expect(cookieResponse.status).toHaveBeenCalledWith(403)
    const header = proof(); process.env.STORE_VISITOR_SECRET = "different-service-key-".repeat(4)
    const mismatch = response(); await limiter(request(header), mismatch, next)
    expect(mismatch.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled()
  })
  it("rejects array-valued and empty request proofs", async () => {
    const limiter = createRateLimiter({ name: "malformed-proof", limit: 20, windowSeconds: 60 })
    for (const header of [[], [proof(), proof()], "", "x".repeat(1000)]) {
      const req = request(); req.headers["x-cansoria-visitor-proof"] = header
      const res = response(); await limiter(req, res, jest.fn()); expect(res.status).toHaveBeenCalledWith(403)
    }
  })
  it("ignores browser IP headers and preserves direct-client IP limiting", () => {
    const req = request(); req.headers["x-real-ip"] = "203.0.113.1"
    expect(clientAddress(req)).toBe("127.0.0.1")
  })
  it("uses canonical trusted IPs ahead of cookies, including mapped IPv4 peers", async () => {
    process.env.TRUSTED_PROXY_IPS = "127.0.0.1"
    const limiter = createRateLimiter({ name: "trusted-peer", limit: 1, windowSeconds: 60 }), next = jest.fn()
    const first = request(proof()); first.socket.remoteAddress = "::ffff:127.0.0.1"; first.headers["x-real-ip"] = "203.0.113.2"
    await limiter(first, response(), next)
    const second = request(proof("b".repeat(32))); second.headers["x-real-ip"] = "203.0.113.2"
    const denied = response(); await limiter(second, denied, next)
    expect(denied.status).toHaveBeenCalledWith(429)
    expect(next).toHaveBeenCalledTimes(1)
  })
  it("keeps an authenticated customer's budget across visitor rotation", async () => {
    const limiter = createRateLimiter({ name: "customer-budget", limit: 1, windowSeconds: 60 }), next = jest.fn()
    const a = request(proof()), b = request(proof("c".repeat(32)))
    a.auth_context = b.auth_context = { actor_id: "cus_test", actor_type: "customer" }
    await limiter(a, response(), next)
    const denied = response(); await limiter(b, denied, next)
    expect(denied.status).toHaveBeenCalledWith(429)
  })
  it("enforces a larger aggregate budget even when every request rotates its visitor", async () => {
    const limiter = createRateLimiter({ name: "aggregate-budget", limit: 1, globalLimit: 3, windowSeconds: 60 }), next = jest.fn()
    for (let i = 1; i <= 3; i++) await limiter(request(proof(String(i).repeat(32))), response(), next)
    const denied = response(); await limiter(request(proof("4".repeat(32))), denied, next)
    expect(denied.status).toHaveBeenCalledWith(429)
    expect(next).toHaveBeenCalledTimes(3)
  })
})
