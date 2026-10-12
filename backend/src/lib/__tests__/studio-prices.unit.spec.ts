import {
  artworkPrices,
  artworkUsdPrice,
  sampleUsdPrice,
  shippingPrice,
} from "../studio-prices"

describe("approved studio prices in Medusa v2 major currency units", () => {
  it.each([
    ["8x10", 129], ["12x16", 189], ["16x20", 259], ["24x36", 399],
  ])("prices a %s canvas at USD %s", (size, amount) => {
    expect(artworkUsdPrice(size, "Canvas Only", "Portrait")).toBe(amount)
  })

  it("applies framing, Square, and the approved pet offset before currency conversion", () => {
    expect(artworkUsdPrice("8x10", "Framed", "Square", -20)).toBe(194)
    expect(artworkPrices(109)).toEqual([
      { currency_code: "gbp", amount: 85.02 },
      { currency_code: "eur", amount: 100.28 },
      { currency_code: "usd", amount: 109 },
    ])
    expect(artworkPrices(179)[0].amount).toBe(139.62)
  })

  it("keeps two decimal places for random sample currency conversion", () => {
    expect(sampleUsdPrice(0)).toBe(129)
    expect(sampleUsdPrice(0.5)).toBe(219)
    expect(sampleUsdPrice(1 - Number.EPSILON)).toBe(309)
    expect(artworkPrices(129.01)).toEqual([
      { currency_code: "gbp", amount: 100.63 },
      { currency_code: "eur", amount: 118.69 },
      { currency_code: "usd", amount: 129.01 },
    ])
  })

  it("uses the approved delivery prices without changing free shipping rules", () => {
    expect(shippingPrice("Standard Art Delivery", "gbp")).toBe(9)
    expect(shippingPrice("Priority Art Delivery", "gbp")).toBe(18)
    expect(shippingPrice("Standard Art Delivery", "eur")).toBe(11)
    expect(shippingPrice("Priority Art Delivery", "usd")).toBe(28)
    expect(shippingPrice("Free Art Delivery", "usd")).toBe(0)
  })

  it("rejects unsupported options and non-finite money", () => {
    expect(() => artworkUsdPrice("A4", "Canvas Only", "Portrait")).toThrow()
    expect(() => artworkUsdPrice("8x10", "Unknown", "Portrait")).toThrow()
    expect(() => artworkPrices(NaN)).toThrow()
  })
})
