"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import { useCart, useStoreStatus } from "@/lib/providers";
import { formatPrice } from "@/lib/money";
import { clampQuantity } from "@/lib/mini-cart";
import { useMiniCart } from "./MiniCartContext";

type RowState = { pending: "updating" | "removing" | null; error: string | null };

/**
 * Panel body with four distinct states: loading (first fetch, no cart yet),
 * error with retry (never rendered as an empty bag), empty, and the item list
 * with per-row quantity/remove controls. A failed row operation shows its
 * error on that row only; other rows keep working.
 */
export default function MiniCartPanel() {
  const { cart, cartLoading, cartError, updateItem, removeItem, refreshCart } = useCart();
  const { ordersOpen } = useStoreStatus();
  const { closeMiniCart } = useMiniCart();
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const setRow = useCallback((id: string, patch: Partial<RowState>) => {
    setRows((current) => {
      const existing: RowState = current[id] ?? { pending: null, error: null };
      return { ...current, [id]: { ...existing, ...patch } };
    });
  }, []);

  const changeQuantity = useCallback(
    async (id: string, quantity: number) => {
      try {
        setRow(id, { pending: "updating", error: null });
        await updateItem(id, clampQuantity(quantity));
        setRow(id, { pending: null, error: null });
      } catch {
        setRow(id, { pending: null, error: "Could not update this item. Please retry." });
      }
    },
    [updateItem, setRow],
  );

  const removeRow = useCallback(
    async (id: string) => {
      try {
        setRow(id, { pending: "removing", error: null });
        await removeItem(id);
        setRows((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
      } catch {
        setRow(id, { pending: null, error: "Could not remove this item. Please retry." });
      }
    },
    [removeItem, setRow],
  );

  if (cartError) {
    return (
      <div className="fl-minicart__body">
        <p role="alert" className="fl-minicart__error">
          {cartError}
        </p>
        <button type="button" className="fl-minicart__retry" onClick={() => refreshCart()}>
          Retry
        </button>
      </div>
    );
  }

  if (!cart && cartLoading) {
    return (
      <div className="fl-minicart__body" aria-busy="true">
        <p className="fl-minicart__muted">Loading your bag…</p>
      </div>
    );
  }

  const items = cart?.items ?? [];
  if (!items.length) {
    return (
      <div className="fl-minicart__body">
        <p className="fl-minicart__muted">Your bag is empty.</p>
        <Link className="fl-minicart__cta" href="/new" onClick={closeMiniCart}>
          Start Shopping
        </Link>
      </div>
    );
  }

  const currency = cart?.currency_code ?? "usd";
  const subtotal = cart?.subtotal ?? 0;

  return (
    <>
      <ul className="fl-minicart__items">
        {items.map((item) => {
          const state: RowState = rows[item.id] ?? { pending: null, error: null };
          const disabled = state.pending !== null || cartLoading;
          const name = item.product_title || item.title || "Item";
          return (
            <li className="fl-minicart__row" key={item.id}>
              {item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="fl-minicart__thumb" src={item.thumbnail} alt="" loading="lazy" width={56} height={56} />
              ) : (
                <span className="fl-minicart__thumb fl-minicart__thumb--empty" aria-hidden="true" />
              )}
              <div className="fl-minicart__meta">
                {item.product_handle ? (
                  <Link className="fl-minicart__name" href={`/${item.product_handle}`} onClick={closeMiniCart}>
                    {name}
                  </Link>
                ) : (
                  <span className="fl-minicart__name">{name}</span>
                )}
                {item.variant_title ? (
                  <span className="fl-minicart__variant">{item.variant_title}</span>
                ) : null}
                <span className="fl-minicart__price">{formatPrice(item.unit_price, currency)}</span>
                {state.error ? (
                  <span role="alert" className="fl-minicart__row-error">
                    {state.error}
                  </span>
                ) : null}
              </div>
              <div className="fl-minicart__actions">
                <div className="fl-minicart__qty">
                  <button
                    type="button"
                    aria-label={`Decrease quantity of ${name}`}
                    disabled={disabled || item.quantity <= 1}
                    onClick={() => changeQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus size={12} strokeWidth={1.6} />
                  </button>
                  <span aria-label={`Quantity of ${name}`}>{item.quantity}</span>
                  <button
                    type="button"
                    aria-label={`Increase quantity of ${name}`}
                    disabled={disabled || item.quantity >= 99}
                    onClick={() => changeQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus size={12} strokeWidth={1.6} />
                  </button>
                </div>
                <button
                  type="button"
                  className="fl-minicart__remove"
                  aria-label={`Remove ${name}`}
                  disabled={disabled}
                  onClick={() => removeRow(item.id)}
                >
                  <X size={14} strokeWidth={1.4} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fl-minicart__foot">
        <div className="fl-minicart__subtotal">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal, currency)}</span>
        </div>
        <div className="fl-minicart__buttons">
          <Link className="fl-minicart__cta" href="/cart" onClick={closeMiniCart}>
            View Bag
          </Link>
          {ordersOpen ? (
            <Link className="fl-minicart__cta fl-minicart__cta--primary" href="/checkout" onClick={closeMiniCart}>
              Checkout
            </Link>
          ) : (
            <button type="button" className="fl-minicart__cta fl-minicart__cta--primary" disabled>
              Checkout
            </button>
          )}
        </div>
        {!ordersOpen ? (
          <p className="fl-minicart__muted">Checkout is currently unavailable.</p>
        ) : null}
      </div>
    </>
  );
}
