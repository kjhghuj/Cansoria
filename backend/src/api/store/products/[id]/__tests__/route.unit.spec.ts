import { GET } from "../route"
describe("GET /store/products/:id", () => {
  const graph = jest.fn()
  const request = () => ({ scope: { resolve: () => ({ graph }) }, params: { id: "prod_a" }, filterableFields: { sales_channel_id: ["sc_allowed"] } }) as any
  const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as any
  beforeEach(() => graph.mockReset())
  it.each([undefined, "invalid space"])('rejects missing or malformed ID %p', async id => {
    const req = request(), res = response(); req.params.id = id
    await GET(req, res); expect(res.status).toHaveBeenCalledWith(400)
  })
  it("returns 404 for an unavailable published product", async () => {
    graph.mockResolvedValue({ data: [] }); const res = response()
    await GET(request(), res); expect(res.status).toHaveBeenCalledWith(404)
  })
  it("preserves prepared channel restrictions when looking up a handle", async () => {
    graph.mockResolvedValue({ data: [{ id: "prod_a", handle: "painting" }] })
    const req = request(), res = response(); req.params.id = "painting"; req.filterableFields.id = "painting"
    await GET(req, res)
    expect(graph.mock.calls[0][0].filters).toMatchObject({ status: "published", sales_channel_id: ["sc_allowed"], $or: [{ id: "painting" }, { handle: "painting" }] })
    expect(graph.mock.calls[0][0].filters).not.toHaveProperty("id")
  })
  it("preserves variant images without exposing raw prices or private categories", async () => {
    graph.mockResolvedValue({ data: [{ id: "prod_a", categories: [{ id: "hidden", is_internal: true }, { id: "inactive", is_active: false }], variants: [{ id: "v_a", metadata: { images: [{ url: "https://cansoria.test/painting.jpg" }] } }, { id: "v_b", thumbnail: "keep", metadata: { images: [{ url: "replace" }] } }, { id: "v_c" }] }] })
    const req = request(), res = response(); req.pricingContext = { currency_code: "usd" }
    await GET(req, res)
    expect(res.json.mock.calls[0][0].product.variants[0].thumbnail).toBe("https://cansoria.test/painting.jpg")
    expect(res.json.mock.calls[0][0].product.variants[1].thumbnail).toBe("keep")
    expect(res.json.mock.calls[0][0].product.categories).toEqual([])
    expect(graph.mock.calls[0][0].fields.some((field: string) => field.includes("prices"))).toBe(false)
  })
  it("does not leak service errors", async () => {
    graph.mockRejectedValue(Error("private query details")); const res = response()
    await GET(request(), res); expect(res.status).toHaveBeenCalledWith(500)
    expect(JSON.stringify(res.json.mock.calls)).not.toContain("private query details")
  })
})
