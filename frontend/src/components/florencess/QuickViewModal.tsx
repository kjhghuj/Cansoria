"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { FlImage, FlOption, FlProduct } from "@/lib/florencess-catalog";
import type { FlVariant } from "@/lib/florencess-variants";
import ProductBuy from "./ProductBuy";
import ProductGallery from "./ProductGallery";
import WishlistButton from "./WishlistButton";
import { useMiniCart } from "./MiniCartContext";

type QuickViewPayload = {
  title: string;
  slug: string;
  price: string;
  oldPrice: string;
  discount: string;
  description: string;
  images: FlImage[];
  options: FlOption[];
  variants: FlVariant[];
  purchasable: boolean;
};

type QuickViewState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: QuickViewPayload };

/**
 * Product quick view. Fetches /api/quickview/:slug (cancelled on close),
 * renders loading / retryable error / success states, and locks focus inside
 * the dialog while open. Escape and scrim clicks close it; focus returns to
 * the trigger. A successful add-to-cart closes into the mini cart.
 */
export default function QuickViewModal({
  slug,
  onClose,
  triggerRef,
}: {
  slug: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const [state, setState] = useState<QuickViewState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const { openMiniCart } = useMiniCart();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/quickview/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 503) throw new Error("unavailable");
        if (!response.ok) throw new Error("failed");
        return (await response.json()) as QuickViewPayload;
      })
      .then((data) => {
        if (active) setState({ status: "ready", payload: data });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            cause instanceof Error && cause.message === "unavailable"
              ? "The catalogue is temporarily unavailable. Please try again shortly."
              : "This item could not be loaded. Please try again.",
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [slug, reloadKey]);

  // Focus the dialog, keep Tab inside it, and stop the page behind scrolling.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "button, a[href], select, input, [tabindex]:not([tabindex='-1'])",
    );
    first?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], select, input, [tabindex]:not([tabindex='-1'])",
      );
      if (!focusables || focusables.length === 0) return;
      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  // Focus restoration happens after unmount: reach through the trigger ref.
  useEffect(
    () => () => {
      triggerRef.current?.focus();
    },
    [triggerRef],
  );

  const closeIntoMiniCart = useCallback(() => {
    onClose();
    openMiniCart();
  }, [onClose, openMiniCart]);

  const payload = state.status === "ready" ? state.payload : null;
  const error = state.status === "error" ? state.message : null;

  const syntheticProduct: FlProduct | null = payload
    ? {
        id: `quickview:${payload.slug}`,
        slug: payload.slug,
        title: payload.title,
        model: "",
        brand: "",
        description: payload.description,
        price: payload.price,
        oldPrice: payload.oldPrice,
        discount: payload.discount,
        currency: "",
        availability: payload.purchasable ? "InStock" : "SoldOut",
        options: payload.options,
        localImages: payload.images,
        pageCaptured: false,
      }
    : null;

  return (
    <div className="fl-quickview__scrim" onClick={onClose} aria-hidden="true">
      <div
        ref={dialogRef}
        className="fl-quickview"
        role="dialog"
        aria-modal="true"
        aria-label={payload ? `Quick view: ${payload.title}` : "Quick view"}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="fl-quickview__close" aria-label="Close quick view" onClick={onClose}>
          <X size={18} strokeWidth={1.4} />
        </button>

        {error ? (
          <div className="fl-quickview__state">
            <p role="alert">{error}</p>
            <button
              type="button"
              className="fl-minicart__retry"
              onClick={() => {
                setState({ status: "loading" });
                setReloadKey((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : !payload || !syntheticProduct ? (
          <div className="fl-quickview__state" aria-busy="true">
            <p>Loading…</p>
          </div>
        ) : (
          <div className="fl-quickview__grid">
            <ProductGallery images={payload.images} title={payload.title} />
            <div className="fl-quickview__info">
              <h2 className="fl-quickview__title">{payload.title}</h2>
              <div className="fl-pdp__price">
                <span>{payload.price || "Price unavailable"}</span>
                {payload.oldPrice ? <span className="fl-pdp__price-old">{payload.oldPrice}</span> : null}
                {payload.discount ? <span className="fl-pdp__discount">{payload.discount}</span> : null}
              </div>
              {payload.description ? <p className="fl-quickview__desc">{payload.description}</p> : null}
              <ProductBuy
                product={syntheticProduct}
                variants={payload.variants}
                onAdded={closeIntoMiniCart}
              />
              <div className="fl-quickview__row">
                <WishlistButton
                  slug={payload.slug}
                  title={payload.title}
                  image={payload.images[0]?.src ?? "/"}
                  price={payload.price}
                />
                <Link className="fl-quickview__details" href={`/${payload.slug}`}>
                  View full details
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
