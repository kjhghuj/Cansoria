import {
  watchPrices,
  watchUsdPrice,
  sampleUsdPrice,
  shippingPrice,
} from "../watch-prices"

describe("approved studio prices in Medusa v2 major currency units", () => {
  it.each([
    ["36mm", 249], ["38mm", 279], ["40mm", 309], ["42mm", 339],
  ])("prices a %s watch on a leather strap at USD %s", (size, amount) => {
    expect(watchUsdPrice(size, "Leather Strap")).toBe(amount)
  })

  it("applies bracelet upgrades and the approved product offset before currency conversion", () => {
    expect(watchUsdPrice("40mm", "Steel Bracelet")).toBe(369)
    expect(watchUsdPrice("38mm", "Mesh Bracelet")).toBe(319)
    expect(watchUsdPrice("36mm", "Leather Strap", -30)).toBe(219)
    expect(watchPrices(109)).toEqual([
      { currency_code: "gbp", amount: 85.02 },
      { currency_code: "eur", amount: 100.28 },
      { currency_code: "usd", amount: 109 },
    ])
    expect(watchPrices(179)[0].amount).toBe(139.62)
  })

  it("keeps two decimal places for random sample currency conversion", () => {
    expect(sampleUsdPrice(0)).toBe(249)
    expect(sampleUsdPrice(0.5)).toBe(374)
    expect(sampleUsdPrice(1 - Number.EPSILON)).toBe(499)
    expect(watchPrices(129.01)).toEqual([
      { currency_code: "gbp", amount: 100.63 },
      { currency_code: "eur", amount: 118.69 },
      { currency_code: "usd", amount: 129.01 },
    ])
  })

  it("uses the approved delivery prices without changing free shipping rules", () => {
    expect(shippingPrice("Standard Watch Delivery", "gbp")).toBe(9)
    expect(shippingPrice("Priority Watch Delivery", "gbp")).toBe(18)
    expect(shippingPrice("Standard Watch Delivery", "eur")).toBe(11)
    expect(shippingPrice("Priority Watch Delivery", "usd")).toBe(28)
    expect(shippingPrice("Free Watch Delivery", "usd")).toBe(0)
  })

  it("rejects unsupported options and non-finite money", () => {
    expect(() => watchUsdPrice("44mm", "Leather Strap")).toThrow()
    expect(() => watchUsdPrice("36mm", "Rubber Strap")).toThrow()
    expect(() => watchPrices(NaN)).toThrow()
  })
})
