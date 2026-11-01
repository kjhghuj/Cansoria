"use client";

import { useState } from "react";
import { useCart, useRegion, useStoreStatus } from "@/lib/providers";
import type { FlProduct } from "@/lib/florencess-catalog";
import type { FlVariant } from "@/lib/florencess-variants";
import {
  defaultFlSelection,
  flProductHasVariants,
  resolveFlVariant,
  resolveVariantFrom,
} from "@/lib/florencess-variants";

/**
 * Option selectors, quantity stepper and the purchase action.
 *
 * The reference theme requires an explicit option choice, so the select starts
 * on the "Please Select" placeholder. A product can be added to the cart only
 * when a Medusa variant mapping exists for the chosen combination; otherwise the
 * button is disabled and a notice explains the state. This is the deliberate
 * unmapped state required while the catalogue has no imported variants — the
 * slug is never used as a variant id and no stock is implied.
 *
 * `variants` injects a Medusa-sourced variant list (see medusa-catalog.ts);
 * without it the local mapping table is used, unchanged.
 */
export default function ProductBuy({
  product,
  variants,
}: {
  product: FlProduct;
  variants?: FlVariant[];
}) {
  const { addItem } = useCart();
  const { region, regionLoading } = useRegion();
  const { ordersOpen, storeStatusLoading } = useStoreStatus();
  const hasInjectedVariants = variants !== undefined;
  const mapped = hasInjectedVariants ? variants.length > 0 : flProductHasVariants(product);
  const [selection, setSelection] = useState<Record<string, string>>(() =>
    mapped ? defaultFlSelection(product) : {},
  );
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");
  const [added, setAdded] = useState(false);
  const variant = !mapped
    ? null
    : hasInjectedVariants
      ? resolveVariantFrom(variants, product.options, selection)
      : resolveFlVariant(product, selection);
  const complete = product.options.every((option) => selection[option.name]);

  const purchaseReady = mapped && !regionLoading && !!region && !storeStatusLoading && ordersOpen;
  const notice = !mapped
    ? hasInjectedVariants
      ? "This piece is currently sold out."
      : "This piece is shown for reference only: online purchase is not enabled for it yet."
    : regionLoading || storeStatusLoading
      ? "Checking online purchase availability."
      : !region || !ordersOpen
        ? "Online purchasing is not currently available."
        : !complete
          ? "Choose every option to continue."
          : !variant
            ? "This combination is not available."
            : null;

  return (
    <>
      {product.options.length ? (
        <div className="fl-pdp__options">
          {product.options.map((option) => (
            <div className="fl-pdp__option" key={option.id}>
              <label className="fl-pdp__option-label" htmlFor={`option-${option.id}`}>
                {option.name}
              </label>
              <select
                id={`option-${option.id}`}
                className="fl-pdp__select"
                value={selection[option.name] ?? ""}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setSelection((current) => ({ ...current, [option.name]: value }));
                }}
              >
                <option value="">--- Please Select ---</option>
                {option.values.map((value) => (
                  <option key={value.value} value={value.label}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      <div className="fl-pdp__buy">
        <div className="fl-qty">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <input
            type="number"
            min={1}
            max={99}
            value={quantity}
            aria-label="Quantity"
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              setQuantity(Number.isFinite(next) ? Math.min(99, Math.max(1, Math.trunc(next))) : 1);
            }}
          />
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="fl-pdp__add"
          disabled={!purchaseReady || !variant || !complete || pending}
          aria-describedby="fl-pdp-availability"
          onClick={async () => {
            if (!purchaseReady || !variant || !complete || pending) return;
            setPending(true);
            setAdded(false);
            setPurchaseError("");
            try {
              await addItem(variant.id, quantity);
              setAdded(true);
            } catch {
              setPurchaseError("Adding this item failed. Your cart was not updated; please retry.");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending
            ? "Adding…"
            : purchaseReady && variant
              ? "Add to Cart"
              : hasInjectedVariants && !mapped
                ? "Sold Out"
                : "Not Available Online"}
        </button>
      </div>

      {notice ? (
        <p id="fl-pdp-availability" className="fl-pdp__notice">
          <strong>Availability.</strong> {notice}
        </p>
      ) : (
        <p id="fl-pdp-availability" className="fl-pdp__notice">
          Select a quantity and add this available variant to your cart.
        </p>
      )}
      {purchaseError ? <p role="alert" className="fl-form__status fl-form__status--error">{purchaseError}</p> : null}
      {added ? <p role="status" className="fl-form__status fl-form__status--ok">Added to cart.</p> : null}
    </>
  );
}
