import { MetadataRoute } from "next";
import { getProducts, getRegion } from "@/lib/medusa";
import { resolveJournalArticles } from "@/lib/cms";

export const revalidate = 3600; // Revalidate sitemap every hour

// Real content revision dates, not build time. Static route copy (home, FAQ,
// journal index, legal and info pages) was last revised with the 2026-10-21
// watch storefront release; update this constant whenever those pages
// meaningfully change.
const STATIC_CONTENT_LAST_MODIFIED = "2026-10-21";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";
  const region = await getRegion();

  // 1. Static Routes
  const staticRoutes = [
    "",
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

  // 2. Products
  const { products } = await getProducts(region?.id, 1000); // Fetch up to 1000 products
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
  ];
}
