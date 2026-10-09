"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, Truck } from "lucide-react";
import ProductGallery from "./ProductGallery";
import ProductActions from "./ProductActions";
import {
  STUDIO,
  STUDIO_FAQ,
  PREPARATION_STEPS,
  studioProduct,
} from "@/lib/studio-content";
import { portraitStyles, type PortraitStyle } from "@/lib/portrait";
import ProductInfo from "./ProductInfo";
import { formatPrice } from "@/lib/medusa";
import { StoreProduct, StoreProductCategory } from "@/lib/types";
import { findSelectedVariant } from "@/lib/product-options";
import { TrustBadgeGrid } from "@/components/TrustBadgeGrid";
import type { TrustBadgeItem } from "@/components/TrustBadgeGrid";

interface ProductImage {
  id?: string;
  url?: string;
}

interface ProductClientProps {
  initialStyle: PortraitStyle;
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

function getPriceSummary(product: StoreProduct, currencyCode: string) {
  const pricedVariants =
    product.variants
      ?.map((variant) => ({
        amount: variant.calculated_price?.calculated_amount,
        originalAmount: variant.calculated_price?.original_amount,
      }))
      .filter(
        (
          variant,
        ): variant is {
          amount: number;
          originalAmount: number | null | undefined;
        } => typeof variant.amount === "number",
      ) ?? [];

  if (pricedVariants.length === 0) {
    return {
      label: "Contact for Price",
      compareAtLabel: undefined,
      salePercent: undefined,
    };
  }

  const lowest = pricedVariants.reduce((min, variant) =>
    variant.amount < min.amount ? variant : min,
  );
  const highestAmount = Math.max(
    ...pricedVariants.map((variant) => variant.amount),
  );
  const label = `${highestAmount > lowest.amount ? "From " : ""}${formatPrice(
    lowest.amount,
    currencyCode,
  )}`;
  const compareAtLabel =
    typeof lowest.originalAmount === "number" &&
    lowest.originalAmount > lowest.amount
      ? formatPrice(lowest.originalAmount, currencyCode)
      : undefined;
  const salePercent =
    typeof lowest.originalAmount === "number" &&
    lowest.originalAmount > lowest.amount
      ? Math.round(
          ((lowest.originalAmount - lowest.amount) / lowest.originalAmount) *
            100,
        )
      : undefined;

  return { label, compareAtLabel, salePercent };
}

function getProductBadges(salePercent?: number) {
  return [
    "Style illustration",
    salePercent ? "-" + salePercent + "%" : null,
  ].filter((badge): badge is string => Boolean(badge));
}

const sellingPoints = [
  "Four illustrated style concepts",
  "Reference and preferences together",
  "Production details to be confirmed",
  "Questions welcome before commissioning",
];
const trustItems: TrustBadgeItem[] = [
  {
    kind: "artist",
    title: "Style Concepts",
    text: "Illustrations to help you describe a preferred direction.",
  },
  {
    kind: "preview",
    title: "Photo Guidance",
    text: "Prepare a clear reference with the expression you love.",
  },
  {
    kind: "guarantee",
    title: "Personal Details",
    text: "Note the colours, composition and memories that matter.",
  },
  {
    kind: "secure",
    title: "Clear Expectations",
    text: "Service arrangements will be confirmed before commissions open.",
  },
];
const customSteps = PREPARATION_STEPS;
const conversionAnswers = STUDIO_FAQ;

export default function ProductClient({
  initialStyle,
  product: rawProduct,
  images,
  thumbnail,
  category,
  currencyCode,
}: ProductClientProps) {
  const product = useMemo(() => studioProduct(rawProduct), [rawProduct]);
  const isPortrait = product.handle === "pet-portrait-oil-painting";
  const [previewStyle, setPreviewStyle] = useState(initialStyle);
  const previewStyleName =
    portraitStyles.find((style) => style.id === previewStyle)?.name ||
    "Classic Oil";
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() =>
    getInitialSelectedOptions(product),
  );

  const selectedVariant = useMemo(
    () => findSelectedVariant(product, selectedOptions),
    [product, selectedOptions],
  );
  const priceSummary = useMemo(
    () => getPriceSummary(product, currencyCode),
    [product, currencyCode],
  );
  const galleryBadges = useMemo(
    () => getProductBadges(priceSummary.salePercent),
    [priceSummary.salePercent],
  );
  const description = product.description || STUDIO.productDescription;

  const handleOptionChange = (optionId: string, value: string) => {
    setSelectedOptions((current) => ({ ...current, [optionId]: value }));
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] lg:gap-16">
        <div className="min-w-0">
          <ProductGallery
            key={
              isPortrait
                ? previewStyle
                : selectedVariant?.id || "product-gallery"
            }
            images={
              isPortrait
                ? [
                    { url: `/images/pet-oil/${previewStyle}.webp` },
                    { url: "/images/pet-oil/hero-room.png" },
                  ]
                : images
            }
            thumbnail={isPortrait ? null : thumbnail}
            title={
              isPortrait
                ? `${previewStyleName} style example`
                : product.title || "Cansoria Oil Painting"
            }
            selectedVariant={isPortrait ? null : selectedVariant}
            badges={galleryBadges}
          />
          <p className="studio-image-caption">{STUDIO.illustration}</p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-7">
            {category?.name && (
              <span
                className="inline-block text-xs uppercase tracking-[0.28em] text-terracotta"
              >
                {category.name}
              </span>
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
              <p className="font-serif text-3xl font-medium text-toffee">
                {priceSummary.label}
              </p>
              {priceSummary.compareAtLabel && (
                <p className="text-lg text-charcoal-light line-through">
                  {priceSummary.compareAtLabel}
                </p>
              )}
              {priceSummary.salePercent && (
                <span className="rounded-full bg-toffee/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-toffee">
                  Save {priceSummary.salePercent}%
                </span>
              )}
            </div>

            <p className="text-base leading-8 text-charcoal-light">
              {description}
            </p>

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
              initialStyle={initialStyle}
              onStyleChange={setPreviewStyle}
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
        <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
              Custom Order
            </p>
            <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
              Preparing Your Portrait
            </h2>
          </div>
          <div className="relative grid gap-6 sm:grid-cols-3">
            {/* Gold connector line (desktop) */}
            <div
              aria-hidden="true"
              className="hidden sm:block absolute top-7 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-toffee/15 via-toffee/50 to-toffee/15"
            />
            {customSteps.map((step, index) => (
              <div
                key={step.title}
                className="relative text-center sm:text-left"
              >
                <span
                  aria-hidden="true"
                  className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-toffee bg-cream-light font-serif text-lg font-semibold text-toffee shadow-[0_6px_18px_rgba(176,141,79,0.25)] sm:mx-0 mx-auto"
                >
                  {index + 1}
                </span>
                <h3 className="font-serif text-xl text-charcoal">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-charcoal-light">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Before Commissions Open
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
            A Few Helpful Questions
          </h2>
          <p className="mt-4 text-sm leading-7 text-charcoal-light">
            Our service is in preparation. Here is what is known and what will
            be confirmed before commissions open.
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
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border-subtle bg-white">
            <Image
              src="/images/pet-oil/original-photo.webp"
              alt="Pet reference photo concept"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 28vw"
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal">
              Reference Concept
            </span>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border-subtle bg-white">
            <Image
              src="/images/pet-oil/finished-oil.webp"
              alt="Pet portrait style concept"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 28vw"
            />
            <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-charcoal">
              Portrait Concept
            </span>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Photo to Painting
          </p>
          <h2 className="font-serif text-3xl text-charcoal sm:text-4xl">
            An Idea Inspired by Your Photo
          </h2>
          <p className="mt-4 text-sm leading-7 text-charcoal-light">
            {STUDIO.comparison} These illustrations explore a possible mood and
            composition; they do not document a completed painting.
          </p>
        </div>
      </section>

      <ProductInfo product={product} />

      <div className="mt-12 flex flex-col gap-3 border border-border bg-white p-5 text-sm text-charcoal-light sm:flex-row sm:items-center sm:justify-between">
        <span>Need help choosing a size or style?</span>
        <span className="flex items-center gap-2 text-charcoal">
          <Truck className="h-4 w-4 text-terracotta" aria-hidden="true" />
          Delivery arrangements will be confirmed before commissions open.
        </span>
      </div>
      <div className="h-24 lg:hidden" aria-hidden="true" />
    </>
  );
}
