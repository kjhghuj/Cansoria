/**
 * Strapi CMS API Helper
 *
 * This module provides functions to interact with Strapi CMS for fetching
 * Journal articles and handling media URLs.
 *
 * Environment Variables:
 * - STRAPI_API_URL: Base URL of Strapi instance (default: http://localhost:1337)
 * - STRAPI_API_TOKEN: Optional API token for authenticated requests
 */

import { ARTICLES as FALLBACK_ARTICLES } from "@/lib/constants";
import type { Article as FallbackArticle } from "@/lib/types";

// Strapi configuration
const STRAPI_API_URL = process.env.STRAPI_API_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN || "";

// --- Type Definitions ---

export interface StrapiImage {
    id: number;
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    formats?: {
        thumbnail?: { url: string };
        small?: { url: string };
        medium?: { url: string };
        large?: { url: string };
    };
}

// Strapi Blocks content types
export interface StrapiBlockChild {
    type: "text" | "link";
    text?: string;
    bold?: boolean;
    italic?: boolean;
    url?: string;
    children?: StrapiBlockChild[];
}

export interface StrapiBlock {
    type: "paragraph" | "heading" | "quote" | "image" | "list";
    children?: StrapiBlockChild[];
    level?: number; // for headings
    format?: "ordered" | "unordered"; // for lists
    image?: StrapiImage;
}

export interface StrapiArticle {
    id: number;
    documentId: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    readTime: string;
    author: string;
    createdAt: string;
    publishedAt: string;
    cover: StrapiImage;
    content?: StrapiBlock[] | string; // Blocks (legacy) or HTML string (CKEditor)
    medusa_product_id?: string;
    relatedArticles?: StrapiArticle[];
    isFeatured?: boolean;
    SEO?: {
        metaTitle?: string;
        metaDescription?: string;
        metaImage?: StrapiImage;
    };
}

export interface StrapiResponse<T> {
    data: T;
    meta?: {
        pagination?: {
            page: number;
            pageSize: number;
            pageCount: number;
            total: number;
        };
    };
}

// --- Mapped Article Type (for frontend use) ---

export interface Article {
    id: number;
    slug: string;
    category: string;
    title: string;
    author?: string;
    date?: string;
    excerpt: string;
    image: string;
    imageAlt: string;
    readTime: string;
    content?: ArticleBlock[]; // Legacy blocks format
    htmlContent?: string; // HTML content from CKEditor
    relatedArticleIds?: number[];
    featuredProductId?: string;
    isFeatured?: boolean;
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        metaImage?: string;
    };
}

export interface ArticleBlock {
    type: "paragraph" | "blockquote" | "image" | "inline-product" | "heading" | "list";
    text?: string;
    src?: string;
    caption?: string;
    productId?: string;
    level?: number;
    items?: string[];
}

// --- Helper Functions ---

/**
 * Constructs full Strapi API URL
 */
export function getStrapiURL(path: string = ""): string {
    return `${STRAPI_API_URL}${path}`;
}

/**
 * Handles Strapi media URL - prepends base URL if needed
 * Strapi returns relative URLs for uploaded media
 */
export function getStrapiMediaURL(url: string | undefined | null): string {
    if (!url) return "";

    // If already absolute URL, return as-is
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }

    // Prepend Strapi base URL
    return `${STRAPI_API_URL}${url}`;
}

/**
 * Process HTML content from CKEditor to fix relative URLs
 * Converts /uploads/... to full Strapi URLs
 */
export function processHtmlContent(html: string | undefined | null): string {
    if (!html) return "";

    // Replace relative image URLs with absolute Strapi URLs
    // Matches src="/uploads/..." or src='/uploads/...'
    return html.replace(
        /src=["'](\/(uploads\/[^"']+))["']/g,
        `src="${STRAPI_API_URL}$1"`
    );
}

/**
 * Default fetch options with auth header
 */
function getHeaders(): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (STRAPI_API_TOKEN) {
        headers["Authorization"] = `Bearer ${STRAPI_API_TOKEN}`;
    }

    return headers;
}

/**
 * Extract plain text from Strapi block children
 */
function extractTextFromChildren(children?: StrapiBlockChild[]): string {
    if (!children) return "";
    return children
        .map((child) => {
            if (child.type === "text") return child.text || "";
            if (child.type === "link" && child.children) {
                return extractTextFromChildren(child.children);
            }
            return "";
        })
        .join("");
}

/**
 * Map Strapi Blocks content to frontend format
 */
function mapBlocksContent(blocks?: StrapiBlock[], featuredProductId?: string): ArticleBlock[] {
    if (!blocks || blocks.length === 0) return [];

    return blocks
        .map((block): ArticleBlock | null => {
            if (block.type === "paragraph") {
                const text = extractTextFromChildren(block.children);
                if (!text.trim()) return null;

                // Check for [PRODUCT] shortcode
                if (text.trim() === "[PRODUCT]" && featuredProductId) {
                    return {
                        type: "inline-product",
                        productId: featuredProductId,
                    };
                }

                return { type: "paragraph", text };
            }

            if (block.type === "heading") {
                return {
                    type: "heading",
                    text: extractTextFromChildren(block.children),
                    level: block.level || 2,
                };
            }

            if (block.type === "quote") {
                return {
                    type: "blockquote",
                    text: extractTextFromChildren(block.children),
                };
            }

            if (block.type === "image" && block.image) {
                return {
                    type: "image",
                    src: getStrapiMediaURL(block.image.url),
                    caption: block.image.alternativeText || "",
                };
            }

            if (block.type === "list") {
                const items = block.children?.map((item) =>
                    extractTextFromChildren(item.children as StrapiBlockChild[])
                ) || [];
                return {
                    type: "list",
                    items,
                };
            }

            return null;
        })
        .filter((block): block is ArticleBlock => block !== null);
}

/**
 * Map Strapi article to frontend Article type
 */
function mapArticle(strapiArticle: StrapiArticle): Article {
    // Handle content: could be Blocks array (legacy) or HTML string (CKEditor)
    const isHtmlContent = typeof strapiArticle.content === 'string';

    return {
        id: strapiArticle.id,
        slug: strapiArticle.slug,
        category: strapiArticle.category,
        title: strapiArticle.title,
        author: strapiArticle.author || "The Editorial Team",
        date: strapiArticle.publishedAt
            ? new Date(strapiArticle.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
            : undefined,
        excerpt: strapiArticle.excerpt,
        image: getStrapiMediaURL(strapiArticle.cover?.url),
        imageAlt: strapiArticle.cover?.alternativeText || strapiArticle.title,
        readTime: strapiArticle.readTime || "5 min read",
        // Support both legacy Blocks and new HTML content
        content: isHtmlContent ? undefined : mapBlocksContent(strapiArticle.content as StrapiBlock[], strapiArticle.medusa_product_id),
        htmlContent: isHtmlContent ? processHtmlContent(strapiArticle.content as string) : undefined,
        featuredProductId: strapiArticle.medusa_product_id,
        relatedArticleIds: strapiArticle.relatedArticles?.map((a) => a.id) || [],
        seo: strapiArticle.SEO
            ? {
                metaTitle: strapiArticle.SEO.metaTitle,
                metaDescription: strapiArticle.SEO.metaDescription,
                metaImage: getStrapiMediaURL(strapiArticle.SEO.metaImage?.url),
            }
            : undefined,
    };
}

function mapFallbackArticle(article: FallbackArticle): Article {
    return {
        id: article.id,
        slug: article.slug,
        category: article.category,
        title: article.title,
        author: article.author || "The Cansoria Editorial Team",
        date: article.date,
        excerpt: article.excerpt,
        image: article.image,
        imageAlt: article.title,
        readTime: article.readTime,
        content: article.content as ArticleBlock[] | undefined,
        featuredProductId: article.featuredProductId,
        relatedArticleIds: article.relatedArticleIds || [],
        seo: {
            metaTitle: `${article.title} | Cansoria Journal`,
            metaDescription: article.excerpt,
            metaImage: article.image,
        },
    };
}

export function getFallbackArticles(): Article[] {
    return FALLBACK_ARTICLES.map(mapFallbackArticle);
}

export function getFallbackArticleBySlug(slug: string): Article | null {
    const article = FALLBACK_ARTICLES.find((item) => item.slug === slug);
    return article ? mapFallbackArticle(article) : null;
}

export function getFallbackRelatedArticles(ids: number[]): Article[] {
    if (!ids || ids.length === 0) return [];
    const idSet = new Set(ids);
    return FALLBACK_ARTICLES.filter((article) => idSet.has(article.id)).map(mapFallbackArticle);
}

// --- API Functions ---

/**
 * Fetch all articles from Strapi
 */
export async function getArticles(): Promise<Article[]> {
    try {
        const url = getStrapiURL(
            "/api/articles?populate=*&sort=publishedAt:desc"
        );

        const response = await fetch(url, {
            headers: getHeaders(),
            // In development, disable cache for instant content updates
            // In production, revalidate every 60 seconds
            cache: process.env.NODE_ENV === 'development' ? 'no-store' : undefined,
            next: process.env.NODE_ENV === 'development' ? undefined : { revalidate: 60 },
        });

        if (!response.ok) {
            console.error(`[CMS] Failed to fetch articles: ${response.status}`);
            return [];
        }

        const json: StrapiResponse<StrapiArticle[]> = await response.json();

        return json.data.map(mapArticle);
    } catch (error) {
        console.error("[CMS] Error fetching articles:", error);
        return [];
    }
}

/**
 * Fetch the featured article for Journal Hero
 */
export async function getFeaturedArticle(): Promise<Article | null> {
    try {
        const url = getStrapiURL(
            "/api/articles?filters[isFeatured][$eq]=true&populate=*&pagination[limit]=1"
        );

        const response = await fetch(url, {
            headers: getHeaders(),
            cache: process.env.NODE_ENV === 'development' ? 'no-store' : undefined,
            next: process.env.NODE_ENV === 'development' ? undefined : { revalidate: 60 },
        });

        if (!response.ok) {
            console.error(`[CMS] Failed to fetch featured article: ${response.status}`);
            return null;
        }

        const json: StrapiResponse<StrapiArticle[]> = await response.json();

        if (!json.data || json.data.length === 0) {
            return null;
        }

        return mapArticle(json.data[0]);
    } catch (error) {
        console.error("[CMS] Error fetching featured article:", error);
        return null;
    }
}

/**
 * Fetch single article by slug from Strapi
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
    try {
        const url = getStrapiURL(
            `/api/articles?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`
        );

        const response = await fetch(url, {
            headers: getHeaders(),
            cache: process.env.NODE_ENV === 'development' ? 'no-store' : undefined,
            next: process.env.NODE_ENV === 'development' ? undefined : { revalidate: 60 },
        });

        if (!response.ok) {
            console.error(`[CMS] Failed to fetch article by slug: ${response.status}`);
            return null;
        }

        const json: StrapiResponse<StrapiArticle[]> = await response.json();

        if (!json.data || json.data.length === 0) {
            return null;
        }

        return mapArticle(json.data[0]);
    } catch (error) {
        console.error("[CMS] Error fetching article by slug:", error);
        return null;
    }
}

/**
 * Fetch article by ID from Strapi
 */
export async function getArticleById(id: number): Promise<Article | null> {
    try {
        const url = getStrapiURL(
            `/api/articles/${id}?populate=*`
        );

        const response = await fetch(url, {
            headers: getHeaders(),
            cache: process.env.NODE_ENV === 'development' ? 'no-store' : undefined,
            next: process.env.NODE_ENV === 'development' ? undefined : { revalidate: 60 },
        });

        if (!response.ok) {
            console.error(`[CMS] Failed to fetch article by id: ${response.status}`);
            return null;
        }

        const json: StrapiResponse<StrapiArticle> = await response.json();

        if (!json.data) {
            return null;
        }

        return mapArticle(json.data);
    } catch (error) {
        console.error("[CMS] Error fetching article by id:", error);
        return null;
    }
}

/**
 * Fetch related articles by IDs
 */
export async function getRelatedArticles(ids: number[]): Promise<Article[]> {
    if (!ids || ids.length === 0) return [];

    try {
        const results = await Promise.all(ids.map((id) => getArticleById(id)));
        return results.filter((a): a is Article => a !== null);
    } catch (error) {
        console.error("[CMS] Error fetching related articles:", error);
        return [];
    }
}
