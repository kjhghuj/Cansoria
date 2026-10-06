import { EventEmitter } from "events"
import { POST } from "../store/carts/[id]/complete/route"
const nativeComplete = jest.fn()
jest.mock("@medusajs/medusa/api/store/carts/[id]/complete/route", () => ({ POST: (...args) => nativeComplete(...args) }))
const bound = { code: "ART15-SAFE", rules: [{ attribute: "customer.id", operator: "eq", values: [{ value: "cus_a" }] }, { attribute: "email", operator: "eq", values: [{ value: "owner@example.com" }] }] }
describe("welcome completion workflow lifetime", () => {
  beforeEach(() => jest.clearAllMocks())
  function pair(legacy = false) {
    let used = 0, active = 0, maxActive = 0
    const queues = new Map<string, Promise<void>>()
    const locking = { execute: jest.fn(async (keys, job) => { const key = JSON.stringify(keys); const previous = queues.get(key) || Promise.resolve(); let release!: () => void; queues.set(key, new Promise<void>(resolve => { release = resolve })); await previous; try { return await job() } finally { release() } }) }
    const tasks = ["cart_a", "cart_b"].map(id => {
      const cart = { id, email: "owner@example.com", customer_id: "cus_a", customer: { has_account: true }, promotions: [{ code: legacy ? "ART15-LEGACY" : "ART15-SAFE" }] }
      const req = { params: { id }, auth_context: { actor_id: "cus_a" }, headers: {}, scope: { resolve: key => ({ query: { graph: async () => ({ data: [cart] }) }, locking, promotion: { listPromotions: async () => legacy ? [] : [{ ...bound, campaign: { budget: { type: "usage", limit: 1, used } } }] } }[key]) } } as any
      const res = Object.assign(new EventEmitter(), { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }) as any
      return { req, res }
    })
    nativeComplete.mockImplementation(async (_req, res) => {
      active++; maxActive = Math.max(maxActive, active)
      res.emit("close") // The client leaves before the native workflow commits coupon usage.
      await new Promise(resolve => setTimeout(resolve, 20))
      used++; active--; res.status(200).json({ type: "order" })
    })
    return { tasks, locking, maxActive: () => maxActive }
  }
  it("keeps coupon serialization after client close until native workflow resolution", async () => {
    const { tasks, maxActive } = pair()
    await Promise.all(tasks.map(({ req, res }) => POST(req, res)))
    expect(maxActive()).toBe(1)
    expect(nativeComplete).toHaveBeenCalledTimes(1)
    expect(tasks[1].res.status).toHaveBeenCalledWith(403)
  })
  it("rejects legacy unbound codes without calling the native completion flow", async () => {
    const { tasks } = pair(true)
    await POST(tasks[0].req, tasks[0].res)
    expect(tasks[0].res.status).toHaveBeenCalledWith(403)
    expect(nativeComplete).not.toHaveBeenCalled()
  })
  it("preserves authorized retry of an already completed cart after coupon usage", async () => {
    const { tasks } = pair()
    const originalResolve = tasks[0].req.scope.resolve
    tasks[0].req.scope.resolve = key => key === "query" ? { graph: async () => ({ data: [{ id: "cart_a", customer_id: "cus_a", customer: { has_account: true }, completed_at: new Date(), promotions: [{ code: "ART15-SAFE" }], email: "owner@example.com" }] }) } : key === "promotion" ? { listPromotions: async () => [{ ...bound, campaign: { budget: { type: "usage", limit: 1, used: 1 } } }] } : originalResolve(key)
    await POST(tasks[0].req, tasks[0].res)
    expect(nativeComplete).toHaveBeenCalledTimes(1)
    expect(tasks[0].res.status).toHaveBeenCalledWith(200)
  })
  it("rejects pre-existing system-provider sessions before native completion", async () => {
    const { tasks } = pair()
    const originalResolve = tasks[0].req.scope.resolve
    tasks[0].req.scope.resolve = key => key === "query" ? { graph: async () => ({ data: [{ id: "cart_a", customer_id: "cus_a", customer: { has_account: true }, payment_collection: { payment_sessions: [{ provider_id: "pp_system_default" }] } }] }) } : originalResolve(key)
    await POST(tasks[0].req, tasks[0].res)
    expect(nativeComplete).not.toHaveBeenCalled()
    expect(tasks[0].res.status).toHaveBeenCalledWith(403)
  })
})
