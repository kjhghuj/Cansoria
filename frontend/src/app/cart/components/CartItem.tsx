import { useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/medusa";
import { StoreCartLineItem } from "@/lib/types";
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
  const preferredImage = variantImage || item.thumbnail || fallbackImage || FALLBACK_IMAGE;
  const imageSrc = failedImageSrc === preferredImage ? FALLBACK_IMAGE : preferredImage;
  const productTitle =
    item.product_title || item.variant?.product?.title || "Custom Artwork";
  const variantTitle = item.variant_title || item.variant?.title;

  // Get the price
  const unitPrice = item.unit_price || 0;
  const lineTotal = item.total ?? unitPrice * item.quantity;

  return (
    <div className={`flex gap-4 py-6 border-b border-border ${isUpdating ? 'opacity-50' : ''}`}>
      {/* Product Image */}
      <div className="relative w-24 h-28 sm:w-32 sm:h-36 flex-shrink-0 bg-canvas overflow-hidden border border-border">
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
          <div>
            <h3 className="font-serif text-lg text-charcoal truncate pr-4">
              {productTitle}
            </h3>
            {variantTitle && variantTitle !== productTitle && (
              <p className="text-sm text-charcoal-light mt-1">
                {variantTitle}
              </p>
            )}
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-terracotta">
              Custom artwork
            </p>
          </div>

          {/* Remove Button - Desktop */}
          <button
            onClick={onRemove}
            disabled={isUpdating}
            className="hidden sm:flex items-center justify-center w-8 h-8 text-charcoal-light hover:text-terracotta transition-colors disabled:opacity-50"
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
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={isUpdating || item.quantity <= 1}
              className="w-8 h-8 flex items-center justify-center border border-border hover:border-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              <MinusIcon />
            </button>
            <span className="w-8 text-center font-medium text-charcoal">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              disabled={isUpdating}
              className="w-8 h-8 flex items-center justify-center border border-border hover:border-charcoal transition-colors disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <PlusIcon />
            </button>
          </div>

          {/* Line Total & Mobile Remove */}
          <div className="flex items-center gap-4">
            <p className="font-serif text-lg text-charcoal">
              {formatPrice(lineTotal, currencyCode)}
            </p>
            <button
              onClick={onRemove}
              disabled={isUpdating}
              className="sm:hidden flex items-center justify-center w-8 h-8 text-charcoal-light hover:text-terracotta transition-colors disabled:opacity-50"
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
