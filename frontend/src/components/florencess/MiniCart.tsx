"use client";

import { useCallback, useEffect, useRef } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/providers";
import MiniCartPanel from "./MiniCartPanel";
import { useMiniCart } from "./MiniCartContext";

const PANEL_ID = "fl-minicart-panel";

/**
 * Header bag toggle plus its panel. Desktop opens a dropdown under the icon;
 * on small screens the same panel docks to the right edge over the shared
 * scrim (see lorencess-features.css). Focus moves into the panel on open and
 * back to the toggle on close; Escape and outside clicks close it.
 */
export default function MiniCart() {
  const { cartCount } = useCart();
  const { open, openMiniCart, closeMiniCart } = useMiniCart();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMiniCart();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
      closeMiniCart();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, closeMiniCart]);

  // Focus the panel heading when the panel opens; restore the toggle on close.
  useEffect(() => {
    if (open) {
      const heading = panelRef.current?.querySelector<HTMLElement>(".fl-minicart__title");
      heading?.focus();
      return;
    }
    toggleRef.current?.focus();
  }, [open]);

  const closeFromToggle = useCallback(() => {
    if (open) {
      closeMiniCart();
    } else {
      openMiniCart();
    }
  }, [open, openMiniCart, closeMiniCart]);

  return (
    <div className="fl-minicart" data-open={open ? "true" : "false"}>
      <button
        ref={toggleRef}
        type="button"
        className="fl-iconbtn"
        aria-label="Shopping bag"
        aria-expanded={open}
        aria-controls={PANEL_ID}
        onClick={closeFromToggle}
      >
        <ShoppingBag size={17} strokeWidth={1.4} />
        <span className="fl-iconbtn__count">({cartCount})</span>
      </button>

      <div
        className={`fl-scrim fl-minicart__scrim${open ? " is-open" : ""}`}
        onClick={closeMiniCart}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        id={PANEL_ID}
        className={`fl-minicart__panel${open ? " is-open" : ""}`}
        role="dialog"
        aria-label="Shopping bag"
        aria-modal="false"
        aria-hidden={!open}
      >
        <div className="fl-minicart__head">
          <h2 className="fl-minicart__title" tabIndex={-1}>
            Shopping Bag ({cartCount})
          </h2>
          <button
            type="button"
            className="fl-minicart__close"
            aria-label="Close bag"
            onClick={closeMiniCart}
          >
            <X size={18} strokeWidth={1.4} />
          </button>
        </div>
        {open ? <MiniCartPanel /> : null}
      </div>
    </div>
  );
}
