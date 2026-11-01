/**
 * Top-level route registry.
 *
 * The storefront serves categories and products from a single dynamic segment
 * (`/[slug]`), so a category or product slug that collides with a real static
 * route would silently shadow that route. This module owns the reserved list
 * and fails loudly at import time when the captured catalogue disagrees with it,
 * instead of weakening the assertion.
 */
import {
  FL_CATALOG,
  FL_CATEGORY_SLUGS,
  FL_PRODUCT_SLUGS,
  getFlCategory,
  getFlProduct,
  type FlCategory,
  type FlProduct,
} from "./florencess-catalog";
import { FL_ARTICLE_SLUGS, FL_BRANDS, getFlBrand, type FlBrand } from "./florencess-content";

/** Every static App Router segment that exists alongside the dynamic one. */
export const FL_RESERVED_ROUTES = [
  "about",
  "about-us",
  "account",
  "api",
  "brands",
  "cart",
  "checkout",
  "components",
  "contact",
  "cookie-policy",
  "faq",
  "gallery",
  "how-it-works",
  "journal",
  "login",
  "order",
  "our-studio",
  "privacy",
  "privacy-policy",
  "product",
  "register",
  "returns",
  "reviews",
  "search",
  "shipping",
  "shipping-policy",
  "shop",
  "special",
  "terms",
  "terms-conditions",
  "wishlist",
] as const;

const reserved = new Set<string>(FL_RESERVED_ROUTES);

export type FlRouteConflict = { slug: string; kind: "category" | "product" | "article" | "brand" };

/** Every collision between the dynamic catalogue and a static route. */
export function flRouteConflicts(): FlRouteConflict[] {
  const conflicts: FlRouteConflict[] = [];
  for (const slug of FL_CATEGORY_SLUGS) {
    if (reserved.has(slug)) conflicts.push({ slug, kind: "category" });
  }
  for (const slug of FL_PRODUCT_SLUGS) {
    if (reserved.has(slug)) conflicts.push({ slug, kind: "product" });
  }
  for (const slug of FL_ARTICLE_SLUGS) {
    if (reserved.has(slug) && !["about-us", "privacy-policy", "terms-conditions", "shipping-policy", "cookie-policy"].includes(slug)) {
      conflicts.push({ slug, kind: "article" });
    }
  }
  for (const brand of FL_BRANDS) {
    if (reserved.has(brand.slug)) conflicts.push({ slug: brand.slug, kind: "brand" });
  }
  const owners = new Map<string, FlRouteConflict["kind"]>();
  const add = (slug: string, kind: FlRouteConflict["kind"]) => {
    if (owners.has(slug)) conflicts.push({ slug, kind });
    else owners.set(slug, kind);
  };
  FL_CATEGORY_SLUGS.forEach((slug) => add(slug, "category"));
  FL_PRODUCT_SLUGS.forEach((slug) => add(slug, "product"));
  FL_ARTICLE_SLUGS.forEach((slug) => add(slug, "article"));
  FL_BRANDS.forEach((brand) => add(brand.slug, "brand"));
  return conflicts;
}

const conflicts = flRouteConflicts();
if (conflicts.length) {
  throw new Error(
    `FL route conflict: ${conflicts.map((entry) => `${entry.kind} "${entry.slug}"`).join(", ")} ` +
      "collides with a static route; rename the static route or the captured slug.",
  );
}

export type FlResolvedRoute =
  | { kind: "category"; category: FlCategory }
  | { kind: "product"; product: FlProduct; category?: FlCategory }
  | { kind: "article"; slug: string }
  | { kind: "brand"; brand: FlBrand }
  | null;

/**
 * Resolve one dynamic segment. Order matters: categories and products are the
 * catalogue, articles are static content, and `brand-*` is the reference's brand
 * landing page pattern.
 */
export function resolveFlSlug(slug: string): FlResolvedRoute {
  const category = getFlCategory(slug);
  if (category) return { kind: "category", category };

  const product = getFlProduct(slug);
  if (product) {
    const primary = FL_CATALOG.categories.find((entry) => entry.productIds.includes(product.id));
    return { kind: "product", product, category: primary };
  }

  if (FL_ARTICLE_SLUGS.includes(slug)) return { kind: "article", slug };

  const brand = getFlBrand(slug);
  if (brand) return { kind: "brand", brand };

  return null;
}
