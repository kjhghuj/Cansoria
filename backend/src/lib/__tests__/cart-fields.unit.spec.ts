import { prepareRetrieveQuery, validateAndTransformQuery } from "@medusajs/framework"
import { retrieveTransformQueryConfig as cartQueryConfig } from "@medusajs/medusa/api/store/carts/query-config"
import { StoreGetCartsCart } from "@medusajs/medusa/api/store/carts/validators"
import { applyCartFields, forceCartFields, forcePaymentFields, SAFE_CART_FIELDS, SAFE_PAYMENT_FIELDS, safeCartInput, projectOrderMetadata } from "../cart-fields"
describe("all Store cart field boundaries", () => {
  it("keeps signed storage records out of customer order list responses", () => {
    const body = { orders: [{ metadata: { portrait_photos: [{ file_id: "private" }] }, items: [{ metadata: { portrait: { style: "dark-classic", photo_name: "pet.png", internal: "private" }, server: "secret" } }] }] } as any
    projectOrderMetadata(body)
    expect(body.orders[0]).not.toHaveProperty("metadata")
    expect(body.orders[0].items[0].metadata).toEqual({ portrait: { style: "dark-classic", photo_name: "pet.png" } })
  })
  it("prevents clients from overwriting server-owned photo records", () => {
    expect(safeCartInput({ metadata: { gift_message: "Hello", portrait_photos: [{ file_id: "victim" }] } }).metadata).toEqual({ gift_message: "Hello" })
  })
  it.each(["customer.carts.shipping_address.*", "customer.addresses.*", "customer.orders.*", "payment_collection.cart.customer.orders.*"])('ignores unsafe remote expansion %s using the actual Medusa parser', async fields => {
    const req = { originalUrl: "/store/carts/cart_a/line-items", allowed: [], query: { fields } } as any
    forceCartFields(req, {} as any, jest.fn())
    const result = await prepareRetrieveQuery(req.query, { ...cartQueryConfig, allowed: [...cartQueryConfig.allowed, ...req.allowed] })
    expect(result.remoteQueryConfig.fields.some(field => field.split(".").includes("customer"))).toBe(false)
    expect(result.remoteQueryConfig.fields).toContain("shipping_address.address_1")
    expect(result.remoteQueryConfig.fields.some(field => field.includes(".carts.") || field.includes(".orders.") || field.includes(".addresses."))).toBe(false)
    expect(result.remoteQueryConfig.fields).toEqual(expect.arrayContaining(["items.variant.images.*", "items.variant.thumbnail", "region.countries.*", "payment_collection.payment_sessions.data", "items.metadata"]))
    expect(req.allowed).toEqual(["items.variant.images", "items.variant.thumbnail"])
  })
  it("preserves cart media, prices and payment client data through native validation", async () => {
    const req = { originalUrl: "/store/carts/cart_a", allowed: [], storeRelationsLimit: 3, query: { fields: "customer.orders.*" } } as any
    forceCartFields(req, {} as any, jest.fn())
    const middleware = validateAndTransformQuery(StoreGetCartsCart, cartQueryConfig)
    for (let pass = 0; pass < 2; pass++) {
      const next = jest.fn()
      await middleware(req, {} as any, next)
      expect(next).toHaveBeenCalledWith()
      expect(req.queryConfig.fields).toEqual(expect.arrayContaining(["items.variant.images.*", "items.variant.thumbnail", "items.unit_price", "total", "payment_collection.payment_sessions.data", "region.countries.*"]))
      expect(req.queryConfig.fields.some((field: string) => field.split(".").includes("customer") || field.includes(".orders."))).toBe(false)
      expect(req.allowed).toEqual([])
    }
  })
  it.each(["cart.customer.carts.shipping_address.*", "payment_sessions.payment_collection.cart.customer.addresses.*"])('ignores payment reverse expansion %s using the actual Medusa parser', async fields => {
    const req = { query: { fields } } as any
    const res = { json: jest.fn() } as any
    forcePaymentFields(req, res, jest.fn())
    const result = await prepareRetrieveQuery(req.query, { defaults: SAFE_PAYMENT_FIELDS })
    expect(result.remoteQueryConfig.fields.some(field => field.split(".").includes("cart") || field.split(".").includes("customer"))).toBe(false)
    expect(result.remoteQueryConfig.fields).toContain("payment_sessions.data")
  })
  it("payment session responses retain only the client secret required for checkout", () => {
    const req = { query: {} } as any, original = jest.fn()
    const res = { json: original } as any
    forcePaymentFields(req, res, jest.fn())
    res.json({ payment_collection: { payment_sessions: [{ id: "ps_a", provider_id: "pp_stripe_stripe", status: "pending", data: { client_secret: "needed", customer_email: "unnecessary", server_internal: "private" } }] } })
    expect(original.mock.calls[0][0].payment_collection.payment_sessions[0].data).toEqual({ client_secret: "needed" })
  })
  it("normalizes stars for native cart mutation refetches and preserves pagination", () => {
    const req = { query: {}, queryConfig: { fields: [], pagination: { take: 20, skip: 10 } } } as any
    applyCartFields(req)
    expect(req.queryConfig.fields).toContain("region.countries.*")
    expect(req.queryConfig.fields).toContain("credit_lines.*")
    expect(req.queryConfig.fields.some(field => field.startsWith("*"))).toBe(false)
    expect(req.queryConfig.pagination).toEqual({ take: 20, skip: 10 })
  })
})
