import { prepareListQuery, prepareRetrieveQuery, validateAndTransformQuery } from "@medusajs/framework"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"
import { StoreGetProductsParams } from "@medusajs/medusa/api/store/products/validators"
import { listTransformQueryConfig as orderQueryConfig } from "@medusajs/medusa/api/store/orders/query-config"
import { SAFE_ORDER_FIELDS } from "../cart-fields"
import { retrieveTransformQueryConfig as customerQueryConfig } from "@medusajs/medusa/api/store/customers/query-config"
import { forceCatalogFields, STORE_RESTRICTED_FIELDS, projectCatalogMetadata, publicCatalogMetadata, PUBLIC_STORE_METADATA_KEYS } from "../catalog-fields"
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
  ])("fixes %s projection despite reverse expansion %s", async (resource, fields) => {
    const req = { originalUrl: `/store/${resource}`, method: "GET", query: { fields, limit: "20", offset: "10", category_id: "cat_a" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = (await prepareListQuery({ fields: req.query.fields, limit: 20, offset: 10 }, { restricted: STORE_RESTRICTED_FIELDS })).remoteQueryConfig.fields
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
  it("uses the native shipping type relation so delivery choices can be listed", () => {
    const req = { originalUrl: "/store/shipping-options", query: { cart_id: "cart_a" }, queryConfig: { fields: [] } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    expect(req.queryConfig.fields).toEqual(expect.arrayContaining(["type.id", "type.label", "type.description", "type.code"]))
    expect(req.queryConfig.fields.some((field: string) => field.startsWith("shipping_option_type."))).toBe(false)
    expect(req.query.cart_id).toBe("cart_a")
  })
  it.each(["carts.email", "cart_items.cart.email", "products.sales_channels.carts.shipping_address.*"])("globally strips %s on other Store graph endpoints", async fields => {
    const result = await prepareListQuery({ fields }, { restricted: STORE_RESTRICTED_FIELDS })
    expect(result.remoteQueryConfig.fields).toEqual(["id"])
  })
  it("never lets direct +cart or *customer expansions through the forced projection", async () => {
    for (const fields of ["+cart,*customer", "+customer", "+orders", "*customer,variants"]) {
      const req = { originalUrl: "/store/products", method: "GET", query: { fields } } as any
      forceCatalogFields(req, {} as any, jest.fn())
      const result = await prepareListQuery(
        { fields: req.query.fields, limit: 20, offset: 0 },
        { restricted: STORE_RESTRICTED_FIELDS },
      )
      for (const field of result.remoteQueryConfig.fields) {
        expect(
          field.split(".").some(segment => ["cart", "carts", "cart_items", "customer", "customers", "orders"].includes(segment)),
        ).toBe(false)
      }
    }
  })
  it("preserves public product images, metadata and calculated prices", async () => {
    const req = { originalUrl: "/store/products", allowed: [], query: { fields: "variants.inventory_quantity,+variants.calculated_price,cart_items.cart.email" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = (await prepareListQuery({ fields: req.query.fields }, { ...listProductQueryConfig, allowed: [...listProductQueryConfig.allowed, ...req.allowed] })).remoteQueryConfig.fields
    expect(output).toEqual(expect.arrayContaining(["metadata", "variants.metadata", "variants.images.*", "variants.thumbnail", "variants.calculated_price.*", "variants.inventory_quantity"]))
    expect(req.allowed).toEqual(["variants.metadata"])
    expect(output.some(field => field.includes("cart") || field.includes("customer"))).toBe(false)
  })
  it("retains the fixed product projection through both native query validation passes", async () => {
    const req = { originalUrl: "/store/products", allowed: [], storeRelationsLimit: 4, query: { fields: "variants.calculated_price,cart_items.cart.email" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const middleware = validateAndTransformQuery(StoreGetProductsParams, listProductQueryConfig)
    for (let pass = 0; pass < 2; pass++) {
      const next = jest.fn()
      await middleware(req, {} as any, next)
      expect(next).toHaveBeenCalledWith()
      expect(req.queryConfig.fields).toEqual(expect.arrayContaining(["metadata", "variants.metadata", "variants.images.*", "variants.calculated_price.*", "images.*"]))
      expect(req.queryConfig.fields.some((field: string) => /(^|\.)(cart|carts|customers|cart_items)(\.|$)/.test(field))).toBe(false)
      expect(req.allowed).toEqual([])
    }
  })
  it("retains safe order line fields with the native order-list allowlist", async () => {
    const req = { originalUrl: "/store/orders", allowed: [], query: { fields: "items.variant.product.cart_items.cart.email,customer.addresses.*" } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = (await prepareListQuery(req.query, { ...orderQueryConfig, allowed: [...orderQueryConfig.allowed, ...req.allowed] })).remoteQueryConfig.fields
    expect(output).toEqual(expect.arrayContaining(SAFE_ORDER_FIELDS))
    expect(req.allowed).toEqual(SAFE_ORDER_FIELDS.filter(field => field.startsWith("items.")))
    expect(output.some(field => /(^|\.)(customer|customers|cart|carts|cart_items)(\.|$)/.test(field))).toBe(false)
  })
  it.each(["products", "product-variants"])("does not add a price-context requirement to default %s requests", async resource => {
    const req = { originalUrl: `/store/${resource}`, query: {} } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = (await prepareListQuery({ fields: req.query.fields })).remoteQueryConfig.fields
    expect(output.some(field => field.includes("calculated_price"))).toBe(false)
  })
  it.each(["POST", "DELETE"])("keeps native customer output for address %s using its actual allowed-fields parser", async method => {
    const req = { originalUrl: "/store/customers/me/addresses/addr_a", method, query: { fields: "customer.groups.customers.*" }, queryConfig: { fields: [] } } as any
    forceCatalogFields(req, {} as any, jest.fn())
    const output = (await prepareRetrieveQuery(req.query, customerQueryConfig)).remoteQueryConfig.fields
    expect(output).toContain("addresses.*")
    expect(output).not.toContain("address_1")
  })
})

describe("public catalog metadata projection", () => {
  it("keeps only storefront-consumed product and variant metadata keys", () => {
    const body = {
      products: [{
        metadata: { story_sections: [{ id: "s1", title: "Story" }], rating: 4.9, reviews_verified: true, engraveable: true, movement: "Miyota 9039 automatic", water_resistance: "10 ATM", warranty: "2-year international warranty", internal_cost: 42, supplier_contact: "secret@vendor.test" },
        variants: [{ metadata: { images: [{ url: "https://cdn.test/a.jpg" }], internal_cost: 7 } }],
      }],
    }
    projectCatalogMetadata(body)
    expect(body.products[0].metadata).toEqual({ story_sections: [{ id: "s1", title: "Story" }], rating: 4.9, reviews_verified: true, engraveable: true, movement: "Miyota 9039 automatic", water_resistance: "10 ATM", warranty: "2-year international warranty" })
    expect(body.products[0].variants[0].metadata).toEqual({ images: [{ url: "https://cdn.test/a.jpg" }] })
  })
  it("projects single-product and product-variant list responses", () => {
    const single = { product: { metadata: { internal_note: "cost price" } } }
    projectCatalogMetadata(single)
    expect(single.product.metadata).toBeUndefined()
    const variants = { product_variants: [{ metadata: { images: [{ url: "https://cdn.test/b.png" }], note: "hidden" } }] }
    projectCatalogMetadata(variants)
    expect(variants.product_variants[0].metadata).toEqual({ images: [{ url: "https://cdn.test/b.png" }] })
  })
  it("drops metadata entirely when no public key is present", () => {
    const body = { product: { metadata: { internal_margin: 0.4 } } }
    projectCatalogMetadata(body)
    expect(body.product.metadata).toBeUndefined()
    expect(publicCatalogMetadata("not-an-object", PUBLIC_STORE_METADATA_KEYS)).toBeUndefined()
  })
  it("keeps only public store metadata keys", () => {
    expect(publicCatalogMetadata({ announcement_bar: { enabled: true, message: "New" }, orders_open: true, internal_notes: "secret" }, PUBLIC_STORE_METADATA_KEYS)).toEqual({ announcement_bar: { enabled: true, message: "New" }, orders_open: true })
  })
  it("applies the projection through the catalog middleware response hook", () => {
    const req = { originalUrl: "/store/products", method: "GET", query: {} } as any
    const sent: any[] = []
    const res = { json: function (this: any, body: any) { sent.push(body) } } as any
    forceCatalogFields(req, res, jest.fn())
    res.json({ products: [{ metadata: { story_sections: "x", hidden: "y" } }] })
    expect(sent[0].products[0].metadata).toEqual({ story_sections: "x" })
  })
})
