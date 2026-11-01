/**
 * Medusa → LORENCESS storefront catalogue adapter. Server-side only: the
 * `server-only` package is not installed, so this file must never be imported
 * from client components. All functions call the Medusa backend directly
 * (MEDUSA_BACKEND_URL); browser traffic still goes through /api/medusa/....
 *
 * Unlike the legacy helpers in medusa.ts, the fetchers here never swallow
 * backend failures: an outage throws MedusaUnavailableError so callers can
 * render an explicit unavailable state instead of an empty catalogue.
 */
import {
  MedusaUnavailableError,
  formatPrice,
  getProductByHandle,
  sdk,
} from "./medusa";
import { REGION_LOOKUP_TIMEOUT_MS, withMedusaTimeout } from "./with-timeout";
import type { StoreProduct } from "./types";
import type { FlImage, FlOption, FlProduct } from "./florencess-catalog";
import type { FlVariant } from "./florencess-variants";
import { resolveFlSlug, type FlResolvedRoute } from "./florencess-routes";

const CATEGORY_FIELDS = "id,name,handle,description,parent_category_id";
const LIST_PAGE_SIZE = 100;
const LIST_MAX_PAGES = 10;

export type MedusaCategoryRef = {
  id: string;
  name: string;
  handle: string;
  description?: string | null;
  parent_category_id?: string | null;
};

/** Remove markup and collapse whitespace; truncation belongs to callers. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function variantSoldOut(variant: NonNullable<StoreProduct["variants"]>[number]): boolean {
  return variant.manage_inventory === true && (variant.inventory_quantity ?? 0) <= 0;
}

/**
 * The variant with the lowest calculated price in the requested currency.
 * Currency comparison is skipped when the caller has none (tests, uncached
 * listings) so an outage of the pricing context cannot hide real prices.
 */
function lowestPricedVariant(
  product: StoreProduct,
  currencyCode?: string,
): { amount: number; original?: number } | null {
  let best: { amount: number; original?: number } | null = null;
    for (const variant of product.variants ?? []) {
    const price = variant.calculated_price;
    const amount = price?.calculated_amount;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) continue;
    if (
      currencyCode &&
      price?.currency_code &&
      price.currency_code.toLowerCase() !== currencyCode.toLowerCase()
    ) {
      continue;
    }
    const original = price?.original_amount;
    const candidate = {
      amount,
      original:
        typeof original === "number" && Number.isFinite(original) && original > amount
          ? original
          : undefined,
    };
    if (!best || candidate.amount < best.amount) best = candidate;
  }
  return best;
}

/** Currency observed on the product's calculated prices, with a stable fallback. */
export function medusaProductCurrency(product: StoreProduct): string {
  for (const variant of product.variants ?? []) {
    const code = variant.calculated_price?.currency_code;
    if (typeof code === "string" && code.length >= 3) return code.toLowerCase();
  }
  return "usd";
}

export function mapMedusaProduct(
  product: StoreProduct,
  currencyCode: string,
): FlProduct {
  const priced = lowestPricedVariant(product, currencyCode);
  const firstSku =
    product.variants?.find((variant) => typeof variant.sku === "string" && variant.sku)
      ?.sku ?? "";
  const brandValue = (product.metadata as { brand?: unknown } | null)?.brand;
  const images: FlImage[] = [...(product.images ?? [])]
    .sort((left, right) => (left.rank ?? 0) - (right.rank ?? 0))
    .map((image) => ({ src: image.url, alt: product.title }));
  if (!images.length && product.thumbnail) {
    images.push({ src: product.thumbnail, alt: product.title });
  }
  const hasPurchasableVariant = (product.variants ?? []).some(
    (variant) => !variantSoldOut(variant),
  );

  return {
    id: `medusa:${product.id}`,
    slug: product.handle ?? "",
    title: product.title,
    model: firstSku,
    brand: typeof brandValue === "string" ? brandValue : "",
    description: stripHtml(product.description ?? ""),
    price: priced ? formatPrice(priced.amount, currencyCode) : "",
    oldPrice: priced?.original !== undefined ? formatPrice(priced.original, currencyCode) : "",
    discount: priced?.original !== undefined
      ? `-${Math.round((1 - priced.amount / priced.original) * 100)}%`
      : "",
    currency: currencyCode.toUpperCase(),
    availability: hasPurchasableVariant ? "InStock" : "SoldOut",
    options: (product.options ?? []).map<FlOption>((option) => {
      const seen = new Set<string>();
      const values: FlOption["values"] = [];
      for (const value of option.values ?? []) {
        if (typeof value?.value !== "string" || seen.has(value.value)) continue;
        seen.add(value.value);
        values.push({ value: value.value, label: value.value });
      }
      return { id: option.id, name: option.title, values };
    }),
    localImages: images,
    pageCaptured: true,
  };
}

/**
 * Purchasable variants of a product as selection records keyed by option
 * name. Managed variants without stock are dropped so the purchase flow never
 * offers a combination the backend would reject.
 */
export function mapMedusaVariants(product: StoreProduct): FlVariant[] {
  const optionNameById = new Map<string, string>();
  for (const option of product.options ?? []) {
    optionNameById.set(option.id, option.title);
  }
  const variants: FlVariant[] = [];
  for (const variant of product.variants ?? []) {
    if (!variant.id?.startsWith("variant_") || variantSoldOut(variant)) continue;
    const selection: Record<string, string> = {};
    let complete = true;
    for (const entry of variant.options ?? []) {
      const name =
        (entry as { option?: { title?: string } }).option?.title ??
        (entry.option_id ? optionNameById.get(entry.option_id) : undefined);
      if (!name || typeof entry.value !== "string") {
        complete = false;
        break;
      }
      selection[name] = entry.value;
    }
    if (complete && Object.keys(selection).length > 0) {
      variants.push({ id: variant.id, selection });
    }
  }
  return variants;
}

export type MedusaProductDetail = {
  product: FlProduct;
  variants: FlVariant[];
};

export async function getMedusaProductBySlug(
  slug: string,
  regionId?: string,
): Promise<MedusaProductDetail | null> {
  const product = await withMedusaTimeout(
    getProductByHandle(slug, regionId),
    REGION_LOOKUP_TIMEOUT_MS,
    "product lookup",
  );
  if (!product) return null;
  return {
    product: mapMedusaProduct(product, medusaProductCurrency(product)),
    variants: mapMedusaVariants(product),
  };
}

export async function getMedusaCategoryBySlug(
  slug: string,
): Promise<MedusaCategoryRef | null> {
  try {
    const { product_categories } = await withMedusaTimeout(
      sdk.store.category.list({
        handle: slug,
        fields: CATEGORY_FIELDS,
      }),
      REGION_LOOKUP_TIMEOUT_MS,
      "category lookup",
    );
    return product_categories?.[0] ?? null;
  } catch (error) {
    console.error("[medusa-catalog] category lookup failed", { slug });
    throw error instanceof MedusaUnavailableError
      ? error
      : new MedusaUnavailableError();
  }
}

/** All published products of one category, paged to completion (capped at 1000). */
export async function listMedusaCategoryProducts(
  categoryId: string,
  regionId?: string,
): Promise<StoreProduct[]> {
  const collected: StoreProduct[] = [];
  try {
    for (let page = 0; page < LIST_MAX_PAGES; page += 1) {
      const { products } = await withMedusaTimeout(
        sdk.store.product.list({
          category_id: [categoryId],
          region_id: regionId,
          limit: LIST_PAGE_SIZE,
          offset: page * LIST_PAGE_SIZE,
          fields:
            "id,title,handle,description,thumbnail,*variants.calculated_price,*variants.inventory_quantity,*variants.manage_inventory,*variants.sku,*variants.options,*options,*images,*metadata",
        }),
        REGION_LOOKUP_TIMEOUT_MS,
        "category listing",
      );
      collected.push(...(products ?? []));
      if (!products || products.length < LIST_PAGE_SIZE) return collected;
    }
    console.error("[medusa-catalog] category listing truncated", { categoryId });
    return collected;
  } catch (error) {
    console.error("[medusa-catalog] category listing failed", { categoryId });
    throw error instanceof MedusaUnavailableError
      ? error
      : new MedusaUnavailableError();
  }
}

export type StorefrontSlug =
  | { kind: "local"; route: FlResolvedRoute }
  | { kind: "medusa-product"; product: FlProduct; variants: FlVariant[] }
  | { kind: "medusa-category"; category: MedusaCategoryRef }
  | null;

export type StorefrontSlugDeps = {
  resolveLocal: typeof resolveFlSlug;
  fetchMedusaProduct: typeof getMedusaProductBySlug;
  fetchMedusaCategory: typeof getMedusaCategoryBySlug;
};

const defaultDeps: StorefrontSlugDeps = {
  resolveLocal: resolveFlSlug,
  fetchMedusaProduct: getMedusaProductBySlug,
  fetchMedusaCategory: getMedusaCategoryBySlug,
};

/**
 * Resolution order for /:slug — local catalogue first (categories, products,
 * articles, brands), then Medusa products, then Medusa categories, else null
 * (caller renders 404). MedusaUnavailableError propagates so the caller can
 * render the unavailable state instead of a wrong 404.
 */
export async function resolveStorefrontSlug(
  slug: string,
  regionId: string | undefined,
  deps: Partial<StorefrontSlugDeps> = {},
): Promise<StorefrontSlug> {
  const { resolveLocal, fetchMedusaProduct, fetchMedusaCategory } = {
    ...defaultDeps,
    ...deps,
  };

  const local = resolveLocal(slug);
  if (local) return { kind: "local", route: local };

  const medusaProduct = await fetchMedusaProduct(slug, regionId);
  if (medusaProduct) {
    return {
      kind: "medusa-product",
      product: medusaProduct.product,
      variants: medusaProduct.variants,
    };
  }

  const medusaCategory = await fetchMedusaCategory(slug);
  if (medusaCategory) return { kind: "medusa-category", category: medusaCategory };

  return null;
}
