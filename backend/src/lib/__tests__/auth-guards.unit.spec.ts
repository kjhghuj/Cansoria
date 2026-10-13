import { enforcePasswordPolicy, serializePasswordReset, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../auth-guards"

const response = () => {
  const listeners: Record<string, Array<() => void>> = {}
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    headersSent: false,
    on: jest.fn((event: string, cb: () => void) => { (listeners[event] ||= []).push(cb) }),
    emit: (event: string) => (listeners[event] || []).forEach(cb => cb()),
  } as any
}

describe("password policy at authoritative backend entries", () => {
  it.each(["x", "", 7, undefined, null, 12345678, "a".repeat(PASSWORD_MAX_LENGTH + 1)])("rejects password %p", (password) => {
    const req = { body: typeof password === "number" && password > 1000 ? { password } : { password } } as any
    const res = response(), next = jest.fn()
    enforcePasswordPolicy({ body: { password } } as any, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })
  it.each(["longenough", "a".repeat(PASSWORD_MAX_LENGTH)])("accepts password of supported shape %p", (password) => {
    const res = response(), next = jest.fn()
    enforcePasswordPolicy({ body: { password } } as any, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
  it("skips judgement when the body has not been parsed yet", () => {
    const res = response(), next = jest.fn()
    enforcePasswordPolicy({ body: undefined } as any, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
  it("requires at least eight characters by policy", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })
})

describe("serialized password reset consumption", () => {
  const lockingThat = (impl: (key: string, fn: () => Promise<unknown>) => Promise<unknown>) => ({ execute: jest.fn(impl) })
  const make = (authorization: string) => ({ headers: { authorization }, scope: undefined as any })
  const scopeWith = (locking: unknown) => ({ resolve: () => locking })
  it("holds the lock until the response finishes and forwards downstream", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const req = { headers: { authorization: "Bearer reset.jwt" }, scope: { resolve: () => locking } } as any
    const res = response(), next = jest.fn()
    const middleware = serializePasswordReset("token")
    const pending = middleware(req, res, next)
    await Promise.resolve()
    expect(next).toHaveBeenCalledTimes(1)
    expect(locking.execute).toHaveBeenCalledWith(expect.stringMatching(/^pwreset:[0-9a-f]{40}$/), expect.any(Function), expect.any(Object))
    res.emit("finish")
    await pending
  })
  it("collapses framework-equivalent authorization headers onto one lock key", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const middleware = serializePasswordReset("token")
    const resA = response(), resB = response(), resC = response()
    const first = middleware({ ...make("Bearer reset.jwt"), scope: scopeWith(locking) } as any, resA, jest.fn())
    const second = middleware({ ...make("bearer  reset.jwt"), scope: scopeWith(locking) } as any, resB, jest.fn())
    const third = middleware({ ...make("BEARER	reset.jwt "), scope: scopeWith(locking) } as any, resC, jest.fn())
    await Promise.resolve()
    const keys = locking.execute.mock.calls.map(([k]) => k)
    expect(new Set(keys).size).toBe(1)
    resA.emit("finish"); resB.emit("finish"); resC.emit("finish")
    await first; await second; await third
  })
  it("serializes distinct tokens under distinct lock keys", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const middleware = serializePasswordReset("token")
    const resA = response(), resB = response()
    const first = middleware({ ...make("Bearer a"), scope: scopeWith(locking) } as any, resA, jest.fn())
    const second = middleware({ ...make("Bearer b"), scope: scopeWith(locking) } as any, resB, jest.fn())
    await Promise.resolve()
    const keys = locking.execute.mock.calls.map(([k]) => k)
    expect(new Set(keys).size).toBe(2)
    resA.emit("finish")
    resB.emit("finish")
    await first; await second
  })
  it("does not release the critical section when the client disconnects mid-flight", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const res = response()
    const pending = serializePasswordReset("token")({ ...make("Bearer t"), scope: scopeWith(locking) } as any, res, jest.fn())
    await Promise.resolve()
    // Client gone before the handler answered: the lock must stay held…
    res.emit("close")
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
    let released = false
    void pending.then(() => { released = true })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(released).toBe(false)
    // …until the downstream consumption actually ends the response.
    res.emit("finish")
    await pending
    released = true
    expect(released).toBe(true)
  })
  it("keeps holding while the downstream stalls far beyond any fixed window, then releases on completion", async () => {
    // Regression guard: no timer may end the critical section while the
    // framework handler (token consumption + password write) is still running.
    const locking = lockingThat(async (_key, fn) => fn())
    const res = response()
    const pending = serializePasswordReset("token")({ ...make("Bearer stalled"), scope: scopeWith(locking) } as any, res, jest.fn())
    await Promise.resolve()
    let released = false
    void pending.then(() => { released = true })
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(released).toBe(false)
    res.emit("finish")
    await pending
    released = true
    expect(released).toBe(true)
  })
  it("releases when the response was fully written before the connection closed", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const res = response()
    const pending = serializePasswordReset("token")({ ...make("Bearer t"), scope: scopeWith(locking) } as any, res, jest.fn())
    await Promise.resolve()
    res.writableEnded = true
    res.emit("close")
    await pending
  })
  it("keys issuance by the normalized identifier so case variants serialize", async () => {
    const locking = lockingThat(async (_key, fn) => fn())
    const resA = response(), resB = response()
    const first = serializePasswordReset("identifier")({ headers: {}, body: { identifier: "Owner@Example.com" }, scope: scopeWith(locking) } as any, resA, jest.fn())
    const second = serializePasswordReset("identifier")({ headers: {}, body: { identifier: " owner@example.com " }, scope: scopeWith(locking) } as any, resB, jest.fn())
    await Promise.resolve()
    const keys = locking.execute.mock.calls.map(([k]) => k)
    expect(new Set(keys).size).toBe(1)
    expect(locking.execute).toHaveBeenCalledWith(expect.stringMatching(/^pwreset:[0-9a-f]{40}$/), expect.any(Function), expect.any(Object))
    resA.emit("finish"); resB.emit("finish")
    await first; await second
  })
  it("fails closed when the lock backend is unavailable", async () => {
    const req = { headers: { authorization: "Bearer t" }, scope: { resolve: () => { throw new Error("lock down") } } } as any
    const res = response(), next = jest.fn()
    await serializePasswordReset("token")(req, res, next)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(next).not.toHaveBeenCalled()
  })
})
