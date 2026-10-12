"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // The answer is uniform whether or not the account exists.
      if (!response.ok && response.status !== 429) throw new Error("request failed");
      setRequested(true);
    } catch {
      setError(
        "The service is temporarily unavailable. Please try again in a few minutes.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8 text-center">
          Forgot Password
        </h1>

        <div className="bg-white p-8 border border-gray-100">
          {requested ? (
            <div className="text-center">
              <p className="text-charcoal-light mb-4">
                If an account exists for{" "}
                <span className="font-medium text-charcoal">{email}</span>, a
                password reset link is on its way. The link expires in 15
                minutes and can only be used once.
              </p>
              <p className="text-sm text-charcoal-light mb-6">
                Didn&apos;t receive it? Check your spam folder, or request a new
                link — requesting again invalidates the previous link.
              </p>
              <Link
                href="/account"
                className="text-sm uppercase tracking-widest text-terracotta font-bold hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <p className="text-charcoal-light mb-6">
                Enter the email address you use for your Cansoria account and we
                will send you a secure link to choose a new password.
              </p>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-terracotta text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Send Reset Link"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <Link
                  href="/account"
                  className="text-sm text-charcoal-light hover:text-terracotta"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
