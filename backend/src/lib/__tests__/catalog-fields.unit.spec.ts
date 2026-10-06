import { prepareListQuery, prepareRetrieveQuery } from "@medusajs/framework"
import { retrieveTransformQueryConfig as customerQueryConfig } from "@medusajs/medusa/api/store/customers/query-config"
import { forceCatalogFields, STORE_RESTRICTED_FIELDS } from "../catalog-fields"
describe("public catalog Graph projections", () => {
  it.each([
    ["regions", "carts.email,carts.shipping_address.*"],
    ["products", "cart_items.cart.shipping_address.*"],
    ["products", "sales_channels.carts.shipping_address.*"],
    ["collections", "products.sales_channels.carts.shipping_address.*"],
    ["product-categories", "products.cart_items.cart.email"],
    ["product-types", "products.cart_items.cart.email"],
    ["product-tags", "products.cart_items.cart.email"],
    ["product-variants", "product.sales_channels.carts.email,prices.*"],
    ["shipping-options", "fulfillments.delivery_address.*"],
    ["shipping-options/option_a/calculate", "fulfillments.delivery_address.*"],
    ["payment-providers", "regions.carts.shipping_address.*"],
    ["return-reasons", "return_items.return.order.items.*"],
    ["currencies", "carts.email"],
    ["locales", "customers.addresses.*"],
    ["orders", "items.variant.product.shipping_profile.shipping_options.fulfillments.delivery_address.*"],
    ["customers/me", "groups.customers.addresses.*"],
    ["customers/me/addresses", "customer.groups.customers.addresses.*"],
  ])("fixes %s projection despite reverse expansion %s", (resource, fields) => {
    const req = { originalUrl: `/store/${resource}`, method: "GET", query: { fields, limit: "20", offset: "10", category_id: "cat_a" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = prepareListQuery({ fields: req.query.fields, limit: 20, offset: 10 }, { restricted: STORE_RESTRICTED_FIELDS }).remoteQueryConfig.fields
    for (const field of output) expect(field.split(".").some(segment => ["cart", "carts", "cart_items", "customer", "customers", "orders", "fulfillments", "delivery_address", "prices"].includes(segment))).toBe(false)
    expect(req.query.category_id).toBe("cat_a")
    expect(req.query.limit).toBe("20")
    expect(req.query.offset).toBe("10")
  })
  it("normalizes native star defaults when queryConfig already exists", () => {
    const req = { originalUrl: "/store/customers/me", query: { fields: "groups.customers.*" }, queryConfig: { fields: [] } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    expect(req.queryConfig.fields).toContain("addresses.*")
    expect(req.queryConfig.fields.some(field => field.startsWith("*"))).toBe(false)
    expect(req.queryConfig.fields.some(field => field.includes("groups.customers"))).toBe(false)
  })
  it.each(["carts.email", "cart_items.cart.email", "products.sales_channels.carts.shipping_address.*"])("globally rejects %s on other Store graph endpoints", fields => {
    expect(() => prepareListQuery({ fields }, { restricted: STORE_RESTRICTED_FIELDS })).toThrow()
  })
  it("preserves public product images, metadata and calculated prices", () => {
    const req = { originalUrl: "/store/products", query: { fields: "variants.inventory_quantity,+variants.calculated_price" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = prepareListQuery({ fields: req.query.fields }).remoteQueryConfig.fields
    expect(output).toEqual(expect.arrayContaining(["metadata", "variants.metadata", "variants.images.*", "variants.thumbnail", "variants.calculated_price.*", "variants.inventory_quantity"]))
  })
  it.each(["products", "product-variants"])("does not add a price-context requirement to default %s requests", resource => {
    const req = { originalUrl: `/store/${resource}`, query: {} } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = prepareListQuery({ fields: req.query.fields }).remoteQueryConfig.fields
    expect(output.some(field => field.includes("calculated_price"))).toBe(false)
  })
  it.each(["POST", "DELETE"])("keeps native customer output for address %s using its actual allowed-fields parser", method => {
    const req = { originalUrl: "/store/customers/me/addresses/addr_a", method, query: { fields: "customer.groups.customers.*" }, queryConfig: { fields: [] } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = prepareRetrieveQuery(req.query, customerQueryConfig).remoteQueryConfig.fields
    expect(output).toContain("addresses.*")
    expect(output).not.toContain("address_1")
  })
})
