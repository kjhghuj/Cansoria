"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { StoreProductVariant } from "@/lib/types";

const FALLBACK_IMAGE = "/products/canvas.svg";

interface ProductImage {
  id?: string;
  url?: string;
}

interface ProductImageWithUrl extends ProductImage {
  url: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  title: string;
  thumbnail?: string | null;
  selectedVariant?: StoreProductVariant | null;
  badges?: string[];
}

function isValidImage(
  image: ProductImage | null | undefined,
): image is ProductImageWithUrl {
  return typeof image?.url === "string" && image.url.trim().length > 0;
}

export default function ProductGallery({
  images,
  title,
  thumbnail,
  selectedVariant,
  badges = [],
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const displayImages = useMemo(() => {
    const uniqueImages: ProductImage[] = [];
    const seenUrls = new Set<string>();

    const addImage = (image: ProductImage | null | undefined) => {
      if (!isValidImage(image) || seenUrls.has(image.url)) return;
      uniqueImages.push(image);
      seenUrls.add(image.url);
    };

    addImage(
      selectedVariant?.thumbnail
        ? {
            id: `${selectedVariant.id}-thumbnail`,
            url: selectedVariant.thumbnail,
          }
        : null,
    );
    selectedVariant?.images?.forEach(addImage);
    images.forEach(addImage);
    addImage(thumbnail ? { id: "product-thumbnail", url: thumbnail } : null);

    return uniqueImages.length > 0 ? uniqueImages : [{ url: FALLBACK_IMAGE }];
  }, [images, selectedVariant, thumbnail]);

  const safeIndex = Math.min(selectedIndex, displayImages.length - 1);
  const selectedImage = displayImages[safeIndex];
  const selectedImageKey = selectedImage.id || selectedImage.url || "fallback";
  const mainImageSrc = imageErrors[selectedImageKey]
    ? FALLBACK_IMAGE
    : selectedImage.url || FALLBACK_IMAGE;

  const showPrevious = () => {
    setSelectedIndex((current) =>
      current === 0 ? displayImages.length - 1 : current - 1,
    );
  };

  const showNext = () => {
    setSelectedIndex((current) =>
      current === displayImages.length - 1 ? 0 : current + 1,
    );
  };

  const handleImageError = (key: string) => {
    setImageErrors((current) => ({ ...current, [key]: true }));
  };

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-canvas sm:aspect-square">
        {badges.length > 0 && (
          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className="bg-white/95 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-charcoal shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {mainImageSrc ? (
          <Image
            src={mainImageSrc}
            alt={`${title} concept image`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            onError={() => handleImageError(selectedImageKey)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-charcoal-light">
            <ImageIcon className="h-10 w-10" aria-hidden="true" />
            <p className="text-xs uppercase tracking-[0.22em]">
              Artwork image coming soon
            </p>
          </div>
        )}

        {displayImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPrevious}
              className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/90 text-charcoal shadow-sm transition-colors hover:bg-charcoal hover:text-white"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={showNext}
              className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-white/90 text-charcoal shadow-sm transition-colors hover:bg-charcoal hover:text-white"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {displayImages.length > 1 && (
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-6">
          {displayImages.map((image, index) => {
            const key = image.id || image.url || `image-${index}`;
            const src = imageErrors[key]
              ? FALLBACK_IMAGE
              : image.url || FALLBACK_IMAGE;

            return (
              <button
                type="button"
                key={key}
                onClick={() => setSelectedIndex(index)}
                className={`relative aspect-square overflow-hidden border bg-canvas transition-colors ${
                  safeIndex === index
                    ? "border-charcoal"
                    : "border-border hover:border-gold"
                }`}
                aria-label={`View image ${index + 1}`}
              >
                <Image
                  src={src}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                  onError={() => handleImageError(key)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
