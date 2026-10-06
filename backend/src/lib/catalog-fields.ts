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
import { SAFE_ORDER_FIELDS } from "./cart-fields"

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
  "shipping-options": [...defaultStoreShippingOptionsFields, "shipping_option_type.*"],
  "payment-providers": ["id", "is_enabled"],
  "return-reasons": defaultStoreRetrieveReturnReasonFields,
  currencies: defaultStoreCurrencyFields,
  locales: ["code", "name"],
  orders: [...defaultStoreOrderFields, ...SAFE_ORDER_FIELDS],
  customers: customerQueryConfig.defaults,
}

/** Public catalog resources have reverse links to carts, customers and fulfillment addresses. */
export function forceCatalogFields(req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) {
  const pathname = req.originalUrl?.split("?")[0] || req.path || ""
  const resource = pathname.match(/^\/store\/([^/]+)/i)?.[1].toLowerCase()
  const defaults = resource === "customers" && req.method === "GET" && /\/addresses(?:\/|$)/i.test(pathname) ? defaultStoreCustomerAddressFields : resource && policies[resource]
  if (!defaults) return next()
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
