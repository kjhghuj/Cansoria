"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Star, Truck } from "lucide-react";
import ProductGallery from "./ProductGallery";
import ProductActions from "./ProductActions";
import ProductInfo from "./ProductInfo";
import { formatPrice } from "@/lib/medusa";
import { StoreProduct, StoreProductCategory, StoreProductVariant } from "@/lib/types";
import { TrustBadgeGrid } from "@/components/TrustBadgeGrid";
import type { TrustBadgeItem } from "@/components/TrustBadgeGrid";

interface ProductImage {
  id?: string;
  url?: string;
}

interface ProductClientProps {
  product: StoreProduct;
  images: ProductImage[];
  thumbnail?: string | null;
  category?: StoreProductCategory | null;
  currencyCode: string;
}

type SelectedOptions = Record<string, string>;

function getInitialSelectedOptions(product: StoreProduct): SelectedOptions {
  const firstVariant = product.variants?.[0];
  const values = firstVariant?.options ?? [];

  return values.reduce<SelectedOptions>((acc, optionValue) => {
    if (optionValue.option_id && optionValue.value) {
      acc[optionValue.option_id] = optionValue.value;
    }
    return acc;
  }, {});
}

function findSelectedVariant(
  product: StoreProduct,
  selectedOptions: SelectedOptions
): StoreProductVariant | null {
  const variants = product.variants ?? [];
  const options = product.options ?? [];

  if (variants.length === 0) return null;
  if (options.length === 0) return variants[0];

  const allOptionsSelected = options.every((option) => selectedOptions[option.id]);
  if (!allOptionsSelected) return null;

  return (
    variants.find((variant) =>
      variant.options?.every((variantOption) => {
        const selectedValue = selectedOptions[variantOption.option_id || ""];
        return selectedValue === variantOption.value;
      })
    ) ?? null
  );
}

function getPriceSummary(product: StoreProduct, currencyCode: string) {
  const pricedVariants =
    product.variants
      ?.map((variant) => ({
        amount: variant.calculated_price?.calculated_amount,
        originalAmount: variant.calculated_price?.original_amount,
      }))
      .filter(
        (variant): variant is { amount: number; originalAmount: number | null | undefined } =>
          typeof variant.amount === "number"
      ) ?? [];

  if (pricedVariants.length === 0) {
    return {
      label: "Contact for Price",
      compareAtLabel: undefined,
      salePercent: undefined,
    };
  }

  const lowest = pricedVariants.reduce((min, variant) =>
    variant.amount < min.amount ? variant : min
  );
  const highestAmount = Math.max(...pricedVariants.map((variant) => variant.amount));
  const label = `${highestAmount > lowest.amount ? "From " : ""}${formatPrice(
    lowest.amount,
    currencyCode
  )}`;
  const compareAtLabel =
    typeof lowest.originalAmount === "number" && lowest.originalAmount > lowest.amount
      ? formatPrice(lowest.originalAmount, currencyCode)
      : undefined;
  const salePercent =
    typeof lowest.originalAmount === "number" && lowest.originalAmount > lowest.amount
      ? Math.round(((lowest.originalAmount - lowest.amount) / lowest.originalAmount) * 100)
      : undefined;

  return { label, compareAtLabel, salePercent };
}

function getProductBadges(product: StoreProduct, salePercent?: number) {
  const tagValues = product.tags?.map((tag) => tag.value?.toLowerCase() || "") ?? [];
  const isBestSeller = tagValues.some(
    (tag) => tag.includes("best") || tag.includes("popular")
  );
  const isNew = tagValues.some((tag) => tag.includes("new"));

  return [
    isBestSeller ? "Best Seller" : null,
    isNew ? "New Arrival" : null,
    salePercent ? `-${salePercent}%` : null,
  ].filter((badge): badge is string => Boolean(badge));
}

const sellingPoints = [
  "100% hand-painted by real artists",
  "Free digital preview before shipping",
  "Premium stretched canvas",
  "Worldwide delivery",
  "Secure checkout",
];

const trustItems: TrustBadgeItem[] = [
  {
    kind: "guarantee",
    title: "Satisfaction Guarantee",
    text: "Preview approval and careful support before your canvas ships.",
  },
  {
    kind: "secure",
    title: "Secure Payment",
    text: "Protected checkout with trusted payment providers.",
  },
  {
    kind: "artist",
    title: "Artist-Made",
    text: "Painted by real artists, not printed or machine generated.",
  },
  {
    kind: "preview",
    title: "Free Preview",
    text: "Review the digital preview before your canvas ships.",
  },
];

const customSteps = [
  "Upload your photo after placing the order",
  "Our artist prepares your painting",
  "You receive a preview for approval",
  "We ship your finished canvas",
];

const conversionAnswers = [
  {
    title: "Will it look like my photo?",
    text: "Your artist works from your reference to preserve likeness, expression, posture, and key details while giving the piece a painterly oil finish.",
  },
  {
    title: "Can I see it first?",
    text: "Yes. You receive a digital preview before shipping so you can review the direction before the finished canvas leaves the studio.",
  },
  {
    title: "How do I upload the photo?",
    text: "After checkout, we request your reference photo and notes for names, background, mood, or details you want the artist to emphasize.",
  },
  {
    title: "What if something feels off?",
    text: "Use the preview step to share concerns. If an approved artwork arrives damaged or materially different, support will help with a resolution.",
  },
  {
    title: "When will it arrive?",
    text: "Timing depends on size and complexity. Your order moves through artist preparation, painting, preview approval, packing, and tracked delivery.",
  },
  {
    title: "What is the canvas quality?",
    text: "Cansoria focuses on premium stretched canvas, layered oil paint texture, and careful packing for display-ready wall art.",
  },
];

const reviewHighlights = [
  {
    quote:
      "The preview made the process feel calm. We could see the direction before it shipped, and the final canvas felt personal.",
    author: "Megan R.",
  },
  {
    quote:
      "Our pet portrait captured the expression from the photo without looking like a printed copy.",
    author: "Daniel K.",
  },
];

export default function ProductClient({
  product,
  images,
  thumbnail,
  category,
  currencyCode,
}: ProductClientProps) {
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() =>
    getInitialSelectedOptions(product)
  );

  const selectedVariant = useMemo(
    () => findSelectedVariant(product, selectedOptions),
    [product, selectedOptions]
  );
  const priceSummary = useMemo(
    () => getPriceSummary(product, currencyCode),
    [product, currencyCode]
  );
  const galleryBadges = useMemo(
    () => getProductBadges(product, priceSummary.salePercent),
    [product, priceSummary.salePercent]
  );
  const description =
    product.description ||
    "A hand-painted canvas artwork made with expressive brushwork, thoughtful composition, and heirloom-quality presentation.";

  const handleOptionChange = (optionId: string, value: string) => {
    setSelectedOptions((current) => ({ ...current, [optionId]: value }));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-16">
        <ProductGallery
          key={selectedVariant?.id || "product-gallery"}
          images={images}
          thumbnail={thumbnail}
          title={product.title || "Cansoria Oil Painting"}
          selectedVariant={selectedVariant}
          badges={galleryBadges}
        />

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-7">
            {category?.name && (
              <Link
                href={category.handle ? `/shop?category=${category.handle}` : "/shop"}
                className="inline-block text-xs uppercase tracking-[0.28em] text-terracotta transition-colors hover:text-terracotta-dark"
              >
                {category.name}
              </Link>
            )}

            <div className="space-y-4">
              <h1 className="font-serif text-4xl leading-tight text-charcoal sm:text-5xl lg:text-6xl">
                {product.title}
              </h1>
              {product.subtitle && (
                <p className="text-lg leading-8 text-charcoal-light">
                  {product.subtitle}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3 border-y border-border py-5">
              <p className="text-3xl font-medium text-charcoal">
                {priceSummary.label}
              </p>
              {priceSummary.compareAtLabel && (
                <p className="text-lg text-charcoal-light line-through">
                  {priceSummary.compareAtLabel}
                </p>
              )}
              {priceSummary.salePercent && (
                <span className="bg-terracotta/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-terracotta">
                  Save {priceSummary.salePercent}%
                </span>
              )}
            </div>

            <p className="text-base leading-8 text-charcoal-light">{description}</p>

            <ul className="grid gap-3 border border-border bg-white p-5">
              {sellingPoints.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-charcoal">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-terracotta"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <ProductActions
              product={product}
              selectedOptions={selectedOptions}
              selectedVariant={selectedVariant}
              currencyCode={currencyCode}
              onOptionChange={handleOptionChange}
            />

            <TrustBadgeGrid items={trustItems} compact />
          </div>
        </aside>
      </div>

      <section className="mt-20 border-y border-border py-14">
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
              Custom Order
            </p>
            <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
              How Custom Painting Works
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {customSteps.map((step, index) => (
              <div key={step} className="border border-border bg-white p-6">
                <p className="mb-4 text-xs uppercase tracking-[0.22em] text-gold">
                  Step {index + 1}
                </p>
                <h3 className="font-serif text-2xl leading-snug text-charcoal">
                  {step}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Order With Confidence
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
            The Questions Most Customers Ask Before They Order
          </h2>
          <p className="mt-4 text-sm leading-7 text-charcoal-light">
            Custom artwork is personal. Here is how Cansoria handles likeness,
            preview approval, timing, upload, canvas quality, and support.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {conversionAnswers.map((item) => (
            <div key={item.title} className="border border-border bg-white p-5">
              <h3 className="font-serif text-xl text-charcoal">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-charcoal-light">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-8 border-y border-border py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="relative aspect-[4/5] overflow-hidden border border-border bg-white">
            <Image
              src="/placeholder.svg"
              alt="Reference photo placeholder before custom painting"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 28vw"
            />
            <span className="absolute left-3 top-3 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal">
              Photo
            </span>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden border border-border bg-white">
            <Image
              src="/products/portrait.svg"
              alt="Oil painting transformation placeholder"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 28vw"
            />
            <span className="absolute left-3 top-3 bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal">
              Painting
            </span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Photo to Painting
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
            A Keepsake With Brushwork, Not a Print
          </h2>
          <p className="mt-4 text-sm leading-7 text-charcoal-light">
            Artists use your photo as the reference, then add the depth, texture,
            and warmth that make oil painting feel at home on the wall.
          </p>
          <div className="mt-7 space-y-4">
            {reviewHighlights.map((review) => (
              <div key={review.author} className="border border-border bg-white p-5">
                <div className="mb-3 flex gap-1 text-terracotta">
                  {[...Array(5)].map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-6 text-charcoal-light">
                  &ldquo;{review.quote}&rdquo;
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-charcoal">
                  {review.author}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductInfo product={product} />

      <div className="mt-12 flex flex-col gap-3 border border-border bg-white p-5 text-sm text-charcoal-light sm:flex-row sm:items-center sm:justify-between">
        <span>Need help choosing a size or style?</span>
        <span className="flex items-center gap-2 text-charcoal">
          <Truck className="h-4 w-4 text-terracotta" aria-hidden="true" />
          Worldwide delivery options appear at checkout.
        </span>
      </div>
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </>
  );
}
