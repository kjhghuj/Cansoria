"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { StoreProduct } from "@/lib/types";
import { formatPrice } from "@/lib/medusa";

const FALLBACK_IMAGES = [
  "/products/generic.svg",
  "/products/portrait.svg",
  "/products/canvas.svg",
];

function getFallbackImage(productId?: string): string {
  if (!productId) return FALLBACK_IMAGES[0];
  const hash = productId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_IMAGES[hash % FALLBACK_IMAGES.length];
}

type ProductMetadata = Record<string, unknown>;

function isPresentString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function cleanText(value: string, maxLength: number) {
  const text = value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getProductSubtitle(product: StoreProduct) {
  if (isPresentString(product.subtitle)) {
    return cleanText(product.subtitle, 96);
  }

  if (isPresentString(product.description)) {
    return cleanText(product.description, 104);
  }

  return "Hand-painted canvas artwork made for refined rooms, personal gifts, and lasting memories.";
}

function getMetadata(product: StoreProduct): ProductMetadata {
  return product.metadata && typeof product.metadata === "object" ? product.metadata : {};
}

function getMetadataNumber(metadata: ProductMetadata, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getSearchableProductText(product: StoreProduct) {
  const tags = product.tags?.map((tag) => tag.value) ?? [];
  const categories =
    product.categories?.flatMap((category) => [category.name, category.handle]) ?? [];

  return [
    product.title,
    product.subtitle,
    product.description,
    product.handle,
    ...tags,
    ...categories,
  ]
    .filter(isPresentString)
    .join(" ")
    .toLowerCase();
}

function getVariantPrices(product: StoreProduct) {
  return (
    product.variants
      ?.map((variant) => variant.calculated_price?.calculated_amount)
      .filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount)) ??
    []
  );
}

interface ProductCardProps {
  product: StoreProduct;
  regionCurrency?: string;
}

export default function ProductCard({ product, regionCurrency = "GBP" }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const images = product.images || [];
  const fallbackImage = getFallbackImage(product.id);
  const mainImage =
    imageError || !isPresentString(product.thumbnail || images[0]?.url)
      ? fallbackImage
      : product.thumbnail || images[0]?.url || fallbackImage;
  const secondaryImage =
    imageError || !isPresentString(images[1]?.url)
      ? mainImage
      : images[1]?.url || mainImage;

  const title = product.title || "Untitled Oil Painting";
  const subtitle = getProductSubtitle(product);
  const category = product.categories?.[0]?.name || "Oil Painting";
  const productHref = product.handle ? `/product/${product.handle}` : "/shop";

  const variantPrices = getVariantPrices(product);
  const lowestPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : undefined;
  const highestPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : undefined;
  const priceLabel =
    lowestPrice === undefined
      ? "Contact for Price"
      : `${highestPrice !== lowestPrice ? "From " : ""}${formatPrice(
          lowestPrice,
          regionCurrency
        )}`;

  const compareAtPrice = product.variants?.find((variant) => {
    const amount = variant.calculated_price?.calculated_amount;
    const original = variant.calculated_price?.original_amount;
    return (
      typeof amount === "number" &&
      typeof original === "number" &&
      original > amount &&
      amount === lowestPrice
    );
  })?.calculated_price?.original_amount;

  const metadata = getMetadata(product);
  const productText = getSearchableProductText(product);
  const tagValues = product.tags?.map((tag) => tag.value?.toLowerCase()) ?? [];
  const isBestSeller =
    tagValues.some((tag) => tag === "best seller" || tag === "bestseller") ||
    metadata.best_seller === true ||
    metadata.bestseller === true;
  const isCustomizable =
    metadata.customizable === true ||
    ["custom", "portrait", "photo", "pet", "wedding"].some((keyword) =>
      productText.includes(keyword)
    );
  const hasFreePreview =
    metadata.free_preview !== false && metadata.freePreview !== false;
  const badges = [
    isCustomizable ? "Customizable" : null,
    isBestSeller ? "Best Seller" : null,
    hasFreePreview ? "Free Preview" : null,
  ].filter(isPresentString);

  const rating = getMetadataNumber(metadata, ["rating", "average_rating", "review_rating"]);
  const reviewCount = getMetadataNumber(metadata, [
    "review_count",
    "reviews",
    "rating_count",
  ]);

  const safeRating =
    rating !== undefined ? Math.min(Math.max(rating, 0), 5).toFixed(1) : undefined;

  return (
    <article className="group h-full rounded-2xl border border-border-subtle bg-cream-light overflow-hidden shadow-[0_4px_20px_rgba(38,34,30,0.05)] transition-all hover:shadow-[0_12px_32px_rgba(38,34,30,0.10)]">
      <Link href={productHref} className="flex h-full flex-col">
        <div
          className="relative aspect-[4/5] w-full overflow-hidden bg-cream-card"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Image
            src={mainImage}
            alt={title}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-0" : "opacity-100"
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
          <Image
            src={secondaryImage}
            alt={`${title} detail`}
            fill
            className={`object-cover transition-opacity duration-700 ease-in-out ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />

          {badges.length > 0 && (
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {badges.slice(0, 3).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-cream-light/95 border border-border px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal shadow-sm backdrop-blur"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          {compareAtPrice && (
            <span className="absolute bottom-3 right-3 rounded-full bg-toffee px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white shadow-sm">
              Sale
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-toffee">
              {category}
            </p>
            {safeRating && (
              <p className="flex shrink-0 items-center gap-1 text-xs text-charcoal-light">
                <Star
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-champagne-gold text-champagne-gold"
                />
                <span>{safeRating}</span>
                {reviewCount !== undefined && <span>({reviewCount})</span>}
              </p>
            )}
          </div>

          <h3 className="font-serif text-xl leading-snug text-charcoal transition-colors group-hover:text-toffee">
            {title}
          </h3>
          <p className="mt-2 min-h-[3.5rem] text-sm leading-6 text-charcoal-light">
            {subtitle}
          </p>

          <div className="mt-auto flex items-end justify-between gap-4 pt-5">
            <div>
              <span className="block text-base font-medium text-charcoal">
                {priceLabel}
              </span>
              {compareAtPrice && lowestPrice !== undefined && (
                <span className="block text-xs text-charcoal-light line-through">
                  {formatPrice(compareAtPrice, regionCurrency)}
                </span>
              )}
            </div>
            <span className="shrink-0 border-b border-charcoal pb-1 text-xs uppercase tracking-[0.22em] text-charcoal transition-colors group-hover:border-toffee group-hover:text-toffee">
              View Details
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
