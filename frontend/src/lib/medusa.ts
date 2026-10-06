import Medusa from "@medusajs/js-sdk";
import type { StoreCart, StoreProduct } from "@/lib/types";

// Initialize Medusa client
const MEDUSA_BACKEND_URL = typeof window === "undefined"
  ? process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030"
  : `${window.location.origin}/api/medusa`;
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SALES_CHANNEL_ID = process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID || "";

const PRODUCT_BASE_FIELDS =
  "id,title,handle,subtitle,description,thumbnail,created_at,updated_at";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: false,
  auth: { type: "session", fetchCredentials: "same-origin", jwtTokenStorageMethod: "nostore" },
  publishableKey: PUBLISHABLE_API_KEY,
});

function getErrorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? error.status
    : undefined;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

// Store helper - get store info including metadata
export async function getStore() {
  try {
    // Use custom endpoint for store info
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/store-info`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      cache: "no-store",
    });

    if (!response.ok) {

      return null;
    }

    const data = await response.json();

    return data.store || null;
  } catch {

    return null;
  }
}

// Region helper - get default region
export async function getRegion(countryCode: string = "gb") {
  try {
    const { regions } = await sdk.store.region.list();

    // Find region by country code
    const region = regions?.find((r) =>
      r.countries?.some((c) => c.iso_2?.toLowerCase() === countryCode.toLowerCase())
    );

    return region || regions?.[0];
  } catch {

    return null;
  }
}

// Products
export async function getProducts(regionId?: string, limit: number = 100) {
  try {
    const { products, count } = await sdk.store.product.list({
      limit,
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      fields: `${PRODUCT_BASE_FIELDS},*variants.calculated_price,*variants.inventory_quantity,*categories,*images,*tags,*metadata,*collection`,
    });
    return { products, count };
  } catch {

    return { products: [], count: 0 };
  }
}

export async function getProductsByIds(ids: string[], regionId?: string) {
  try {
    if (!ids || ids.length === 0) return [];

    const { products } = await sdk.store.product.list({
      id: ids,
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      fields: `${PRODUCT_BASE_FIELDS},*images`,
      limit: ids.length,
    });
    return products || [];
  } catch {

    return [];
  }
}

// Fetch products with full variant image data (for cart variant image resolution)
export async function getProductsWithVariantImages(ids: string[], regionId?: string) {
  try {
    if (!ids || ids.length === 0) return [];

    const { products } = await sdk.store.product.list({
      id: ids,
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      // Match product detail page pattern: include variant images and thumbnails
      fields: `${PRODUCT_BASE_FIELDS},*variants,*variants.images,*variants.thumbnail,*images`,
      limit: ids.length,
    });
    return products || [];
  } catch {

    return [];
  }
}

export async function getProductByHandle(handle: string, regionId?: string) {
  try {
    const { products } = await sdk.store.product.list({
      handle,
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      // Include *variants.images to get variant-specific images for gallery switching
      // Include inventory_quantity to check stock availability
      fields: `${PRODUCT_BASE_FIELDS},*variants,*variants.calculated_price,*variants.options,*variants.images,*variants.thumbnail,*variants.inventory_quantity,*variants.metadata,*images,*categories,*tags,*metadata`,
    });
    return products?.[0] || null;
  } catch {

    return null;
  }
}

export async function getProductById(id: string, regionId?: string) {
  try {
    const { product } = await sdk.store.product.retrieve(id, {
      region_id: regionId,
      // Include *variants.images to get variant-specific images
      fields: `${PRODUCT_BASE_FIELDS},*variants.calculated_price,*variants.options,*variants.images,*variants.inventory_quantity,*variants.metadata,*images,*categories,*tags,*metadata`,
    });
    return product;
  } catch {

    return null;
  }
}

// Product Categories
export async function getCategories() {
  try {
    const { product_categories } = await sdk.store.category.list({
      include_descendants_tree: true,
    });
    return product_categories || [];
  } catch {

    return [];
  }
}

export async function getProductsByCategory(categoryId: string, regionId?: string) {
  try {
    const { products } = await sdk.store.product.list({
      category_id: [categoryId],
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      fields: `${PRODUCT_BASE_FIELDS},*variants.calculated_price,*variants.inventory_quantity,*images,*categories`,
    });
    return products || [];
  } catch {

    return [];
  }
}

// Collections
export async function getCollections() {
  try {
    const { collections } = await sdk.store.collection.list();
    return collections || [];
  } catch {

    return [];
  }
}

export async function getProductsByCollection(collectionId: string, regionId?: string) {
  try {
    const { products } = await sdk.store.product.list({
      collection_id: [collectionId],
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      fields: `${PRODUCT_BASE_FIELDS},*variants.calculated_price,*variants.inventory_quantity,*images,*categories`,
    });
    return products || [];
  } catch {

    return [];
  }
}

// Cart Operations

export async function createCart(regionId: string) {
  try {
    const { cart } = await sdk.store.cart.create({
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
    });
    return cart;
  } catch {

    return null;
  }
}

export async function getCart(cartId: string) {
  try {
    // Retrieve cart with standard fields
    const { cart } = await sdk.store.cart.retrieve(cartId, {
      fields: "+items,+items.variant,+items.variant.product,+items.adjustments,+promotions,+region,+total,+subtotal,+item_subtotal,+discount_total,+tax_total,+shipping_total,+item_tax_total,+shipping_methods",
    });

    return cart;
  } catch (error: unknown) {
    // If cart doesn't exist (404) or is invalid (400), return null instead of throwing
    const status = getErrorStatus(error);
    const message = getErrorMessage(error);
    if (
      status === 404 || status === 401 || status === 403 ||
      status === 400 ||
      message.includes("not found") ||
      message.includes("Bad Request")
    ) {

      return null;
    }
    // For other errors (500, network, etc.), rethrow so we don't accidentally clear the cart ID

    throw error;
  }
}

export async function addToCart(cartId: string, variantId: string, quantity: number = 1) {
  try {
    const { cart } = await sdk.store.cart.createLineItem(cartId, {
      variant_id: variantId,
      quantity,
    });
    return cart;
  } catch (error) {

    throw error; // Throw error so UI can handle it
  }
}

export async function updateCartItem(cartId: string, lineItemId: string, quantity: number) {
  try {
    const { cart } = await sdk.store.cart.updateLineItem(cartId, lineItemId, {
      quantity,
    });
    return cart;
  } catch (error) {

    throw error;
  }
}

export async function removeFromCart(cartId: string, lineItemId: string) {
  try {
    // Medusa v2 deleteLineItem returns { deleted: true, id, object, parent: cart }
    const response = (await sdk.store.cart.deleteLineItem(
      cartId,
      lineItemId
    )) as { parent?: StoreCart; cart?: StoreCart };

    // Handle both possible response formats:
    // - Medusa v2 format: { deleted: true, parent: cart }
    // - Alternative format: { cart }
    const cart = response.parent || response.cart || null;
    return cart;
  } catch (error) {

    throw error;
  }
}

// Promotion Code Operations
export async function applyPromoCode(cartId: string, code: string) {
  try {

    const url = `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`;
    const payload = { promo_codes: [code] };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(response.status === 400 ? "The promo code is invalid or unavailable." : "Unable to apply promo code. Please try again.");
    }

    // After applying promo code, fetches full cart with all fields
    const fullCart = await getCart(cartId);

    return fullCart;
  } catch (error) {

    throw error;
  }
}

export async function removePromoCode(cartId: string, code: string) {
  try {

    const url = `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`;
    const payload = { promo_codes: [code] };

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Unable to remove promo code. Please try again.");
    }

    // Fetch cart AFTER removal to get updated state
    const fullCart = await getCart(cartId);

    return fullCart;
  } catch (error) {

    throw error;
  }
}

// Customer Auth
export async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error("Invalid email or password.");
  return true;
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const response = await fetch("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
  });
  if (!response.ok) throw new Error("Unable to create account. Please sign in or try again.");
  const customer = await getCustomer();
  if (!customer) throw new Error("Unable to load your account.");
  return { customer };
}

export async function logout() {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) throw new Error("Unable to sign out. Please try again.");
}

export async function getCustomer() {
  try {
    const { customer } = await sdk.store.customer.retrieve();
    return customer;
  } catch {

    return null;
  }
}

// Customer Orders
export async function getCustomerOrders() {
  try {
    const { orders } = await sdk.store.order.list({
      fields: "*items,*items.variant,*items.variant.product,*shipping_address",
    });
    return orders || [];
  } catch {

    return [];
  }
}

// Customer Addresses
export async function getCustomerAddresses() {
  try {
    const { addresses } = await sdk.store.customer.listAddress();
    return addresses || [];
  } catch {

    return [];
  }
}

export async function createCustomerAddress(addressData: {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
  is_default_shipping?: boolean;
}) {
  try {
    const { customer } = await sdk.store.customer.createAddress(addressData);
    return customer;
  } catch (error) {

    throw error;
  }
}

export async function updateCustomerAddress(
  addressId: string,
  addressData: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
    is_default_shipping?: boolean;
  }
) {
  try {
    const { customer } = await sdk.store.customer.updateAddress(addressId, addressData);
    return customer;
  } catch (error) {

    throw error;
  }
}

export async function deleteCustomerAddress(addressId: string) {
  try {
    await sdk.store.customer.deleteAddress(addressId);
    return true;
  } catch (error) {

    throw error;
  }
}

// Update customer profile
export async function updateCustomerProfile(data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { customer } = await sdk.store.customer.update(data);
    return customer;
  } catch (error) {

    throw error;
  }
}

export async function updateCustomerMetadata(metadata: Record<string, unknown>) {
  try {
    const { customer } = await sdk.store.customer.update({ metadata });
    return customer;
  } catch (error) {

    throw error;
  }
}

export async function updateCartOwnership(cartId: string) {
  try {

    // Medusa v2: POST /store/carts/:id/customer to assign to logged-in user
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/customer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.message || "Failed to update cart ownership");
    }

    const { cart } = await response.json();
    return cart;
  } catch (error) {

    throw error;
  }
}

// Search
export async function searchProducts(query: string, regionId?: string) {
  try {
    const { products } = await sdk.store.product.list({
      q: query,
      region_id: regionId,
      sales_channel_id: SALES_CHANNEL_ID || undefined,
      fields: `${PRODUCT_BASE_FIELDS},*variants.calculated_price,*variants.inventory_quantity,*images,*categories`,
    });
    return products || [];
  } catch {

    return [];
  }
}

// Format price helper
export function formatPrice(amount: number | null | undefined, currencyCode: string = "GBP") {
  if (amount === null || amount === undefined) return "N/A";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode,
  }).format(amount / 100); // Medusa stores prices in cents
}

// Stripe Payment Functions

export async function createAndSelectStripePaymentSession(cartId: string) {
  try {

    const response = await fetch(`/api/checkout/${cartId}/payment-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider_id: "pp_stripe_stripe",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.message || "Failed to create payment session");
    }

    const data = await response.json();

    return data.cart;
  } catch (error) {

    throw error;
  }
}
export async function selectStripePaymentSession(cartId: string) {
  try {

    const response = await fetch(`/api/checkout/${cartId}/payment-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        provider_id: "pp_stripe_stripe",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();

      throw new Error(errorData.message || "Failed to select payment session");
    }

    const data = await response.json();

    return data.cart;
  } catch (error) {

    throw error;
  }
}

// Shipping Operations
export async function getShippingOptions(cartId: string) {
  try {
    const { shipping_options } = await sdk.store.fulfillment.listCartOptions({
      cart_id: cartId,
    });
    return shipping_options || [];
  } catch {

    return [];
  }
}

export async function addShippingMethod(cartId: string, optionId: string) {
  try {
    const { cart } = await sdk.store.cart.addShippingMethod(cartId, {
      option_id: optionId,
    });
    return cart;
  } catch (error) {

    throw error;
  }
}

// Helper to get price
export const getProductPrice = (product: Pick<StoreProduct, "variants">) => {
  const price = product.variants?.[0]?.calculated_price?.calculated_amount;
  return price ? price / 100 : 0;
};

// Helper to get image
export const getProductImage = (product: Pick<StoreProduct, "thumbnail" | "images">) => {
  return product.thumbnail || product.images?.[0]?.url || "";
};

export default sdk;
