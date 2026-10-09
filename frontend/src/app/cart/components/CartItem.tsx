import { useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/medusa";
import { StoreCartLineItem } from "@/lib/types";
import { portraitSummary } from "@/lib/portrait";
import { FALLBACK_IMAGE, MinusIcon, PlusIcon, TrashIcon } from "./utils";

export default function CartItem({
  item,
  currencyCode,
  onUpdateQuantity,
  onRemove,
  isUpdating,
  variantImage,
  fallbackImage,
}: {
  item: StoreCartLineItem;
  currencyCode: string;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
  isUpdating: boolean;
  variantImage?: string;
  fallbackImage?: string | null;
}) {
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const portrait = portraitSummary(item.metadata);
  const preferredImage = portrait?.image || variantImage || item.thumbnail || fallbackImage || FALLBACK_IMAGE;
  const imageSrc = failedImageSrc === preferredImage ? FALLBACK_IMAGE : preferredImage;
  const productTitle =
    item.product_title || item.variant?.product?.title || "Custom Artwork";
  const variantTitle = item.variant_title || item.variant?.title;

  // Get the price
  const unitPrice = item.unit_price || 0;
  const lineTotal = item.total ?? unitPrice * item.quantity;

  return (
    <div className={`flex flex-col gap-4 py-5 min-[400px]:flex-row sm:py-6 ${isUpdating ? 'opacity-50' : ''}`}>
      {/* Product Image */}
      <div className="relative w-24 h-28 sm:w-32 sm:h-36 flex-shrink-0 bg-canvas overflow-hidden rounded-xl border border-border-subtle">
        <Image
          src={imageSrc}
          alt={productTitle}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 96px, 128px"
          onError={() => setFailedImageSrc(preferredImage)}
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg text-charcoal break-words pr-2">
              {productTitle}
            </h3>
            {variantTitle && variantTitle !== productTitle && (
              <p className="text-sm text-charcoal-light mt-1">
                {variantTitle}
              </p>
            )}
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-toffee">
              Custom artwork
            </p>
            {portrait && <div className="mt-2 space-y-1 text-sm text-charcoal-light"><p>{portrait.style}</p><p className="break-all">Photo: {portrait.photoName}</p></div>}
          </div>

          {/* Remove Button - Desktop */}
          <button
            onClick={onRemove}
            disabled={isUpdating}
            className="hidden sm:flex shrink-0 items-center justify-center w-8 h-8 text-charcoal-light hover:text-toffee transition-colors disabled:opacity-50"
            aria-label="Remove item"
          >
            <TrashIcon />
          </button>
        </div>

        {/* Price */}
        <p className="text-charcoal font-medium mt-2">
          {formatPrice(unitPrice, currencyCode)}
        </p>

        {/* Quantity Controls & Mobile Remove */}
        <div className="flex flex-wrap gap-3 items-center justify-between mt-4">
          <div className="inline-flex h-9 items-center rounded-full border border-border bg-white">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-l-full text-charcoal hover:bg-canvas transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <MinusIcon />
            </button>
            <span className="w-8 text-center text-sm font-medium text-charcoal">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={isUpdating}
              className="w-9 h-9 flex items-center justify-center rounded-r-full text-charcoal hover:bg-canvas transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Increase quantity"
            >
              <PlusIcon />
            </button>
          </div>

          {/* Line Total & Mobile Remove */}
          <div className="flex items-center gap-4">
            <p className="font-serif text-lg text-toffee">
              {formatPrice(lineTotal, currencyCode)}
            </p>
            <button
              onClick={onRemove}
              disabled={isUpdating}
              className="sm:hidden flex items-center justify-center w-8 h-8 text-charcoal-light hover:text-toffee transition-colors disabled:opacity-50"
              aria-label="Remove item"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
