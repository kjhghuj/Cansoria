"use client";

import { useState } from "react";
import type { FlImage } from "@/lib/florencess-catalog";

/**
 * Reference PDP gallery: vertical thumbnail rail on the left, square main
 * image, prev/next arrows. Thumbnails are buttons so the gallery is reachable
 * by keyboard; the main image is announced through aria-live.
 */
export default function ProductGallery({ images, title }: { images: FlImage[]; title: string }) {
  const [active, setActive] = useState(0);
  if (!images.length) return null;
  const current = images[Math.min(active, images.length - 1)];
  const step = (delta: number) =>
    setActive((value) => (value + delta + images.length) % images.length);

  return (
    <div className="fl-gallery">
      {images.length > 1 ? (
        <ul className="fl-gallery__thumbs">
          {images.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                className="fl-gallery__thumb"
                aria-current={index === active}
                aria-label={`Show image ${index + 1} of ${images.length}`}
                onClick={() => setActive(index)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.src} alt="" loading="lazy" width={72} height={72} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="fl-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt || title}
          width={1000}
          height={1000}
          aria-live="polite"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              className="fl-gallery__nav fl-gallery__nav--prev"
              onClick={() => step(-1)}
              aria-label="Previous image"
            >
              &lsaquo;
            </button>
            <button
              type="button"
              className="fl-gallery__nav fl-gallery__nav--next"
              onClick={() => step(1)}
              aria-label="Next image"
            >
              &rsaquo;
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
