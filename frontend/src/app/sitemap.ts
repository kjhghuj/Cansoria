import { MetadataRoute } from "next";
import { getProducts, getRegion } from "@/lib/medusa";
import { resolveJournalArticles } from "@/lib/cms";
import { FL_CATALOG } from "@/lib/florencess-catalog";
import { FL_ARTICLE_SLUGS, FL_BRANDS } from "@/lib/florencess-content";
import { flBrandListing } from "@/lib/florencess-brands";

export const revalidate = 3600; // Revalidate sitemap every hour

// Real content revision dates, not build time. Static route copy (home, FAQ,
// journal index, legal and info pages) was last revised with the 2026-10-21
// watch storefront release; update this constant whenever those pages
// meaningfully change.
const STATIC_CONTENT_LAST_MODIFIED = "2026-10-21";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://entntnt.com";
  const region = await getRegion();

  // 1. Static Routes
  const staticRoutes = [
    "",
    "/shop",
    "/journal",
    "/about",
    "/gallery",
    "/how-it-works",
    "/our-studio",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/shipping",
    "/returns",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(STATIC_CONTENT_LAST_MODIFIED),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // 2. Products — an outage must not fail the whole sitemap; the static and
  // journal routes still emit.
  let products: Awaited<ReturnType<typeof getProducts>>["products"] = [];
  try {
    products = (await getProducts(region?.id, 1000)).products;
  } catch {
    products = [];
  }
  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/product/${product.handle}`,
    lastModified: new Date(product.updated_at || new Date()),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  // 3. Journal Articles — the same final content set the journal pages show,
  // so static-mode articles are listed and healthy-CMS withdrawals disappear.
  const { articles } = await resolveJournalArticles();
  const articleRoutes = articles.map((article) => ({
    url: `${baseUrl}/journal/${article.slug}`,
    lastModified: new Date(article.date || new Date()),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticRoutes,
    ...productRoutes,
    ...articleRoutes,
    ...flCatalogueRoutes(baseUrl),
  ];
}

/**
 * FLORENCESS catalogue routes: every captured category, every product, the six
 * information articles, the brand index and source-verified brand listings.
 * Unverified/empty manufacturer pages, login, cart and arbitrary searches are excluded.
 */
function flCatalogueRoutes(baseUrl: string): MetadataRoute.Sitemap {
  const lastModified = new Date(FL_CATALOG.generatedAt);
  const route = (path: string, priority: number, frequency: "daily" | "weekly" | "monthly") => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: frequency,
    priority,
  });

  return [
    ...FL_CATALOG.categories.map((category) => route(`/${category.slug}`, 0.9, "daily")),
    ...FL_CATALOG.products.map((product) => route(`/${product.slug}`, 0.8, "weekly")),
    ...FL_ARTICLE_SLUGS.map((slug) => route(`/${slug}`, 0.6, "monthly")),
    route("/brands", 0.6, "weekly"),
    route("/special", 0.7, "daily"),
    ...FL_BRANDS.filter((brand) => flBrandListing(brand.slug)?.products.length)
      .map((brand) => route(`/${brand.slug}`, 0.5, "monthly")),
  ];
}
