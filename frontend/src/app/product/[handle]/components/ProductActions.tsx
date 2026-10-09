"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brush,
  Check,
  Eye,
  Globe,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Zap,
} from "lucide-react";
import PhotoUpload from "@/components/PhotoUpload";
import {
  portraitStyles,
  type PortraitStyle,
  type UploadedPhoto,
} from "@/lib/portrait";
import { useCart } from "@/lib/providers";
import { formatPrice } from "@/lib/medusa";
import { StoreProduct, StoreProductVariant } from "@/lib/types";

interface ProductActionsProps {
  initialStyle: PortraitStyle;
  onStyleChange?: (style: PortraitStyle) => void;
  product: StoreProduct;
  selectedOptions: Record<string, string>;
  selectedVariant: StoreProductVariant | null;
  currencyCode: string;
  onOptionChange: (optionId: string, value: string) => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function isVariantInStock(variant: StoreProductVariant | null) {
  if (!variant) return false;
  if (!variant.manage_inventory || variant.allow_backorder) return true;
  return (variant.inventory_quantity ?? 0) > 0;
}

const panelTrustPoints = [
  { icon: <Brush size={16} />, label: "Style Concepts" },
  { icon: <Eye size={16} />, label: "Photo Guidance" },
  { icon: <Globe size={16} />, label: "In Preparation" },
];

export default function ProductActions({
  initialStyle,
  onStyleChange,
  product,
  selectedOptions,
  selectedVariant,
  currencyCode,
  onOptionChange,
}: ProductActionsProps) {
  const router = useRouter();
  const { addItem, cartLoading, cart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [style, setStyle] = useState<PortraitStyle>(initialStyle);
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState("");
  const isPortrait = product.handle === "pet-portrait-oil-painting";
  const photoReady = Boolean(photo && photo.cartId === cart?.id);

  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const options = useMemo(() => product.options ?? [], [product.options]);
  const isAllOptionsSelected = options.every(
    (option) => selectedOptions[option.id],
  );
  const isInStock = isVariantInStock(selectedVariant);
  const hasVariants = variants.length > 0;
  const isProcessing = isAdding || isBuyingNow || cartLoading;
  const canAddToCart =
    hasVariants &&
    Boolean(selectedVariant?.id) &&
    isAllOptionsSelected &&
    isInStock &&
    (!isPortrait || photoReady) &&
    !isProcessing;

  const selectedPrice = selectedVariant?.calculated_price?.calculated_amount;
  const selectedOriginalPrice =
    selectedVariant?.calculated_price?.original_amount;
  const selectedCurrency =
    selectedVariant?.calculated_price?.currency_code?.toUpperCase() ||
    currencyCode;
  const isSelectedVariantOnSale =
    typeof selectedOriginalPrice === "number" &&
    typeof selectedPrice === "number" &&
    selectedOriginalPrice > selectedPrice;

  const handleAddToCart = async () => {
    if (!canAddToCart || !selectedVariant?.id) return;
    setIsAdding(true);
    setActionError("");
    try {
      await addItem(
        selectedVariant.id,
        quantity,
        isPortrait && photo ? { style, photo_id: photo.id, notes } : undefined,
      );
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2200);
    } catch (error: unknown) {
      console.error("Failed to add to cart:", error);
      setActionError(getErrorMessage(error));
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!canAddToCart || !selectedVariant?.id) return;
    setIsBuyingNow(true);
    setActionError("");
    try {
      await addItem(
        selectedVariant.id,
        quantity,
        isPortrait && photo ? { style, photo_id: photo.id, notes } : undefined,
      );
      router.push("/cart");
    } catch (error: unknown) {
      console.error("Failed to add item for buy now:", error);
      setActionError(getErrorMessage(error));
      setIsBuyingNow(false);
    }
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(10, current + 1));
  };

  const addToCartLabel = (() => {
    if (!hasVariants) return "Unavailable";
    if (justAdded) return "Added to Cart";
    if (isAdding) return "Adding";
    if (!isAllOptionsSelected) return "Select Options";
    if (!selectedVariant) return "Combination Unavailable";
    if (!isInStock) return "Out of Stock";
    if (isPortrait && !photoReady) return "Upload Your Photo";
    return "Add to Cart";
  })();

  return (
    <div className="space-y-6">
      {isPortrait && (
        <fieldset>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]">
            Painting style
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {portraitStyles.map((option) => (
              <label
                key={option.id}
                className={`cursor-pointer rounded-xl border p-3 text-sm ${style === option.id ? "border-toffee bg-cream-card" : "border-border bg-cream-light"}`}
              >
                <input
                  className="mr-2 accent-toffee"
                  type="radio"
                  name="portrait-style"
                  value={option.id}
                  checked={style === option.id}
                  disabled={isProcessing}
                  onChange={() => {
                    setStyle(option.id);
                    onStyleChange?.(option.id);
                  }}
                />
                {option.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {options.length > 0 && (
        <div className="space-y-5">
          {options.map((option) => (
            <div key={option.id}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-charcoal">
                  {option.title}
                </h3>
                {selectedOptions[option.id] && (
                  <span className="text-sm text-charcoal-light">
                    {selectedOptions[option.id]}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {option.values?.map((value) => {
                  const isSelected = selectedOptions[option.id] === value.value;

                  return (
                    <button
                      type="button"
                      key={value.id}
                      onClick={() => onOptionChange(option.id, value.value)}
                      className={`min-h-11 rounded-full border px-5 py-2 text-sm transition-colors ${
                        isSelected
                          ? "border-toffee bg-toffee/10 font-medium text-charcoal ring-1 ring-toffee/30"
                          : "border-border bg-white text-charcoal hover:border-toffee hover:text-toffee"
                      }`}
                    >
                      {value.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPrice !== undefined && (
        <div className="flex items-baseline gap-3 rounded-xl bg-white border border-border-subtle px-4 py-3">
          <span className="text-xl font-medium text-toffee">
            {formatPrice(selectedPrice, selectedCurrency)}
          </span>
          {isSelectedVariantOnSale && selectedOriginalPrice && (
            <span className="text-sm text-charcoal-light line-through">
              {formatPrice(selectedOriginalPrice, selectedCurrency)}
            </span>
          )}
        </div>
      )}

      {isPortrait && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]">
            Your reference photo
          </h3>
          <PhotoUpload key={cart?.id || "loading"} onChange={setPhoto} />
          <Link
            href="/upload-photo"
            className="mt-3 inline-block text-sm text-toffee underline"
          >
            Photo tips &amp; upload page
          </Link>
          <label className="mt-5 block text-sm">
            Notes for your artist
            <textarea
              value={notes}
              maxLength={1000}
              disabled={isProcessing}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-border bg-cream-light p-3"
              placeholder="Your pet’s name, background preferences, or details to keep."
            />
          </label>
        </div>
      )}
      {actionError && (
        <p role="alert" className="text-sm text-red-700">
          {actionError}
        </p>
      )}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-charcoal">
          Quantity
        </h3>
        <div className="inline-flex h-12 items-center rounded-full border border-border bg-white">
          <button
            type="button"
            onClick={decreaseQuantity}
            disabled={quantity <= 1}
            className="flex h-full w-12 items-center justify-center rounded-l-full text-charcoal transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Decrease quantity"
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="w-12 text-center text-sm font-medium text-charcoal">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increaseQuantity}
            disabled={quantity >= 10}
            className="flex h-full w-12 items-center justify-center rounded-r-full text-charcoal transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Increase quantity"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!canAddToCart && !justAdded}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] transition-colors ${
            justAdded
              ? "bg-sage text-white"
              : canAddToCart
                ? "bg-toffee text-white hover:bg-toffee-dark shadow-[0_8px_24px_rgba(176,141,79,0.30)]"
                : "cursor-not-allowed border border-border bg-white text-charcoal-light"
          }`}
        >
          {justAdded ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : isAdding ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          )}
          {addToCartLabel}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!canAddToCart}
          className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-full border-2 px-6 py-4 text-sm font-semibold uppercase tracking-[0.22em] transition-colors ${
            canAddToCart
              ? "border-toffee bg-transparent text-toffee hover:bg-toffee hover:text-white"
              : "cursor-not-allowed border border-border bg-white text-charcoal-light"
          }`}
        >
          {isBuyingNow ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <Zap className="h-5 w-5" aria-hidden="true" />
          )}
          {isBuyingNow ? "Processing" : "Buy Now"}
        </button>
      </div>

      {/* Panel trust row */}
      <div className="flex flex-wrap items-center justify-start gap-3 rounded-2xl border border-border-subtle bg-cream-light px-5 py-4">
        {panelTrustPoints.map((point, index) => (
          <div key={point.label} className="flex items-center gap-3">
            {index > 0 && (
              <span className="h-6 w-px bg-border" aria-hidden="true" />
            )}
            <span className="flex items-center gap-2 text-toffee">
              {point.icon}
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal-light">
                {point.label}
              </span>
            </span>
          </div>
        ))}
      </div>

      {justAdded && (
        <Link
          href="/cart"
          className="block rounded-full border border-charcoal px-6 py-3 text-center text-sm font-semibold uppercase tracking-[0.22em] text-charcoal transition-colors hover:bg-charcoal hover:text-white"
        >
          View Cart
        </Link>
      )}

      {/* Reference preparation guidance */}
      <div className="rounded-2xl border border-border-subtle bg-cream-card p-5">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-charcoal">
          Preparing Your Portrait
        </p>
        <ul className="space-y-3">
          {[
            { icon: "📷", text: "1. Upload Your Photo Securely" },
            { icon: "🎨", text: "2. Choose a Style and Add Your Preferences" },
            {
              icon: "📦",
              text: "3. Discuss Your Idea Before Commissions Open",
            },
          ].map((step) => (
            <li
              key={step.text}
              className="flex items-center gap-3 text-sm text-charcoal-light"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-light border border-border-subtle text-sm"
              >
                {step.icon}
              </span>
              <span>{step.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm leading-6 text-charcoal-light">
        Your uploaded photo and painting style stay together in the customizer.
        Uploading a reference does not reserve a commission. Production and
        service arrangements will be confirmed before orders open.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-cream/95 px-4 py-3 shadow-[0_-10px_30px_rgba(38,35,31,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[680px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-charcoal">
              {selectedPrice !== undefined
                ? formatPrice(selectedPrice, selectedCurrency)
                : "Ready for custom artwork"}
            </p>
            <p className="truncate text-[11px] text-charcoal-light">
              Commissions in preparation
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart && !justAdded}
            className={`flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${
              justAdded
                ? "bg-sage text-white"
                : canAddToCart
                  ? "bg-toffee text-white"
                  : "cursor-not-allowed border border-border bg-white text-charcoal-light"
            }`}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            )}
            {justAdded ? "Added" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
