"use client";

import { saveOrderConfirmation } from "@/lib/order-confirmation";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart } from "@/lib/providers";
import { formatPrice } from "@/lib/medusa";
import { CheckoutError } from "./components/CheckoutError";
import { BillingData, CardData, ContactForm } from "./components/ContactForm";
import { SubmitButton } from "./components/SubmitButton";
import { TrustBadgeGrid } from "@/components/TrustBadgeGrid";
import type { TrustBadgeItem } from "@/components/TrustBadgeGrid";

const CART_EXPIRED_MESSAGE =
  "Your cart session expired. Please add your artwork again.";
const PAYMENT_FAILED_MESSAGE =
  "Payment could not be completed. Please try another card or contact support.";
const PAYMENT_NOT_CONFIGURED_MESSAGE =
  "Payment is not configured for this environment. Add NEXT_PUBLIC_STRIPE_KEY and the backend Stripe secret to complete checkout.";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;
const isStripeConfigured = Boolean(stripeKey);
const stripePromise = stripeKey ? loadStripe(stripeKey) : Promise.resolve(null);

interface CheckoutApiResponse {
  client_secret?: string;
  message?: string;
  error?: string;
}

interface ShippingOption {
  id: string;
  name?: string;
}

interface ShippingOptionsResponse {
  shipping_options?: ShippingOption[];
}

interface CompleteCartResponse {
  order?: { id?: string };
  type?: string;
  data?: { id?: string };
  message?: string;
  error?: string;
}

const checkoutTrustItems: TrustBadgeItem[] = [
  { kind: "secure", title: "Secure checkout" },
  { kind: "preview", title: "Free preview before shipping" },
  { kind: "guarantee", title: "Satisfaction guarantee" },
  { kind: "shipping", title: "Worldwide shipping" },
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

function getFriendlyCheckoutError(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("cart not found") ||
    normalized.includes("invalid cart") ||
    normalized.includes("cart session") ||
    normalized.includes("cart is empty") ||
    normalized.includes("already completed")
  ) {
    return CART_EXPIRED_MESSAGE;
  }

  if (
    normalized.includes("payment") ||
    normalized.includes("card") ||
    normalized.includes("stripe") ||
    normalized.includes("declined")
  ) {
    return PAYMENT_FAILED_MESSAGE;
  }

  return message || "Checkout could not be completed. Please try again.";
}

function splitName(name: string) {
  const nameParts = name.trim().split(" ");
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
  };
}

function CheckoutForm() {
  const { cart, refreshCart } = useCart();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cardData, setCardData] = useState<CardData>({
    name: "",
  });

  const [billingData, setBillingData] = useState<BillingData>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError(PAYMENT_NOT_CONFIGURED_MESSAGE);
      return;
    }

    if (!cart?.id || cart.items?.length === 0 || cart.completed_at) {
      if (cart?.completed_at) {
        refreshCart();
        router.push("/cart");
        return;
      }
      setError(CART_EXPIRED_MESSAGE);
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setProcessing(true);
    setError(null);

    try {
      const { firstName, lastName } = splitName(billingData.name);

      const updateCartResponse = await fetch(`/api/medusa/store/carts/${cart.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key":
            process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
        },
        body: JSON.stringify({
          email: billingData.email,
          shipping_address: {
            first_name: firstName,
            last_name: lastName,
            phone: billingData.phone,
            address_1: billingData.address,
            city: billingData.city,
            country_code: billingData.country,
            postal_code: billingData.postalCode,
          },
          billing_address: {
            first_name: firstName,
            last_name: lastName,
            phone: billingData.phone,
            address_1: billingData.address,
            city: billingData.city,
            country_code: billingData.country,
            postal_code: billingData.postalCode,
          },
        }),
      });

      if (!updateCartResponse.ok) {

        throw new Error("Failed to save shipping information.");
      }

      const shippingOptionsResponse = await fetch(
        `/api/medusa/store/shipping-options?cart_id=${cart.id}`,
        {
          headers: {
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      );

      if (shippingOptionsResponse.ok) {
        const { shipping_options } =
          (await shippingOptionsResponse.json()) as ShippingOptionsResponse;
        if (shipping_options && shipping_options.length > 0) {
          const defaultOption = shipping_options[0];

          await fetch(`/api/medusa/store/carts/${cart.id}/shipping-methods`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-publishable-api-key":
                process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
            },
            body: JSON.stringify({ option_id: defaultOption.id }),
          });
        }
      }

      const response = await fetch(`/api/checkout/${cart.id}/payment-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: "pp_stripe_stripe",
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as CheckoutApiResponse;
        throw new Error(errorData.message || errorData.error || "Payment failed");
      }

      const data = (await response.json()) as CheckoutApiResponse;
      const clientSecret = data.client_secret;

      if (!clientSecret) {
        throw new Error("Payment failed");
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardData.name || billingData.name,
            email: billingData.email,
            phone: billingData.phone,
            address: {
              line1: billingData.address,
              city: billingData.city,
              postal_code: billingData.postalCode,
              country: billingData.country,
            },
          },
        },
      });

      if (result.error) {

        throw new Error(result.error.message || "Payment failed");
      }

      const completeResponse = await fetch(
        `/api/medusa/store/carts/${cart.id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key":
              process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      );

      if (!completeResponse.ok) {
        const errorData = (await completeResponse.json()) as CompleteCartResponse;
        throw new Error(
          errorData.message || errorData.error || "Failed to complete order"
        );
      }

      const completeData = (await completeResponse.json()) as CompleteCartResponse;

      const orderData =
        completeData.order ||
        (completeData.type === "order" ? completeData.data : null);

      if (orderData?.id) {
        const { firstName: redirectFirstName, lastName: redirectLastName } =
          splitName(billingData.name);

        saveOrderConfirmation({ orderId: orderData.id, email: billingData.email, firstName: redirectFirstName, lastName: redirectLastName });
        router.push("/order/confirmed");

        refreshCart().catch((refreshError) =>
          console.error("Background cart refresh failed:", refreshError)
        );
      } else if (completeData.type === "cart") {
        throw new Error("Payment failed");
      } else {

        await refreshCart();
        router.push("/account");
      }
    } catch (checkoutError: unknown) {

      setError(getFriendlyCheckoutError(checkoutError));
    } finally {
      setProcessing(false);
    }
  };

  const cartItems = cart?.items ?? [];
  const currencyCode = cart?.currency_code?.toUpperCase() || "GBP";
  const subtotal = cart?.item_subtotal || 0;
  const shipping = typeof cart?.shipping_total === "number" ? cart.shipping_total : null;
  const tax = cart?.tax_total || 0;
  const discount = cart?.discount_total || 0;
  const total = cart?.total || subtotal;

  return (
    <>
      <CheckoutError error={error} onClear={() => setError(null)} />
      <form onSubmit={handleSubmit}>
        {!isStripeConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">Payment is unavailable locally.</p>
            <p className="mt-1 text-sm leading-6">
              {PAYMENT_NOT_CONFIGURED_MESSAGE}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-8 items-start">
          <ContactForm
            billingData={billingData}
            setBillingData={setBillingData}
            cardData={cardData}
            setCardData={setCardData}
          />

          {/* Order summary sidebar */}
          <aside className="rounded-2xl border border-border-subtle bg-cream-light p-6 sm:p-8 shadow-[0_8px_28px_rgba(38,34,30,0.06)] lg:sticky lg:top-28">
            <h2 className="mb-6 font-serif text-xl text-charcoal">
              Order Summary
            </h2>

            {cartItems.length > 0 ? (
              <ul className="mb-6 space-y-4">
                {cartItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-canvas">
                      {item.thumbnail && (
                        <img
                          src={item.thumbnail}
                          alt={item.product_title || "Custom artwork"}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-charcoal">
                        {item.product_title || "Custom artwork"}
                      </span>
                      <span className="block text-xs text-charcoal-light">
                        {item.variant_title ? `${item.variant_title} · ` : ""}
                        Qty {item.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-toffee">
                      {formatPrice(item.total ?? (item.unit_price || 0) * item.quantity, currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-6 rounded-xl border border-dashed border-border bg-cream-card px-4 py-5 text-sm leading-6 text-charcoal-light">
                Your cart is empty. Add a bespoke pet portrait to see your
                order details here.
              </div>
            )}

            <div className="space-y-3 border-t border-border-subtle pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">Subtotal</span>
                <span className="font-medium text-charcoal">
                  {formatPrice(subtotal, currencyCode)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount</span>
                  <span className="font-medium">
                    -{formatPrice(discount, currencyCode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-light">Shipping</span>
                <span className="font-medium text-charcoal">
                  {shipping === null
                    ? "Calculated at payment"
                    : shipping === 0
                      ? "Free"
                      : formatPrice(shipping, currencyCode)}
                </span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-charcoal-light">Tax</span>
                  <span className="font-medium text-charcoal">
                    {formatPrice(tax, currencyCode)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border-subtle pt-4">
                <span className="font-serif text-lg text-charcoal">Total</span>
                <span className="font-serif text-2xl font-medium text-charcoal">
                  {formatPrice(total, currencyCode)}
                </span>
              </div>
            </div>

            <SubmitButton
              processing={processing}
              disabled={processing || !stripe || !elements}
              label={isStripeConfigured ? "Place Order →" : "Payment Unavailable"}
            />

            <p className="mt-4 text-center text-xs leading-5 text-charcoal-light">
              After checkout we request your photo reference and send a free
              preview before anything ships.
            </p>
          </aside>
        </div>
      </form>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-cream pb-16 pt-24">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Link
          href="/cart"
          className="mb-6 inline-block text-sm text-charcoal-light hover:text-toffee transition-colors"
        >
          ← Back to Cart
        </Link>

        <div className="mb-10">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-toffee">
            Cansoria Checkout
          </p>
          <h1 className="font-serif text-4xl lg:text-5xl text-charcoal">
            Checkout
          </h1>
          <p className="mt-4 leading-7 text-charcoal-light">
            Your artwork is protected by our satisfaction guarantee — you will
            receive a free preview before your painting ships.
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm />
        </Elements>

        {/* Bottom trust strip */}
        <div className="mt-14 border-t border-border pt-10">
          <TrustBadgeGrid items={checkoutTrustItems} compact />
        </div>
      </div>
    </div>
  );
}
