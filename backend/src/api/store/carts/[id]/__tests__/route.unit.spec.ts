import { GET } from "../route"
import { issueAccessToken } from "../../../../../lib/access-tokens"
describe("GET /store/carts/:id", () => {
  const graph = jest.fn()
  const response = () => ({ setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }) as any
  const request = () => ({ scope: { resolve: () => ({ graph }) }, params: { id: "cart_a" }, headers: { "x-cart-access-token": issueAccessToken("cart", "cart_a") } }) as any
  beforeEach(() => { graph.mockReset(); process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters" })
  it("returns 400 for a missing cart ID", async () => {
    const req = request(), res = response(); req.params = {}
    await GET(req, res); expect(res.status).toHaveBeenCalledWith(400)
  })
  it("denies a known cart without its capability", async () => {
    graph.mockResolvedValue({ data: [{ id: "cart_a", customer_id: null }] })
    const req = request(), res = response(); req.headers = {}
    await GET(req, res); expect(res.status).toHaveBeenCalledWith(403)
  })
  it("does not disclose unknown cart IDs", async () => {
    graph.mockResolvedValue({ data: [] }); const res = response()
    await GET(request(), res); expect(res.status).toHaveBeenCalledWith(403)
  })
  it("returns 404 when an authorized cart is no longer available", async () => {
    graph.mockResolvedValueOnce({ data: [{ id: "cart_a" }] }).mockResolvedValueOnce({ data: [] })
    const res = response(); await GET(request(), res); expect(res.status).toHaveBeenCalledWith(404)
  })
  it("does not reopen a completed cart", async () => {
    graph.mockResolvedValueOnce({ data: [{ id: "cart_a" }] }).mockResolvedValueOnce({ data: [{ id: "cart_a", completed_at: new Date() }] })
    const res = response(); await GET(request(), res); expect(res.status).toHaveBeenCalledWith(404)
  })
  it("returns authorized checkout fields and projects payment sessions", async () => {
    graph.mockResolvedValueOnce({ data: [{ id: "cart_a" }] }).mockResolvedValueOnce({ data: [{ id: "cart_a", email: "owner@example.com", total: 150, payment_collection: { payment_sessions: [{ id: "ps_a", provider_id: "pp_stripe_stripe", status: "pending", data: { client_secret: "needed", internal: "omit" } }] } }] })
    const res = response(); await GET(request(), res)
    expect(res.json.mock.calls[0][0].cart).toMatchObject({ id: "cart_a", email: "owner@example.com", total: 150 })
    expect(res.json.mock.calls[0][0].cart.payment_collection.payment_sessions[0].data).toEqual({ client_secret: "needed" })
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
  })
  it("returns a generic error on service failure", async () => {
    graph.mockRejectedValue(Error("private query details")); const res = response()
    await GET(request(), res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private query details")
  })
})
