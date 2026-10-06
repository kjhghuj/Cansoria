"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/providers";
import { readOrderConfirmation } from "@/lib/order-confirmation";


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
  const { user, register } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("Customer");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  useEffect(() => {
    const confirmation = readOrderConfirmation();
    if (confirmation) {
      setOrderId(confirmation.orderId);
      setEmail(confirmation.email);
      setFirstName(confirmation.firstName);
      setLastName(confirmation.lastName);
    }
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
    setLoading(false);
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setRegistering(true);
    setRegisterError(null);

    try {
      await register(email, password, firstName, lastName);
      setRegisterSuccess(true);
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message && (message.includes("exists") || message.includes("duplicate"))) {
        setRegisterError("An account with this email already exists.");
      } else {
        setRegisterError(message || "Registration failed. Please try again.");
      }
    } finally {
      setRegistering(false);
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
          <h1 className="font-serif text-2xl text-charcoal mb-4">Order Not Found</h1>
          <p className="text-charcoal-light mb-8">We could not retrieve the order details.</p>
          <Link href="/shop" className="bg-charcoal text-white px-8 py-3 rounded-full hover:bg-charcoal-light transition-colors">
            Return to Shop
          </Link>
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
            Thank you for your purchase. We have received your order and sent a confirmation email to <span className="font-medium text-charcoal">{email || "your email"}</span>.
          </p>

          <div className="bg-gray-50 rounded-xl p-6 mb-6 inline-block w-full max-w-lg mx-auto">
            <p className="text-sm text-charcoal-light uppercase tracking-wider mb-2">Order ID</p>
            <p className="font-mono text-base sm:text-lg text-charcoal font-bold break-all tracking-normal">{orderId.replace(/^order_/, '')}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop" className="bg-charcoal text-white px-8 py-4 rounded-full hover:bg-charcoal-light transition-colors font-medium min-w-[200px]">
              Continue Shopping
            </Link>
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
                  Create an account to checkout faster next time, track your orders, and receive studio offers.
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
                        placeholder="Create a password"
                        required
                        minLength={6}
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
            <p className="text-charcoal-light">
              Your account has been successfully created. You can now log in to view your order history.
            </p>
            <Link href="/account" className="inline-block mt-4 text-terracotta font-medium hover:underline">
              Go to My Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
