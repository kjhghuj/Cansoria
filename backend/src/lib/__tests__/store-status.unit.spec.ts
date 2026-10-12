import { storeOrdersOpen, storeOrdersOpenForScope, ORDERS_CLOSED_MESSAGE } from "../store-status"

describe("store commerce readiness", () => {
  it("opens orders only on an explicit true store flag", () => {
    expect(storeOrdersOpen({ orders_open: true })).toBe(true)
    expect(storeOrdersOpen({ orders_open: "true" })).toBe(false)
    expect(storeOrdersOpen({ orders_open: 1 })).toBe(false)
    expect(storeOrdersOpen({})).toBe(false)
    expect(storeOrdersOpen(null)).toBe(false)
    expect(storeOrdersOpen(undefined)).toBe(false)
  })

  it("fails closed when the store record cannot be read", async () => {
    const resolve = (key: string) => {
      if (key === "store") return { listStores: async () => { throw new Error("down") } }
      throw new Error(`unexpected module ${key}`)
    }
    await expect(storeOrdersOpenForScope({ resolve } as any)).rejects.toThrow("down")
  })

  it("exposes a customer-facing closed message", () => {
    expect(ORDERS_CLOSED_MESSAGE).toContain("Commissions are not open")
  })
})
