import { POST as testEmail } from "../store/test-email/route"
import { POST as checkEmail } from "../store/check-email/route"
import { POST as newsletter } from "../store/newsletter/route"
import { POST as transfer } from "../store/orders/transfer/route"
import { GET as staticFile } from "../static/[filename]/route"
import { GET as product } from "../store/products/[id]/route"
import { verifyTurnstileToken } from "../../lib/turnstile"
import { subscribeToNewsletter } from "../../lib/klaviyo"

jest.mock("../../lib/turnstile", () => ({ verifyTurnstileToken: jest.fn().mockResolvedValue(true) }))
jest.mock("../../lib/klaviyo", () => ({ subscribeToNewsletter: jest.fn().mockResolvedValue(true) }))
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
const request = () => ({ body: {}, params: {}, headers: {}, scope: { resolve: jest.fn() } }) as any

describe("unsafe public routes", () => {
  afterEach(() => jest.clearAllMocks())
  it("retires test email without resolving or invoking notification service", async () => {
    const req = request(), res = response()
    req.body = { email: "victim@example.com" }
    await testEmail(req, res)
    expect(res.status).toHaveBeenCalledWith(410)
    expect(req.scope.resolve).not.toHaveBeenCalled()
  })
  it("email check is uniform and does not query identities", async () => {
    const req = request(), res = response()
    req.body = { email: "victim@example.com" }
    await checkEmail(req, res)
    expect(res.json).toHaveBeenCalledWith({ message: "Continue with sign in or create an account." })
    expect(req.scope.resolve).not.toHaveBeenCalled()
  })
  it("anonymous newsletter only subscribes and never creates coupons", async () => {
    const req = request(), res = response()
    req.body = { email: "new@example.com", turnstile_token: "valid" }
    await newsletter(req, res)
    expect(subscribeToNewsletter).toHaveBeenCalledWith("new@example.com", expect.objectContaining({ source: "cansoria-storefront" }))
    expect(req.scope.resolve).not.toHaveBeenCalledWith("promotion")
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("discount_code")
  })
  it("newsletter invalid challenge cannot subscribe", async () => {
    ;(verifyTurnstileToken as jest.Mock).mockResolvedValueOnce(false)
    const req = request(), res = response()
    req.body = { email: "new@example.com", turnstile_token: "invalid" }
    await newsletter(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(subscribeToNewsletter).not.toHaveBeenCalled()
  })
  it.each([{}, { email: 123 }, { email: "invalid", turnstile_token: "valid" }, { email: "owner@example.com" }, { email: "owner@example.com", turnstile_token: [] }])("rejects invalid newsletter input %p", async (body) => {
    const req = request(), res = response(); req.body = body
    await newsletter(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(subscribeToNewsletter).not.toHaveBeenCalled()
  })
  it("only returns an existing unexpired coupon for the authenticated account email", async () => {
    const req = request(), res = response()
    req.auth_context = { actor_id: "cus_a" }; req.body = { email: "owner@example.com", turnstile_token: "valid" }
    req.scope.resolve.mockImplementation((key: string) => key === "promotion" ? { listPromotions: async () => [{ rules: [{ attribute: "customer.id", operator: "eq", values: [{ value: "cus_a" }] }, { attribute: "email", operator: "eq", values: [{ value: "owner@example.com" }] }], campaign: { budget: { type: "usage", limit: 1 } } }] } : { retrieveCustomer: async () => ({ id: "cus_a", email: "owner@example.com", metadata: { welcome_discount_code: "ART15-SAFE", welcome_discount_valid_until: new Date(Date.now() + 60000).toISOString() } }) })
    await newsletter(req, res)
    expect(res.json.mock.calls[0][0].discount_code).toBe("ART15-SAFE")
    req.body.email = "other@example.com"
    const denied = response(); await newsletter(req, denied)
    expect(denied.status).toHaveBeenCalledWith(403)
  })
  it("expired metadata and provider failures do not produce fresh promotions", async () => {
    const req = request(), res = response()
    req.auth_context = { actor_id: "cus_a" }; req.body = { email: "owner@example.com", turnstile_token: "valid" }
    req.scope.resolve.mockReturnValue({ retrieveCustomer: async () => ({ email: "owner@example.com", metadata: { welcome_discount_code: "ART15-SAFE", welcome_discount_valid_until: "2000-01-01" } }) })
    await newsletter(req, res)
    expect(res.json.mock.calls[0][0]).not.toHaveProperty("discount_code")
    ;(subscribeToNewsletter as jest.Mock).mockRejectedValueOnce(Error("private provider details"))
    const failure = response(); await newsletter(req, failure)
    expect(failure.status).toHaveBeenCalledWith(503)
    expect(JSON.stringify(failure.json.mock.calls)).not.toContain("private provider details")
  })
  it("rejects missing email in the retired enumeration route", async () => {
    const req = request(), res = response(); await checkEmail(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
  it("transfer rejects unauthenticated customer ID and email spoofing", async () => {
    const req = request(), res = response()
    req.body = { order_id: "order_a", customer_id: "customer_attack", customer_email: "victim@example.com" }
    await transfer(req, res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(req.scope.resolve).not.toHaveBeenCalled()
  })
  it.each(["../static-backup/test.txt", "../.env", "nested/test.svg", "..\\secret", "\0file"])('rejects static filename %s', async (filename) => {
    const req = request(), res = response()
    req.params = { filename }
    await staticFile(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
  it("forces published and prepared sales-channel filters on product lookup", async () => {
    const graph = jest.fn().mockResolvedValue({ data: [{ id: "prod_a", status: "published", categories: [{ id: "cat_hidden", is_internal: true }, { id: "cat_public", is_internal: false, is_active: true }] }] })
    const req = request(), res = response()
    req.params.id = "prod_a"; req.scope.resolve.mockReturnValue({ graph })
    req.filterableFields = { id: ["prod_a"], sales_channel_id: ["sc_allowed"] }
    await product(req, res)
    expect(graph.mock.calls[0][0].filters).toMatchObject({ status: "published", sales_channel_id: ["sc_allowed"], id: ["prod_a"] })
    expect(res.json.mock.calls[0][0].product.categories).toEqual([{ id: "cat_public", is_internal: false, is_active: true }])
  })
  it("does not expose raw prices requested through product fields expansion", async () => {
    const graph = jest.fn().mockResolvedValue({ data: [{ id: "prod_a", variants: [] }] })
    const req = request(), res = response(); req.params.id = "prod_a"; req.scope.resolve.mockReturnValue({ graph }); req.queryConfig = { fields: ["variants.prices.*", "variants.price_set.prices.*"] }; req.pricingContext = { currency_code: "usd" }
    await product(req, res)
    expect(graph.mock.calls[0][0].fields.some((field: string) => field.includes("prices"))).toBe(false)
    expect(graph.mock.calls[0][0].fields).toContain("variants.calculated_price.*")
  })
})
