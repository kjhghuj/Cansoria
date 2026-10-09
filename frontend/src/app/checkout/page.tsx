"use client";

import { saveOrderConfirmation } from "@/lib/order-confirmation";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCart, useRegion } from "@/lib/providers";
import { formatPrice, getCart } from "@/lib/medusa";
import {
  confirmDelivery,
  deliveryDetailsKey,
  hasAuthorizedStripePayment,
  paymentTotalsMatch,
  prepareDelivery,
  type DeliveryOption,
} from "@/lib/checkout-delivery";
import type { StoreCart } from "@/lib/types";
import { portraitSummary } from "@/lib/portrait";
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
  "Online payment is temporarily unavailable. Please contact the studio for help with your order.";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;
const isStripeConfigured = Boolean(stripeKey);
const stripePromise = stripeKey
  ? loadStripe(stripeKey).catch(() => null)
  : Promise.resolve(null);

interface CheckoutApiResponse {
  cart?: StoreCart;
  client_secret?: string;
  message?: string;
  error?: string;
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
  { kind: "preview", title: "Commissions in preparation" },
  { kind: "guarantee", title: "Service details to be confirmed" },
  { kind: "shipping", title: "Delivery details to be confirmed" },
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
  const nameParts = name.trim().split(/\s+/);
  return {
    firstName: nameParts[0] || "",
    lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
  };
}

function CheckoutForm() {
  const { cart, cartLoading, refreshCart } = useCart();
  const { region } = useRegion();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submissionPending = useRef(false);
  const [addressKey, setAddressKey] = useState("");
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryChoice, setDeliveryChoice] = useState("");
  const [confirmedDeliveryKey, setConfirmedDeliveryKey] = useState("");
  const [cardReady, setCardReady] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(() =>
    hasAuthorizedStripePayment(cart),
  );
  const paidCartId = useRef(paymentConfirmed ? cart?.id : null);
  const [stripeUnavailable, setStripeUnavailable] =
    useState(!isStripeConfigured);
  useEffect(() => {
    let active = true;
    void stripePromise.then((client) => {
      if (active) setStripeUnavailable(!client);
    });
    return () => {
      active = false;
    };
  }, []);

  const [cardData, setCardData] = useState<CardData>({
    name: "",
  });

  const [billingData, setBillingData] = useState<BillingData>({
    name: [
      cart?.shipping_address?.first_name,
      cart?.shipping_address?.last_name,
    ]
      .filter(Boolean)
      .join(" "),
    phone: cart?.shipping_address?.phone ?? "",
    email: cart?.email ?? "",
    address: cart?.shipping_address?.address_1 ?? "",
    city: cart?.shipping_address?.city ?? "",
    postalCode: cart?.shipping_address?.postal_code ?? "",
    country: cart?.shipping_address?.country_code?.toLowerCase() ?? "",
  });
  const currentAddressKey = cart?.id
    ? deliveryDetailsKey(cart.id, billingData)
    : "";
  const addressReady = Boolean(addressKey && addressKey === currentAddressKey);
  const deliveryReady =
    addressReady &&
    confirmedDeliveryKey === `${currentAddressKey}:${deliveryChoice}` &&
    cart?.shipping_methods?.[0]?.shipping_option_id === deliveryChoice;
  const countries = cart?.region?.countries ?? region?.countries ?? [];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (submissionPending.current || cartLoading) return;

    if (!cart?.id || cart.items?.length === 0 || cart.completed_at) {
      if (cart?.completed_at) {
        void refreshCart().catch(() => setError(CART_EXPIRED_MESSAGE));
        router.push("/cart");
        return;
      }
      setError(CART_EXPIRED_MESSAGE);
      return;
    }

    submissionPending.current = true;
    setProcessing(true);
    setError(null);

    try {
      if (!paymentConfirmed) {
        if (!addressReady || deliveryOptions.length === 0) {
          if (
            !countries.some((country) => country.iso_2 === billingData.country)
          )
            throw new Error("Please select a supported delivery country.");
          setConfirmedDeliveryKey("");
          setCardReady(false);
          setAddressKey("");
          const options = await prepareDelivery(cart.id, billingData);
          await refreshCart();
          setDeliveryOptions(options);
          const existingOptionId =
            cart.shipping_methods?.[0]?.shipping_option_id;
          setDeliveryChoice(
            existingOptionId &&
              options.some((option) => option.id === existingOptionId)
              ? existingOptionId
              : "",
          );
          setAddressKey(currentAddressKey);
          if (!options.length)
            setError(
              "No delivery methods are available for this address. Please check your address or contact the studio.",
            );
          return;
        }
        if (!deliveryReady) {
          setCardReady(false);
          await confirmDelivery(cart.id, deliveryChoice, deliveryOptions);
          await refreshCart();
          setConfirmedDeliveryKey(`${currentAddressKey}:${deliveryChoice}`);
          return;
        }
        if (!stripe || !elements)
          throw new Error(PAYMENT_NOT_CONFIGURED_MESSAGE);
        const cardElement = elements.getElement(CardElement);
        if (!cardElement || !cardReady)
          throw new Error("Please complete your card details.");
        const latestCart = await getCart(cart.id);
        if (!latestCart || !paymentTotalsMatch(cart, latestCart)) {
          await refreshCart();
          setConfirmedDeliveryKey("");
          throw new Error(
            "Your order total or delivery has changed. Review the updated details and confirm delivery before paying.",
          );
        }

        const response = await fetch(
          `/api/checkout/${cart.id}/payment-sessions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider_id: "pp_stripe_stripe",
            }),
          },
        );

        if (!response.ok) {
          const errorData = (await response.json()) as CheckoutApiResponse;
          throw new Error(
            errorData.message || errorData.error || "Payment failed",
          );
        }

        const data = (await response.json()) as CheckoutApiResponse;
        if (!data.cart || !paymentTotalsMatch(cart, data.cart)) {
          await refreshCart();
          setConfirmedDeliveryKey("");
          throw new Error(
            "Your order total has changed. Review the updated total before paying.",
          );
        }
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
        if (
          !["succeeded", "requires_capture"].includes(
            result.paymentIntent?.status ?? "",
          )
        )
          throw new Error(PAYMENT_FAILED_MESSAGE);
        paidCartId.current = cart.id;
        setPaymentConfirmed(true);
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
        },
      );

      if (!completeResponse.ok) {
        const errorData =
          (await completeResponse.json()) as CompleteCartResponse;
        throw new Error(
          errorData.message || errorData.error || "Failed to complete order",
        );
      }

      const completeData =
        (await completeResponse.json()) as CompleteCartResponse;

      const orderData =
        completeData.order ||
        (completeData.type === "order" ? completeData.data : null);

      if (orderData?.id) {
        const { firstName: redirectFirstName, lastName: redirectLastName } =
          splitName(billingData.name);

        saveOrderConfirmation({
          orderId: orderData.id,
          email: billingData.email,
          firstName: redirectFirstName,
          lastName: redirectLastName,
        });
        router.push("/order/confirmed");

        refreshCart().catch((refreshError) =>
          console.error("Background cart refresh failed:", refreshError),
        );
      } else if (completeData.type === "cart") {
        throw new Error("Payment failed");
      } else {
        throw new Error(
          "Your order could not be confirmed. Please check your order status or contact the studio.",
        );
      }
    } catch (checkoutError: unknown) {
      setError(
        paidCartId.current === cart.id
          ? "Your payment was authorized, but your order could not be confirmed. Use Confirm Order to retry confirmation, or contact the studio."
          : getFriendlyCheckoutError(checkoutError),
      );
    } finally {
      submissionPending.current = false;
      setProcessing(false);
    }
  };

  const cartItems = cart?.items ?? [];
  const currencyCode = cart?.currency_code?.toUpperCase() || "GBP";
  const subtotal = cart?.item_subtotal || 0;
  const shipping =
    cart?.shipping_methods?.length && typeof cart.shipping_total === "number"
      ? cart.shipping_total
      : null;
  const tax = cart?.tax_total || 0;
  const discount = cart?.discount_total || 0;
  const total = cart?.total ?? subtotal;

  return (
    <>
      <CheckoutError error={error} onClear={() => setError(null)} />
      <form onSubmit={handleSubmit}>
        {stripeUnavailable && !paymentConfirmed && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">
              Online payment is temporarily unavailable.
            </p>
            <p className="mt-1 text-sm leading-6">
              {PAYMENT_NOT_CONFIGURED_MESSAGE}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_0.75fr] gap-8 items-start">
          <fieldset
            disabled={processing || cartLoading || paymentConfirmed}
            className="min-w-0"
          >
            <ContactForm
              billingData={billingData}
              setBillingData={setBillingData}
              cardData={cardData}
              setCardData={setCardData}
              countries={countries}
              showPayment={
                deliveryReady && !stripeUnavailable && !paymentConfirmed
              }
              onCardReady={setCardReady}
            />
          </fieldset>

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
                      {(portraitSummary(item.metadata)?.image ||
                        item.thumbnail) && (
                        <Image
                          src={
                            portraitSummary(item.metadata)?.image ||
                            item.thumbnail!
                          }
                          alt={item.product_title || "Custom artwork"}
                          fill
                          sizes="56px"
                          unoptimized
                          className="object-cover"
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
                      {portraitSummary(item.metadata) && (
                        <span className="block break-all text-xs text-charcoal-light">
                          {portraitSummary(item.metadata)?.style} ·{" "}
                          {portraitSummary(item.metadata)?.photoName}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-toffee">
                      {formatPrice(
                        item.total ?? (item.unit_price || 0) * item.quantity,
                        currencyCode,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mb-6 rounded-xl border border-dashed border-border bg-cream-card px-4 py-5 text-sm leading-6 text-charcoal-light">
                Your cart is empty. Add a bespoke pet portrait to see your order
                details here.
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

            {addressReady && deliveryOptions.length > 0 && (
              <fieldset
                disabled={processing || cartLoading || paymentConfirmed}
                className="my-6 space-y-3 border-t border-border pt-5"
              >
                <legend className="text-sm font-medium text-charcoal">
                  Delivery method
                </legend>
                {deliveryOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      name="delivery-method"
                      value={option.id}
                      checked={deliveryChoice === option.id}
                      onChange={() => {
                        setDeliveryChoice(option.id);
                        setConfirmedDeliveryKey("");
                      }}
                      className="accent-toffee"
                    />
                    <span className="min-w-0 flex-1">{option.name}</span>
                    <span>
                      {option.amount === 0
                        ? "Free"
                        : typeof option.amount === "number"
                          ? formatPrice(option.amount, currencyCode)
                          : "Confirmed before payment"}
                    </span>
                  </label>
                ))}
                {deliveryReady && (
                  <p role="status" className="text-xs text-green-700">
                    Delivery confirmed. Review the total above before paying.
                  </p>
                )}
              </fieldset>
            )}
            {paymentConfirmed && (
              <p role="status" className="my-4 text-sm text-green-700">
                Payment authorized. Finish confirming your order below.
              </p>
            )}
            <SubmitButton
              processing={processing}
              disabled={
                processing ||
                cartLoading ||
                !cartItems.length ||
                (!paymentConfirmed &&
                  ((addressReady &&
                    deliveryOptions.length > 0 &&
                    !deliveryChoice) ||
                    (deliveryReady && (!stripe || !elements || !cardReady))))
              }
              label={
                paymentConfirmed
                  ? "Confirm Order →"
                  : !addressReady || !deliveryOptions.length
                    ? "Continue to Delivery →"
                    : !deliveryReady
                      ? "Confirm Delivery →"
                      : !stripeUnavailable
                        ? "Place Order →"
                        : "Payment Unavailable"
              }
            />

            <p className="mt-4 text-center text-xs leading-5 text-charcoal-light">
              Commissions are in preparation. Production, previews, revisions
              and delivery arrangements will be confirmed before orders open.
            </p>
          </aside>
        </div>
      </form>
    </>
  );
}

export default function CheckoutPage() {
  const { cart } = useCart();
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
            Our service is in preparation. Production, previews, revisions and
            delivery arrangements will be confirmed before orders open.
          </p>
        </div>

        <Elements stripe={stripePromise}>
          <CheckoutForm key={cart?.id ?? "loading"} />
        </Elements>

        {/* Bottom trust strip */}
        <div className="mt-14 border-t border-border pt-10">
          <TrustBadgeGrid items={checkoutTrustItems} compact />
        </div>
      </div>
    </div>
  );
}
