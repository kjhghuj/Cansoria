import { GET } from "../store/store-info/route"
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
const request = (metadata: Record<string, unknown>) => ({ scope: { resolve: () => ({ listStores: async () => [{ id: "store_1", name: "Cansoria", metadata }] }) } }) as any
describe("store info metadata projection", () => {
  it("returns only public metadata keys while gating on the raw record", async () => {
    const res = response()
    await GET(request({ announcement_bar: { enabled: true, message: "New" }, orders_open: true, internal_notes: "secret" }), res)
    expect(res.status).toHaveBeenCalledWith(200)
    const store = res.json.mock.calls[0][0].store
    expect(store.metadata).toEqual({ announcement_bar: { enabled: true, message: "New" }, orders_open: true })
    expect(store.orders_open).toBe(true)
  })
  it("returns empty metadata when nothing public is configured", async () => {
    const res = response()
    await GET(request({ internal_notes: "secret" }), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json.mock.calls[0][0].store.metadata).toEqual({})
  })
  it("keeps orders closed unless the raw record opts in", async () => {
    const res = response()
    await GET(request({ announcement_bar: { enabled: false } }), res)
    expect(res.json.mock.calls[0][0].store.orders_open).toBe(false)
  })
})
