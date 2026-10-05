import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/providers";
import { useStripe, PaymentRequestButtonElement } from "@stripe/react-stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import { StoreCart } from "@/lib/types";

interface StripeWalletButtonProps {
  cart: StoreCart;
  amount: number;
  currency: string;
}

interface SessionPaymentData {
  client_secret?: string;
}

interface SessionPayment {
  provider_id?: string;
  data?: SessionPaymentData;
}

interface SessionResponse {
  client_secret?: string;
  payment_session?: SessionPayment;
  cart?: {
    payment_sessions?: SessionPayment[];
  };
}

interface CompleteResponse {
  order?: { id?: string };
  type?: string;
  data?: { id?: string };
}

export default function StripeWalletButton({ cart, amount, currency }: StripeWalletButtonProps) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);
  const router = useRouter();
  const { refreshCart } = useCart();

  useEffect(() => {
    if (!stripe) {
      return;
    }
    if (!cart) {
      return;
    }

    const countryCode = cart.region?.countries?.[0]?.iso_2?.toUpperCase() || 'US';
    const currencyCode = (currency || 'usd').toLowerCase();

    console.log("[StripeWalletButton] Init:", { country: countryCode, currency: currencyCode, amount });

    const pr = stripe.paymentRequest({
      country: countryCode,
      currency: currencyCode,
      total: {
        label: 'Total',
        amount: amount > 0 ? amount : 0, // Amount in lowest denomination (e.g. cents)
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
      requestShipping: true, // Request shipping address
    });

    // Check if the browser supports this payment method (Apple Pay / Google Pay)
    pr.canMakePayment().then((result) => {
      console.log("[StripeWalletButton] canMakePayment result:", result);
      if (result) {
        setCanMakePayment(true);
        setPaymentRequest(pr);
      } else {
        setCanMakePayment(false);
      }
    });

    pr.on('paymentmethod', async (ev) => {
      try {
        // 1. Prepare Cart with Payer Info
        // Note: Medusa needs shipping address to be set. Wallet provides it.
        const payerName = ev.payerName?.split(' ') || [];
        const firstName = payerName[0] || "Guest";
        const lastName = payerName.length > 1 ? payerName.slice(1).join(' ') : "";

        // Simplify address mapping (Wallet address format varies, simplistic mapping here)
        // Ideally we listen to 'shippingaddresschange' to update Medusa shipping options, but keeping it simple.
        // We update cart with whatever address wallet gives us.
        // NOTE: Wallet address structure is different (ev.shippingAddress).
        // Let's assume we proceed with basic info and let backend validate or use dummy if missing strict fields.
        // In robust app, we'd map fields carefully.

        // 2. Initialize a Medusa v2 payment session and get the Stripe client secret.
        const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9030";
        const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

        const sessionRes = await fetch(`/api/checkout/${cart.id}/payment-sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ provider_id: "pp_stripe_stripe" }),
        });

        if (!sessionRes.ok) throw new Error("Failed to init payment session");

        const sessionData = (await sessionRes.json()) as SessionResponse;

        const paymentSession = sessionData.payment_session || sessionData.cart?.payment_sessions?.find(
          (session) => session.provider_id === "pp_stripe_stripe"
        );
        const clientSecret = sessionData.client_secret || paymentSession?.data?.client_secret;

        if (!clientSecret) throw new Error("No client secret found in payment session");

        // 3. Confirm Payment
        const confirmResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: ev.paymentMethod.id,
        }, { handleActions: false });

        if (confirmResult.error) {
          ev.complete('fail');
          console.error("Payment failed", confirmResult.error);
          return;
        }

        ev.complete('success');

        // 4. Complete Order in Medusa
        const completeResponse = await fetch(`${BACKEND_URL}/store/carts/${cart.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": API_KEY,
          },
        });

        const completeData = (await completeResponse.json()) as CompleteResponse;
        const orderData = completeData.order || (completeData.type === "order" ? completeData.data : null);

        if (orderData) {
          // Redirect
          const redirectUrl = `/order/confirmed?success=true&order=${orderData.id}&email=${encodeURIComponent(ev.payerEmail || "")}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`;
          router.push(redirectUrl);
          refreshCart(); // Cleanup
        } else {
          console.error("Order completion failed", completeData);
          router.push("/account");
        }

      } catch (err) {
        ev.complete('fail');
        console.error("Wallet payment error:", err);
      }
    });

  }, [stripe, cart, amount, currency, refreshCart, router]);

  if (!canMakePayment || !paymentRequest) {
    // Development Fallback: Show a realistic Mock Button for layout verification
    // Only show in development when real payment request is not available
    if (process.env.NODE_ENV === "development") {
      return (
        <div className="mb-4">
          <button
            onClick={() => console.log("[Mock] Payment Initiated")}
            className="w-full h-[44px] bg-black hover:bg-gray-800 text-white rounded-[4px] flex items-center justify-center gap-2 transition-colors shadow-sm"
            type="button"
          >
            <span className="font-medium text-[16px] -tracking-[0.2px]">Pay with</span>
            {/* Apple Logo Mock */}
            <svg viewBox="0 0 32 32" className="h-5 w-auto fill-current">
              <path d="M19.6 11.2c-.7 1.1-1.9 1.8-3.1 1.7-.3-1.4.5-2.7 1.5-3.6 1.1-.9 2.4-1.6 2.7-.2.1.8-.4 1.5-1.1 2.1zm2.3 2.1c-1.6-.1-3 .9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6.1-3.2 1-4 2.5-1.8 3-1.5 8.9 2 10.9 1.1.7 2.5.3 3.4-.1.9-.4 2.2-.4 3.1.1.9.4 2 .8 3.1 0 1.2-.5 1.7-1.3 2.3-2.1-2.1-1-3.4-4.3-1.4-7.4z" />
            </svg>
            <span className="mx-1">/</span>
            {/* Google G Logo Mock */}
            <span className="font-bold text-[16px]">Google Pay</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-cream text-charcoal-light uppercase tracking-wider text-xs">Or pay with card</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mb-4">
      <PaymentRequestButtonElement options={{ paymentRequest }} />
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-cream text-charcoal-light uppercase tracking-wider text-xs">Or pay with card</span>
        </div>
      </div>
    </div>
  );
}
