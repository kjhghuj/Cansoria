import Link from "next/link";
import { portraitStylesUrl } from "@/lib/portrait";
import { Check, ShieldCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/money";
import type { StoreCart } from "@/lib/types";

interface OrderSummaryProps {
  cart: StoreCart;
  subtotal: number;
  shipping: number | null;
  tax: number;
  discount: number;
  total: number;
  currencyCode: string;
  itemCount: number;
  isLoading: boolean;
}

export default function OrderSummary({
  cart,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  currencyCode,
  itemCount,
  isLoading,
}: OrderSummaryProps) {
  const hasDelivery = Boolean(cart.shipping_methods?.length);
  const checkoutClass =
    "flex w-full items-center justify-center rounded-full bg-toffee px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-toffee-dark";
  return (
    <aside className="sticky top-28 rounded-2xl border border-border-subtle bg-cream-light p-6 shadow-[0_8px_28px_rgba(38,34,30,0.06)] lg:p-8">
      <h2 className="mb-6 font-serif text-xl text-charcoal">Order Summary</h2>
      <p className="mb-6 text-sm leading-6 text-charcoal-light">
        Enter your address at checkout to choose delivery and confirm the final
        total.
      </p>
      <dl className="space-y-3 border-t border-border pt-6 text-sm">
        <div className="flex justify-between gap-3">
          <dt>Artwork subtotal</dt>
          <dd>{formatPrice(subtotal, currencyCode)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between gap-3 text-green-700">
            <dt>Discount</dt>
            <dd>−{formatPrice(discount, currencyCode)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt>Delivery</dt>
          <dd className="text-right">
            {hasDelivery && shipping !== null
              ? shipping === 0
                ? "Free"
                : formatPrice(shipping, currencyCode)
              : "Calculated at checkout"}
          </dd>
        </div>
        {tax > 0 && (
          <div className="flex justify-between gap-3">
            <dt>Tax</dt>
            <dd>{formatPrice(tax, currencyCode)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3 border-t border-border pt-4 font-serif text-xl">
          <dt>{hasDelivery ? "Total" : "Estimated total"}</dt>
          <dd>{formatPrice(total, currencyCode)}</dd>
        </div>
      </dl>
      <div className="mt-8 space-y-4">
        {isLoading || itemCount === 0 ? (
          <button
            type="button"
            disabled
            className={`${checkoutClass} cursor-not-allowed opacity-50`}
          >
            Updating your cart…
          </button>
        ) : (
          <Link href="/checkout" className={checkoutClass}>
            Proceed to Checkout →
          </Link>
        )}
        <a
          href={portraitStylesUrl}
          className="block py-2 text-center text-xs uppercase tracking-widest text-charcoal-light hover:text-toffee"
        >
          Continue Shopping
        </a>
      </div>
      <div className="mt-8 space-y-3 border-t border-border pt-6 text-xs text-charcoal-light">
        <p className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-toffee" aria-hidden="true" />
          Secure checkout
        </p>
        <p className="flex items-center gap-2">
          <Check className="h-4 w-4 text-toffee" aria-hidden="true" />
          Commissions in preparation
        </p>
        <p className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-toffee" aria-hidden="true" />
          Delivery details to be confirmed
        </p>
      </div>
    </aside>
  );
}
