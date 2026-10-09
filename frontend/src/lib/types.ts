import type { HttpTypes } from "@medusajs/types";

// Re-export Medusa types for convenience
export type StoreProduct = HttpTypes.StoreProduct;
export type StoreProductVariant = HttpTypes.StoreProductVariant;
export type StoreRegion = HttpTypes.StoreRegion;
export type StoreCollection = HttpTypes.StoreCollection;
export type StoreProductCategory = HttpTypes.StoreProductCategory;
export type StoreCustomer = HttpTypes.StoreCustomer;

// Extended types to include custom fields from API
export interface ExtendedStoreCartLineItem extends HttpTypes.StoreCartLineItem {
  variant_images?: Array<{
    id: string;
    url: string;
    metadata?: Record<string, unknown>;
    rank?: number;
    product_id?: string;
  }>;
  variant_thumbnail?: string | null;
}

export interface StoreCart extends Omit<HttpTypes.StoreCart, 'items'> {
  items?: ExtendedStoreCartLineItem[];
}

export type StoreCartLineItem = ExtendedStoreCartLineItem;

// App-specific types
export interface Article {
  id: number;
  category: string;
  title: string;
  author?: string;
  date?: string;
  excerpt: string;
  image: string;
  readTime: string;
  slug: string;
  content?: Record<string, unknown>[];
  featuredProductId?: string;
  relatedArticleIds?: number[];
}

export interface Testimonial {
  text: string;
  author: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  isThinking?: boolean;
}

export interface USP {
  icon: React.ReactNode;
  text: string;
}

// Cart Context Types
export interface CartContextType {
  cart: StoreCart | null;
  cartLoading: boolean;
  cartCount: number;
  addItem: (variantId: string, quantity?: number, customization?: import("./portrait").PortraitCustomization) => Promise<void>;
  updateItem: (lineItemId: string, quantity: number) => Promise<void>;
  removeItem: (lineItemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  applyPromoCode: (code: string) => Promise<boolean>;
  removePromoCode: (code: string) => Promise<boolean>;
}

// Region Context Types
export interface RegionContextType {
  region: StoreRegion | null;
  regionLoading: boolean;
}
