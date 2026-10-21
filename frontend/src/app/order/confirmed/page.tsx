"use client";

import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { collectionsUrl } from "@/lib/studio-content";
import { useAuth } from "@/lib/providers";
import { readOrderConfirmation, readRememberedOrderRef, rememberOrderRef, type OrderConfirmation } from "@/lib/order-confirmation";

const subscribeToConfirmation = () => () => {};
const getConfirmationSnapshot = () => JSON.stringify(readOrderConfirmation());
const getServerConfirmationSnapshot = () => null;


function CheckIcon() {
  return (
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10 text-green-600">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    </div>
  );
}

function CheckIconSmall() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-charcoal-light">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}

export default function OrderConfirmedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-charcoal font-medium">Processing Confirmation...</p>
      </div>
    }>
      <OrderConfirmedContent />
    </Suspense>
  );
}

export function OrderConfirmedContent() {
  const { user, register } = useAuth();
  const confirmationSnapshot = useSyncExternalStore(subscribeToConfirmation, getConfirmationSnapshot, getServerConfirmationSnapshot);
  const confirmation: OrderConfirmation | null = confirmationSnapshot ? JSON.parse(confirmationSnapshot) : null;
  // The order reference is bound to this page instance: it survives the
  // address-bar cleanup, and a second order navigated to in the same SPA
  // replaces it instead of reusing the first link's value.
  const searchParams = useSearchParams();
  const urlRefParam = searchParams.get("ref");
  const [capturedRef, setCapturedRef] = useState<string | null>(urlRefParam);
  const [seenRefParam, setSeenRefParam] = useState<string | null>(urlRefParam);
  if (urlRefParam !== seenRefParam) {
    setSeenRefParam(urlRefParam);
    if (urlRefParam) setCapturedRef(urlRefParam);
  }
  const urlOrderId =
    capturedRef && /^order_[A-Za-z0-9_-]{1,128}$/.test(capturedRef) ? capturedRef : null;
  // Reload-safe reference for browsers that rejected storage and cleaned the
  // address bar: not a capability, the authorized read below still gates it.
  // External-store reads keep SSR and hydration consistent (server: none).
  const rememberedRef = useSyncExternalStore(subscribeToConfirmation, readRememberedOrderRef, getServerConfirmationSnapshot);
  const clientReady = useSyncExternalStore(subscribeToConfirmation, () => true, () => false);
  const rememberedOrderId =
    rememberedRef && /^order_[A-Za-z0-9_-]{1,128}$/.test(rememberedRef) ? rememberedRef : null;
  // The identity is chosen once and every derived value must agree with it:
  // an explicit URL reference wins; without one, this browser's fresh
  // confirmation cache outranks the cross-tab reference cookie, which may
  // still name an older order restored in another tab.
  const orderId = urlOrderId ?? confirmation?.orderId ?? rememberedOrderId ?? null;
  const activeConfirmation =
    confirmation && confirmation.orderId === orderId ? confirmation : null;
  const email = activeConfirmation?.email ?? null;
  const firstName = activeConfirmation?.firstName ?? "Customer";
  const lastName = activeConfirmation?.lastName ?? "";
  const [password, setPassword] = useState("");
  // Includes the remembered-reference check: the not-found screen must not
  // flash before the browser-side cookie state is known.
  const loading = confirmationSnapshot === null || (!urlRefParam && !clientReady);
  // With only a URL reference (browser storage rejected the confirmation
  // cache), success is claimed only after the server-authorized read below.
  const [recovered, setRecovered] = useState<{ email?: string } | null>(null);
  const [recoveryOutcome, setRecoveryOutcome] = useState<"verified" | "failed" | null>(null);
  const [recoveredFor, setRecoveredFor] = useState<string | null>(null);
  const recovery: "verifying" | "verified" | "failed" | "idle" =
    recoveryOutcome && recoveredFor === orderId
      ? recoveryOutcome
      : !activeConfirmation && orderId
        ? "verifying"
        : "idle";
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  // Results are bound to the order identity: navigating to a second order in
  // the same page instance must not show the first order's outcomes.
  const activeOrderId = useRef<string | null>(orderId);
  useEffect(() => {
    if (activeOrderId.current === orderId) return;
    activeOrderId.current = orderId;
    setRecovered(null);
    setRecoveryOutcome(null);
    setRegisterSuccess(false);
    setRegisterError(null);
    setPassword("");
  }, [orderId]);

  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Keep the cross-tab reference in step with this browser's most recent
  // confirmed order, so a later reload cannot resurrect an older reference
  // and mix it with newer state.
  const confirmedOrderId = activeConfirmation?.orderId;
  useEffect(() => {
    if (confirmedOrderId) rememberOrderRef(confirmedOrderId);
  }, [confirmedOrderId]);

  // Storage-less recovery: with only an order reference, re-read the order
  // server-authorized (completion issued a short-lived order capability cookie).
  useEffect(() => {
    if (activeConfirmation || !orderId || recoveredFor === orderId) return;
    let cancelled = false;
    fetch(`/api/medusa/store/orders/${encodeURIComponent(orderId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setRecoveredFor(orderId);
        if (data?.order?.email) {
          setRecovered({ email: data.order.email });
          setRecoveryOutcome("verified");
          rememberOrderRef(orderId);
        } else {
          setRecoveryOutcome("failed");
        }
      })
      .catch(() => {
        // Unauthorized or unavailable: never claim an unverified reference.
        if (!cancelled) {
          setRecoveredFor(orderId);
          setRecoveryOutcome("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeConfirmation, orderId, recoveredFor]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const identityAtSubmit = activeOrderId.current;
    setRegistering(true);
    setRegisterError(null);

    try {
      await register(email, password, firstName, lastName);
      // Drop stale results: the order identity changed while registering.
      if (identityAtSubmit === activeOrderId.current) setRegisterSuccess(true);
    } catch (err: unknown) {
      if (identityAtSubmit !== activeOrderId.current) return;
      const message = getErrorMessage(err);
      if (message && (message.includes("exists") || message.includes("duplicate"))) {
        setRegisterError("An account with this email already exists.");
      } else {
        setRegisterError(message || "Registration failed. Please try again.");
      }
    } finally {
      if (identityAtSubmit === activeOrderId.current) setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-charcoal font-medium">Processing Confirmation...</p>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="font-serif text-2xl text-charcoal mb-4">Order Reference Not Found</h1>
          <p className="text-charcoal-light mb-3">
            This browser does not hold a recent order confirmation. If you just
            placed an order, it is safe: your confirmation email is on its way,
            and you can always view the order through secure verification.
          </p>
          <p className="text-sm text-charcoal-light mb-8">
            Never resubmit payment to recover an order — use the secure lookup
            below or the link in your email.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/order/lookup" className="bg-charcoal text-white px-8 py-3 rounded-full hover:bg-charcoal-light transition-colors">
              Find Your Order
            </Link>
            <a href={collectionsUrl} className="text-terracotta font-medium hover:underline">
              Explore Watches
            </a>
          </div>
        </div>
      </div>
    );
  }

  // A bare reference has not been confirmed in this browser yet. Keep the
  // claim out of the page until the authorized read succeeds.
  if (!activeConfirmation && orderId && recovery === "verifying") {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-charcoal font-medium">Verifying your order reference...</p>
        <p className="mt-2 text-sm text-charcoal-light">This browser could not store your confirmation, so the order is being verified securely.</p>
      </div>
    );
  }

  if (!activeConfirmation && orderId && recovery === "failed") {
    return (
      <div className="min-h-screen bg-cream pt-24 pb-16 px-6">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="font-serif text-2xl text-charcoal mb-4">Order Not Verified in This Browser</h1>
          <p className="text-charcoal-light mb-3">
            This link carries an order reference, but it could not be verified
            here. If you just placed an order, it is safe — this only means the
            browser&apos;s short-lived access window is missing or has expired.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 inline-block w-full">
            <p className="text-sm text-charcoal-light uppercase tracking-wider mb-1">Order reference</p>
            <p className="font-mono text-base text-charcoal font-bold break-all tracking-normal">{orderId.replace(/^order_/, '')}</p>
          </div>
          <p className="text-sm text-charcoal-light mb-8">
            Your confirmation email is the source of truth. Never resubmit
            payment to recover an order — use secure verification below.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/order/lookup" className="bg-charcoal text-white px-8 py-3 rounded-full hover:bg-charcoal-light transition-colors">
              Verify &amp; View This Order
            </Link>
            <a href={collectionsUrl} className="text-terracotta font-medium hover:underline">
              Explore Watches
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream flex flex-col items-center pt-32 pb-4 px-4 sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="bg-white rounded-2xl p-6 sm:p-10 text-center shadow-sm border border-gray-100">
          <CheckIcon />
          <h1 className="font-serif text-3xl sm:text-4xl text-charcoal mb-3">Order Confirmed!</h1>
          <p className="text-charcoal-light text-lg mb-6">
            We have received your order. A confirmation email for{" "}
            <span className="font-medium text-charcoal">{email || recovered?.email || "your email"}</span>{" "}
            is on its way; if it does not arrive within a few minutes, you can
            open your order through secure verification at any time.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6 inline-block w-full max-w-lg mx-auto">
            <p className="text-sm text-charcoal-light uppercase tracking-wider mb-2">Order ID</p>
            <p className="font-mono text-base sm:text-lg text-charcoal font-bold break-all tracking-normal">{orderId.replace(/^order_/, '')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={collectionsUrl} className="bg-charcoal text-white px-8 py-4 rounded-full hover:bg-charcoal-light transition-colors font-medium min-w-[200px]">
              Continue Shopping
            </a>
            <Link href="/order/lookup" className="bg-white border border-gray-200 text-charcoal px-8 py-4 rounded-full hover:border-charcoal transition-colors font-medium min-w-[200px]">
              View Order Details
            </Link>
          </div>
        </div>

        {email && !registerSuccess  && !user && (
          <div className="bg-terracotta/5 rounded-2xl p-8 sm:p-10 border border-terracotta/20">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="md:flex-1">
                <h2 className="font-serif text-2xl text-charcoal mb-3">Save your information?</h2>
                <p className="text-charcoal-light mb-4">
                  Create an account to check out faster next time and receive
                  studio offers. After verifying your email you can securely
                  claim this order into your order history.
                </p>
                <div className="flex items-center gap-2 text-sm text-charcoal-light">
                  <CheckIconSmall />
                  <span>Secure and private</span>
                </div>
              </div>

              <div className="w-full md:w-auto md:min-w-[300px]">
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">Create Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-terracotta/30 rounded-lg focus:outline-none focus:border-terracotta focus:ring-1 focus:ring-terracotta"
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                      />
                      <div className="absolute left-3 top-3.5">
                        <LockIcon />
                      </div>
                    </div>
                  </div>

                  {registerError && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{registerError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full bg-terracotta text-white px-6 py-3 rounded-lg hover:bg-terracotta-dark transition-colors font-medium disabled:opacity-70"
                  >
                    {registering ? "Creating Account..." : "Create Account"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {registerSuccess && (
          <div className="bg-green-50 rounded-2xl p-8 text-center border border-green-100 animate-fade-in">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
              <CheckIconSmall />
            </div>
            <h2 className="font-serif text-xl text-charcoal mb-2">Account Created!</h2>
            <p className="text-charcoal-light mb-4">
              Your account is ready. To add this order to your account history,
              use the secure claim below — orders move only after ownership is
              verified through the order&apos;s email address, never automatically.
            </p>
            <Link href="/order/lookup" className="inline-block mt-2 bg-terracotta text-white px-6 py-3 rounded-full hover:bg-terracotta-dark transition-colors font-medium">
              Verify &amp; Claim This Order
            </Link>
            <Link href="/account" className="block mt-3 text-terracotta font-medium hover:underline">
              Go to My Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
