import { BigNumber, decorateCartTotals } from "@medusajs/utils"
import { Order } from "@medusajs/order/dist/models/order"
import { formatOrder } from "@medusajs/order/dist/utils/transform-order"
import { getSmallestUnit } from "@medusajs/payment-stripe/dist/utils/get-smallest-unit"
import Provider from "../service"

const send = jest.fn().mockResolvedValue({ data: { id: "message_amounts" } })
jest.mock("resend", () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: (...args) => send(...args) } })) }))

async function orderHtml(data: Record<string, unknown>) {
  await new Provider({ logger: {} }, { apiKey: "mock", from: "hello@example.com" }).send({
    to: "owner@example.com", template: "order_placed", data: { id: "order_amounts", ...data },
  })
  return send.mock.calls[0][0].html as string
}

function summaryAmount(html: string, label: string) {
  const summary = html.slice(html.indexOf("Artwork subtotal") - 1)
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = summary.match(new RegExp(`>${escaped}</td>\\s*<td[^>]*>([^<]+)</td>`))
  expect(match).not.toBeNull()
  return match?.[1]
}

function orderTotals(input: Parameters<typeof decorateCartTotals>[0]) {
  // OrderModuleService uses this exact formatter before graph serialization.
  // Exercise the persisted order-item and shipping-method relation shapes.
  return JSON.parse(JSON.stringify(formatOrder({
    ...input,
    items: input.items?.map(item => ({ quantity: item.quantity, unit_price: item.unit_price, item })),
    shipping_methods: input.shipping_methods?.map(shipping_method => ({ shipping_method })),
  }, { entity: Order, includeTotals: true })))
}

describe("order email amounts in Medusa v2 major currency units", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters"
    process.env.STOREFRONT_URL = "https://cansoria.test"
  })

  it.each([["usd", 129, "USD 129.00"], ["gbp", 85.02, "GBP 85.02"], ["eur", 100.28, "EUR 100.28"]])(
    "keeps %s amount %s in major units", async (currency_code, price, expected) => {
      const html = await orderHtml({ currency_code, item_subtotal: price, shipping_subtotal: 0, total: price, items: [{ quantity: 1, unit_price: price, total: price }] })
      expect(html).toContain(`Qty: 1 x ${expected}`)
      expect(summaryAmount(html, "Artwork subtotal (before tax)")).toBe(expected)
      expect(summaryAmount(html, "Total")).toBe(expected)
    }
  )

  it("uses real Medusa totals for quantities, item and shipping discounts, tax and credits", async () => {
    const totals = orderTotals({
      currency_code: "usd",
      items: [{ unit_price: 129, quantity: 2, adjustments: [{ amount: 25.8 }], tax_lines: [{ rate: 20 }] }],
      shipping_methods: [{ amount: 14, adjustments: [{ amount: 4 }], tax_lines: [{ rate: 20 }] }],
      credit_lines: [{ amount: 10 }],
    })
    expect(totals.subtotal).toBe(272)
    expect(totals.discount_total).toBe(35.76)
    expect(totals.total).toBe(280.64)
    const html = await orderHtml(totals)
    expect(html).toContain("Qty: 2 x USD 129.00")
    expect(html).toContain(">USD 278.64</td>")
    expect(html).toContain("After discounts and tax")
    expect(summaryAmount(html, "Artwork subtotal (before tax)")).toBe("USD 258.00")
    expect(summaryAmount(html, "Shipping (before tax)")).toBe("USD 14.00")
    expect(summaryAmount(html, "Discounts (before tax)")).toBe("USD -29.80")
    expect(summaryAmount(html, "Tax")).toBe("USD 48.44")
    expect(summaryAmount(html, "Credits")).toBe("USD -10.00")
    expect(summaryAmount(html, "Total")).toBe("USD 280.64")
  })

  it("does not add included tax twice for Medusa tax-inclusive prices", async () => {
    const totals = orderTotals({
      currency_code: "gbp",
      items: [{ unit_price: 120, quantity: 2, is_tax_inclusive: true, adjustments: [{ amount: 24, is_tax_inclusive: true }], tax_lines: [{ rate: 20 }] }],
      shipping_methods: [{ amount: 12, is_tax_inclusive: true, tax_lines: [{ rate: 20 }] }],
    })
    expect(totals.subtotal).toBe(210)
    expect(totals.discount_total).toBe(24)
    expect(totals.total).toBe(228)
    const html = await orderHtml(totals)
    expect(html).toContain("Qty: 2 x GBP 120.00")
    expect(html).toContain(">GBP 216.00</td>")
    expect(summaryAmount(html, "Artwork subtotal (before tax)")).toBe("GBP 200.00")
    expect(summaryAmount(html, "Shipping (before tax)")).toBe("GBP 10.00")
    expect(summaryAmount(html, "Discounts (before tax)")).toBe("GBP -20.00")
    expect(summaryAmount(html, "Tax")).toBe("GBP 38.00")
    expect(summaryAmount(html, "Total")).toBe("GBP 228.00")
  })

  it("rounds a real half-cent tax total to the same amount as Stripe", async () => {
    const totals = orderTotals({
      currency_code: "usd",
      items: [{ unit_price: 109, quantity: 1, tax_lines: [{ rate: 7.5 }] }],
      shipping_methods: [],
    })
    expect(totals.total).toBe(117.175)
    // This is Stripe's installed pure amount conversion, without an API client.
    expect(getSmallestUnit(totals.total, "usd")).toBe(11718)
    const html = await orderHtml(totals)
    expect(html).toContain(">USD 117.18</td>")
    expect(summaryAmount(html, "Tax")).toBe("USD 8.18")
    expect(summaryAmount(html, "Total")).toBe("USD 117.18")
  })

  it("preserves BigNumber decimal precision and major units through formatting", async () => {
    const total = new BigNumber("117.175")
    const html = await orderHtml({ currency_code: "usd", item_subtotal: new BigNumber("109"), tax_total: new BigNumber("8.175"), total, items: [{ quantity: 1, unit_price: new BigNumber("109"), total }] })
    expect(getSmallestUnit(total, "usd")).toBe(11718)
    expect(html).toContain("Qty: 1 x USD 109.00")
    expect(summaryAmount(html, "Total")).toBe("USD 117.18")
    expect(summaryAmount(html, "Tax")).toBe("USD 8.18")
  })

  it("preserves numeric strings and a fully discounted zero line total", async () => {
    const html = await orderHtml({ currency_code: "usd", item_subtotal: "129", shipping_subtotal: "0", discount_subtotal: "129", total: "0", items: [{ unit_price: "129", quantity: 1, total: "0", discount_total: "129" }] })
    expect(html).toContain("Qty: 1 x USD 129.00")
    expect(html).toContain(">USD 0.00</td>")
    expect(summaryAmount(html, "Discounts (before tax)")).toBe("USD -129.00")
    expect(summaryAmount(html, "Total")).toBe("USD 0.00")
  })

  it("escapes currency and shipping strings without altering the signed order link", async () => {
    const html = await orderHtml({ currency_code: "<img>", shipping_methods: [{ name: "<express>" }], total: 129 })
    expect(html).toContain("&lt;IMG&gt; 129.00")
    expect(html).toContain("&lt;express&gt;")
    expect(html).not.toContain("<IMG>")
    expect(html).not.toContain("<express>")
    expect(html).toContain("/order/lookup?order=order_amounts&amp;token=")
    expect(html).not.toContain("email=")
  })

  it.each([NaN, Infinity, "not-money"])("rejects invalid total %s before sending", async total => {
    await expect(orderHtml({ total })).rejects.toThrow("Failed to render notification template")
    expect(send).not.toHaveBeenCalled()
  })
})
