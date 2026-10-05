import { MetadataRoute } from "next";
import { getProducts, getCategories, getRegion } from "@/lib/medusa";
import { getArticles } from "@/lib/cms";

export const revalidate = 3600; // Revalidate sitemap every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";
    const region = await getRegion("gb");

    // 1. Static Routes
    const staticRoutes = [
        "",
        "/shop",
        "/journal",
        "/about",
        "/privacy",
        "/terms",
        "/shipping",
        "/returns",
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
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

    // 3. Categories (Collections/Categories in Medusa)
    const categories = await getCategories();
    const categoryRoutes = categories.map((category) => ({
        url: `${baseUrl}/shop?category=${category.handle}`,
        lastModified: new Date(category.updated_at || new Date()),
        changeFrequency: "weekly" as const,
        priority: 0.7,
    }));

    // 4. Journal Articles (Strapi)
    const articles = await getArticles();
    const articleRoutes = articles.map((article) => ({
        url: `${baseUrl}/journal/${article.slug}`,
        lastModified: new Date(article.date || new Date()),
        changeFrequency: "monthly" as const,
        priority: 0.8,
    }));

    return [
        ...staticRoutes,
        ...productRoutes,
        ...categoryRoutes,
        ...articleRoutes,
    ];
}
