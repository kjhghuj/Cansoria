import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { DEFAULT_STORE_RESTRICTED_FIELDS } from "@medusajs/framework/utils"
import { defaultStoreProductFields } from "@medusajs/medusa/api/store/products/query-config"
import { defaultStoreProductVariantFields } from "@medusajs/medusa/api/store/product-variants/query-config"
import { defaultStoreRegionFields } from "@medusajs/medusa/api/store/regions/query-config"
import { defaultStoreCollectionFields } from "@medusajs/medusa/api/store/collections/query-config"
import { defaults as categoryFields } from "@medusajs/medusa/api/store/product-categories/query-config"
import { defaults as typeFields } from "@medusajs/medusa/api/store/product-types/query-config"
import { defaults as tagFields } from "@medusajs/medusa/api/store/product-tags/query-config"
import { defaultStoreShippingOptionsFields } from "@medusajs/medusa/api/store/shipping-options/query-config"
import { defaultStoreCurrencyFields } from "@medusajs/medusa/api/store/currencies/query-config"
import { defaultStoreRetrieveReturnReasonFields } from "@medusajs/medusa/api/store/return-reasons/query-config"
import { retrieveTransformQueryConfig as customerQueryConfig, defaultStoreCustomerAddressFields } from "@medusajs/medusa/api/store/customers/query-config"
import { defaultStoreOrderFields } from "@medusajs/medusa/api/store/orders/query-config"
import { SAFE_ORDER_FIELDS, projectOrderMetadata } from "./cart-fields"

export const PROJECTED_STORE_RESOURCES = ["products", "product-variants", "product-types", "product-tags", "regions", "collections", "product-categories", "shipping-options", "payment-providers", "return-reasons", "currencies", "locales", "orders", "customers"]

export const STORE_RESTRICTED_FIELDS = Array.from(new Set([...DEFAULT_STORE_RESTRICTED_FIELDS, "cart", "carts", "cart_items"]))

const policies: Record<string, string[]> = {
  products: [...defaultStoreProductFields, "metadata", "categories.*", "variants.metadata", "variants.thumbnail", "variants.images.*"],
  "product-variants": defaultStoreProductVariantFields,
  regions: defaultStoreRegionFields,
  collections: defaultStoreCollectionFields,
  "product-categories": categoryFields,
  "product-types": typeFields.filter(field => field !== "*products"),
  "product-tags": tagFields.filter(field => field !== "*products"),
  "shipping-options": [...defaultStoreShippingOptionsFields, "type.id", "type.label", "type.description", "type.code"],
  "payment-providers": ["id", "is_enabled"],
  "return-reasons": defaultStoreRetrieveReturnReasonFields,
  currencies: defaultStoreCurrencyFields,
  locales: ["code", "name"],
  orders: [...defaultStoreOrderFields.filter(field => field !== "metadata"), ...SAFE_ORDER_FIELDS],
  customers: customerQueryConfig.defaults,
}

/** Public catalog resources have reverse links to carts, customers and fulfillment addresses. */
export function forceCatalogFields(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const pathname = req.originalUrl?.split("?")[0] || req.path || ""
  const resource = pathname.match(/^\/store\/([^/]+)/i)?.[1].toLowerCase()
  const defaults = resource === "customers" && req.method === "GET" && /\/addresses(?:\/|$)/i.test(pathname) ? defaultStoreCustomerAddressFields : resource && policies[resource]
  if (!defaults) return next()
  // Medusa 2.21 uses an explicit Store allowlist. Only this public catalog
  // field is missing from its native policy; client fields never extend it.
  if (resource === "products") req.allowed = Array.from(new Set([...(req.allowed || []), "variants.metadata"]))
  if (resource === "orders") req.allowed = Array.from(new Set([...(req.allowed || []), ...SAFE_ORDER_FIELDS.filter(field => field.startsWith("items."))]))
  if ((resource === "products" || resource === "product-variants") && typeof _res.json === "function") {
    const original = _res.json
    _res.json = function (body: any) { projectCatalogMetadata(body); return original.call(this, body) } as any
  }
  if (resource === "orders" && typeof _res.json === "function") {
    const original = _res.json
    _res.json = function (body: any) { projectOrderMetadata(body); return original.call(this, body) } as any
  }
  const fields = [...defaults]
  // Inventory availability is a supported public addon; arbitrary neighboring inventory relations are not.
  const requested = typeof req.query?.fields === "string" ? req.query.fields : ""
  const requestedFields = requested.split(",").map(field => field.replace(/^[+* ]/, ""))
  if (resource === "products" && requestedFields.includes("variants.inventory_quantity")) fields.push("variants.inventory_quantity")
  if (resource === "products" && requestedFields.some(field => /^variants\.calculated_price(?:\.\*|\.[a-z_]+)?$/.test(field))) fields.push("variants.calculated_price.*")
  if (resource === "product-variants" && requestedFields.some(field => /^calculated_price(?:\.\*|\.[a-z_]+)?$/.test(field))) fields.push("calculated_price.*")
  req.query = { ...req.query, fields: fields.join(",") } as any
  if (req.queryConfig) req.queryConfig.fields = fields.map(field => field.startsWith("*") ? `${field.slice(1)}.*` : field)
  return next()
}

// Admin-written catalog metadata is not public by default. Only these keys are
// consumed by the storefront; anything else (internal notes, costs, source
// links) must stay behind the admin API.
export const PUBLIC_PRODUCT_METADATA_KEYS = ["story_sections", "rating", "average_rating", "review_rating", "reviews", "rating_count", "review_count", "reviews_verified"]
export const PUBLIC_VARIANT_METADATA_KEYS = ["images"]
export const PUBLIC_STORE_METADATA_KEYS = ["announcement_bar", "orders_open"]

export function publicCatalogMetadata(metadata: unknown, allowedKeys: readonly string[]): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined
  const source = metadata as Record<string, unknown>
  const projected: Record<string, unknown> = {}
  for (const key of allowedKeys) if (key in source) projected[key] = source[key]
  return Object.keys(projected).length ? projected : undefined
}

/** Strips store responses ({ product, products, product_variants }) down to the public metadata keys. */
export function projectCatalogMetadata(body: unknown): void {
  if (!body || typeof body !== "object") return
  const container = body as { product?: unknown; products?: unknown; product_variants?: unknown }
  const products = Array.isArray(container.products) ? container.products : container.product ? [container.product] : []
  for (const entry of products as Record<string, unknown>[]) {
    if (!entry || typeof entry !== "object") continue
    if ("metadata" in entry) entry.metadata = publicCatalogMetadata(entry.metadata, PUBLIC_PRODUCT_METADATA_KEYS)
    const variants = Array.isArray(entry.variants) ? entry.variants : []
    for (const variant of variants as Record<string, unknown>[]) {
      if (variant && typeof variant === "object" && "metadata" in variant) variant.metadata = publicCatalogMetadata(variant.metadata, PUBLIC_VARIANT_METADATA_KEYS)
    }
  }
  for (const variant of (Array.isArray(container.product_variants) ? container.product_variants : []) as Record<string, unknown>[]) {
    if (variant && typeof variant === "object" && "metadata" in variant) variant.metadata = publicCatalogMetadata(variant.metadata, PUBLIC_VARIANT_METADATA_KEYS)
  }
}
