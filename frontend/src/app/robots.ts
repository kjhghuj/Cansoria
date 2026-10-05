import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cansoria.com";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/checkout", "/account", "/cart", "/order", "/api", "/forgot-password", "/reset-password"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
