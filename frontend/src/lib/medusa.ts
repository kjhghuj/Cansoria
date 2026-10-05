import Medusa from "@medusajs/js-sdk";
import type { StoreCart, StoreProduct } from "@/lib/types";

// Initialize Medusa client
const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030";
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SALES_CHANNEL_ID = process.env.NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID || "";

const PRODUCT_BASE_FIELDS =
  "id,title,handle,subtitle,description,thumbnail,created_at,updated_at";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
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
      console.error("[getStore] Response not OK:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    console.log("[getStore] Success, store data:", data);
    return data.store || null;
  } catch (error) {
    console.error("[getStore] Error fetching store:", error);
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
  } catch (error) {
    console.error("Error fetching region:", error);
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
  } catch (error) {
    console.error("Error fetching products:", error);
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
  } catch (error) {
    console.error("Error fetching products by IDs:", error);
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
  } catch (error) {
    console.error("Error fetching products with variant images:", error);
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
  } catch (error) {
    console.error("Error fetching product:", error);
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
  } catch (error) {
    console.error("Error fetching product by ID:", error);
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
  } catch (error) {
    console.error("Error fetching categories:", error);
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
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

// Collections
export async function getCollections() {
  try {
    const { collections } = await sdk.store.collection.list();
    return collections || [];
  } catch (error) {
    console.error("Error fetching collections:", error);
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
  } catch (error) {
    console.error("Error fetching products by collection:", error);
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
  } catch (error) {
    console.error("Error creating cart:", error);
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
      status === 404 ||
      status === 400 ||
      message.includes("not found") ||
      message.includes("Bad Request")
    ) {
      console.log("[getCart] Cart not found or invalid:", cartId);
      return null;
    }
    // For other errors (500, network, etc.), rethrow so we don't accidentally clear the cart ID
    console.error("[getCart] Error fetching cart (Rethrowing):", error);
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
    console.error("Error adding to cart:", error);
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
    console.error("Error updating cart item:", error);
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
    console.error("Error removing from cart:", error);
    throw error;
  }
}

// Promotion Code Operations
export async function applyPromoCode(cartId: string, code: string) {
  try {
    console.log("[applyPromoCode] ========== START ==========");
    console.log("[applyPromoCode] Cart ID:", cartId, "Code:", code);

    // Get cart state BEFORE applying promo
    const cartBefore = await getCart(cartId);
    console.log("[applyPromoCode] BEFORE - Items:", cartBefore?.items?.length || 0,
      "Item quantities:", cartBefore?.items?.map(i => ({ id: i.id, qty: i.quantity })) || []);
    console.log("[applyPromoCode] BEFORE - Promotions:", cartBefore?.promotions?.length || 0);
    console.log("[applyPromoCode] BEFORE - Total:", cartBefore?.total || 0);

    const url = `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`;
    const payload = { promo_codes: [code] };

    console.log("[applyPromoCode] Sending POST request:", url, payload);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log("[applyPromoCode] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[applyPromoCode] Error response body:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Failed to apply promo code");
      } catch {
        throw new Error(`Failed to apply promo code: ${response.status} ${errorText}`);
      }
    }

    // After applying promo code, fetches full cart with all fields
    const fullCart = await getCart(cartId);
    console.log("[applyPromoCode] AFTER - Items:", fullCart?.items?.length || 0,
      "Item quantities:", fullCart?.items?.map(i => ({ id: i.id, qty: i.quantity })) || []);
    console.log("[applyPromoCode] AFTER - Promotions:", fullCart?.promotions?.length || 0,
      "Codes:", fullCart?.promotions?.map(p => p.code) || []);
    console.log("[applyPromoCode] AFTER - Total:", fullCart?.total || 0);
    console.log("[applyPromoCode] ========== END ==========");
    return fullCart;
  } catch (error) {
    console.error("[applyPromoCode] Exception:", error);
    throw error;
  }
}

export async function removePromoCode(cartId: string, code: string) {
  try {
    console.log("[removePromoCode] ========== START ==========");
    console.log("[removePromoCode] Cart ID:", cartId, "Code:", code);

    const url = `${MEDUSA_BACKEND_URL}/store/carts/${cartId}/promotions`;
    const payload = { promo_codes: [code] };

    console.log("[removePromoCode] Sending DELETE request:", url, payload);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    console.log("[removePromoCode] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[removePromoCode] Error response body:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Failed to remove promo code");
      } catch {
        throw new Error(`Failed to remove promo code: ${response.status} ${errorText}`);
      }
    }

    // Fetch cart AFTER removal to get updated state
    const fullCart = await getCart(cartId);
    console.log("[removePromoCode] AFTER - Items:", fullCart?.items?.length || 0,
      "Promotions:", fullCart?.promotions?.length || 0,
      "Codes:", fullCart?.promotions?.map(p => p.code) || [],
      "Total:", fullCart?.total || 0);
    console.log("[removePromoCode] ========== END ==========");
    return fullCart;
  } catch (error) {
    console.error("[removePromoCode] Exception:", error);
    throw error;
  }
}

// Customer Auth
export async function login(email: string, password: string) {
  try {
    const token = await sdk.auth.login("customer", "emailpass", {
      email,
      password,
    });
    return token;
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  try {
    // First create the auth identity
    const token = await sdk.auth.register("customer", "emailpass", {
      email,
      password,
    });

    // Then create the customer
    const { customer } = await sdk.store.customer.create({
      email,
      first_name: firstName,
      last_name: lastName,
    });

    return { token, customer };
  } catch (error) {
    console.error("Error registering:", error);
    return null;
  }
}

export async function getCustomer() {
  try {
    const { customer } = await sdk.store.customer.retrieve();
    return customer;
  } catch (error) {
    console.error("Error fetching customer:", error);
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
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    return [];
  }
}

// Customer Addresses
export async function getCustomerAddresses() {
  try {
    const { addresses } = await sdk.store.customer.listAddress();
    return addresses || [];
  } catch (error) {
    console.error("Error fetching customer addresses:", error);
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
    console.error("Error creating address:", error);
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
    console.error("Error updating address:", error);
    throw error;
  }
}

export async function deleteCustomerAddress(addressId: string) {
  try {
    await sdk.store.customer.deleteAddress(addressId);
    return true;
  } catch (error) {
    console.error("Error deleting address:", error);
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
    console.error("Error updating customer:", error);
    throw error;
  }
}

export async function updateCustomerMetadata(metadata: Record<string, unknown>) {
  try {
    const { customer } = await sdk.store.customer.update({ metadata });
    return customer;
  } catch (error) {
    console.error("Error updating customer metadata:", error);
    throw error;
  }
}

export async function updateCartOwnership(cartId: string, token: string) {
  try {
    console.log("[updateCartOwnership] Transferring cart", cartId);
    // Medusa v2: POST /store/carts/:id/customer to assign to logged-in user
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/carts/${cartId}/customer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_API_KEY,
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[updateCartOwnership] Error response:", errorData);
      throw new Error(errorData.message || "Failed to update cart ownership");
    }

    const { cart } = await response.json();
    return cart;
  } catch (error) {
    console.error("Error updating cart ownership:", error);
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
  } catch (error) {
    console.error("Error searching products:", error);
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
    console.log("[createAndSelectStripePaymentSession] Creating and selecting payment session for cart:", cartId);

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
      console.error("[createAndSelectStripePaymentSession] Error response:", errorData);
      throw new Error(errorData.message || "Failed to create payment session");
    }

    const data = await response.json();
    console.log("[createAndSelectStripePaymentSession] Success:", data);
    return data.cart;
  } catch (error) {
    console.error("[createAndSelectStripePaymentSession] Error:", error);
    throw error;
  }
}
export async function selectStripePaymentSession(cartId: string) {
  try {
    console.log("[selectStripePaymentSession] Selecting payment session for cart:", cartId);

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
      console.error("[selectStripePaymentSession] Error response:", errorData);
      throw new Error(errorData.message || "Failed to select payment session");
    }

    const data = await response.json();
    console.log("[selectStripePaymentSession] Success, cart:", data.cart?.id);
    return data.cart;
  } catch (error) {
    console.error("[selectStripePaymentSession] Error:", error);
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
  } catch (error) {
    console.error("Error fetching shipping options:", error);
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
    console.error("Error adding shipping method:", error);
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
