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

const postCheckoutSteps = [
  "Place your secure order",
  "Upload your photo reference",
  "Review your digital preview",
  "Approve shipping for your canvas",
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

  return (
    <>
      <CheckoutError error={error} onClear={() => setError(null)} />
      <form onSubmit={handleSubmit}>
        {!isStripeConfigured && (
          <div className="mb-6 border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <p className="font-medium">Payment is unavailable locally.</p>
            <p className="mt-1 text-sm leading-6">
              {PAYMENT_NOT_CONFIGURED_MESSAGE}
            </p>
          </div>
        )}
        <ContactForm
          billingData={billingData}
          setBillingData={setBillingData}
          cardData={cardData}
          setCardData={setCardData}
        />
        <SubmitButton
          processing={processing}
          disabled={processing || !stripe || !elements}
          label={isStripeConfigured ? "Pay Securely" : "Payment Unavailable"}
        />
      </form>
    </>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-cream pb-16 pt-24">
      <div className="mx-auto max-w-[920px] px-4 sm:px-6">
        <Link
          href="/cart"
          className="mb-6 inline-block text-charcoal-light hover:text-terracotta"
        >
          Back to Cart
        </Link>

        <div className="mb-8">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-terracotta">
            Cansoria Checkout
          </p>
          <h1 className="font-serif text-4xl text-charcoal">Secure Checkout</h1>
          <p className="mt-4 leading-7 text-charcoal-light">
            Your artwork is protected by our satisfaction guarantee.
          </p>
          <p className="mt-2 leading-7 text-charcoal-light">
            You will receive a preview before your painting ships.
          </p>
          <TrustBadgeGrid items={checkoutTrustItems} compact className="mt-6" />
        </div>

        <div className="border border-border bg-white p-5 sm:p-8">
          <div className="mb-8 border-b border-border pb-6">
            <h2 className="font-serif text-xl text-charcoal">
              What Happens After Checkout
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {postCheckoutSteps.map((step, index) => (
                <div key={step} className="text-sm leading-6 text-charcoal-light">
                  <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-terracotta">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          <Elements stripe={stripePromise}>
            <CheckoutForm />
          </Elements>
        </div>
      </div>
    </div>
  );
}
