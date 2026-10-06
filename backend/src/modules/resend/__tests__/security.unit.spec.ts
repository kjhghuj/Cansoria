import Provider from "../service"
const send = jest.fn().mockResolvedValue({ data: { id: "message_a" } })
jest.mock("resend", () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: (...args) => send(...args) } })) }))
describe("fixed email templates", () => {
  beforeEach(() => { jest.clearAllMocks(); process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters"; process.env.STOREFRONT_URL = "https://cansoria.test" })
  const provider = () => new Provider({ logger: {} }, { apiKey: "mock", from: "hello@example.com" })
  it("rejects arbitrary template paths before sending", async () => {
    await expect(provider().send({ to: "owner@example.com", template: "../../etc/passwd", data: {} })).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
  it("order confirmation has a signed access link without email in the URL", async () => {
    await provider().send({ to: "owner@example.com", template: "order_placed", data: { id: "order_a", email: "owner@example.com" } })
    const email = send.mock.calls[0][0]
    expect(email.html).toContain("/order/lookup?order=order_a&amp;token=")
    expect(email.html).not.toContain("email=")
    expect(email.html).not.toContain("owner%40example.com")
  })
  it("renders only the fixed mailbox proof email without injecting arbitrary HTML", async () => {
    await provider().send({ to: "owner@example.com", template: "order_access", data: { access_url: "https://cansoria.test/order/lookup?order=order_a&token=test", injected: "<script>unsafe</script>" } })
    expect(send.mock.calls[0][0].html).toContain("token=test")
    expect(send.mock.calls[0][0].html).not.toContain("<script>")
  })
  it("escapes welcome names and coupon values", async () => {
    await provider().send({ to: "owner@example.com", template: "customer_created", data: { first_name: "<script>bad</script>", discountCode: "<img src=x onerror=alert(1)>", validUntil: "Tomorrow" } })
    const html = send.mock.calls[0][0].html
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })
  it("supports welcome messages without a promotion", async () => {
    send.mockResolvedValueOnce({ data: {} })
    const result = await provider().send({ to: "owner@example.com", template: "customer_created", data: {} })
    expect(result.id).toMatch(/^email-/)
    expect(send.mock.calls[0][0].html).not.toContain("Your Studio Welcome Gift")
  })
  it("renders order items safely with and without optional display fields", async () => {
    await provider().send({ to: "owner@example.com", template: "order_placed", data: { id: "order_a", firstName: "<img>", currency_code: "eur", shipping_methods: [{ name: "<express>" }], items: [{ title: "<script>bad</script>", variant_title: "Large", quantity: 2, unit_price: 100, thumbnail: "https://cansoria.test/a.jpg" }, { product_title: "Painting" }, {}] } })
    const html = send.mock.calls[0][0].html
    expect(html).not.toContain("<script>")
    expect(html).toContain("EUR")
    expect(html).toContain("Qty: 2")
  })
  it.each([{ to: undefined }, { to: "bad" }])("rejects invalid recipients %p", async (recipient) => {
    await expect(provider().send({ ...recipient, template: "customer_created" })).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
  it("rejects missing provider credentials", () => {
    expect(() => new Provider({ logger: {} }, { apiKey: "", from: "" })).toThrow()
  })
  it.each(["not a url", "https://evil.test/order/lookup?token=x", "https://cansoria.test/admin"])('rejects untrusted access links %s', async (access_url) => {
    await expect(provider().send({ to: "owner@example.com", template: "order_access", data: { access_url } })).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
  it("does not send a confirmation without a valid order subject", async () => {
    await expect(provider().send({ to: "owner@example.com", template: "order_placed", data: {} })).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
  it("does not leak provider errors", async () => {
    send.mockResolvedValueOnce({ error: { message: "secret provider failure" } })
    await expect(provider().send({ to: "owner@example.com", template: "customer_created", data: {} })).rejects.toThrow("Email notification failed")
  })
})
