"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ResetPasswordContent() {
  // The token is bound to this page instance: it survives the address-bar
  // cleanup, and a second reset link opened in the same SPA replaces it
  // instead of silently reusing the first token.
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const [capturedToken, setCapturedToken] = useState<string | null>(urlToken);
  const [seenToken, setSeenToken] = useState<string | null>(urlToken);
  if (urlToken !== seenToken) {
    setSeenToken(urlToken);
    if (urlToken) setCapturedToken(urlToken);
  }
  const token =
    capturedToken && capturedToken.length >= 20 && capturedToken.length <= 4096
      ? capturedToken
      : null;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Results are bound to this link's token: opening a second reset link in the
  // same page instance must not show the first link's outcome, and responses
  // still in flight for the old token are dropped.
  const activeToken = useRef<string | null>(token);
  useEffect(() => {
    if (activeToken.current === token) return;
    activeToken.current = token;
    setDone(false);
    setError(null);
    setSubmitting(false);
    setPassword("");
    setConfirmPassword("");
  }, [token]);

  useEffect(() => {
    // The token must not stay in the address bar, history, or referrers.
    if (window.location.search) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !token) return;
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    const requestToken = token;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: requestToken, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (requestToken !== activeToken.current) return;
      if (!response.ok) {
        throw new Error(data?.message || "This reset link is invalid or has expired.");
      }
      setDone(true);
    } catch (err) {
      if (requestToken !== activeToken.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired.",
      );
    } finally {
      if (requestToken === activeToken.current) setSubmitting(false);
    }
  };

  return (
    <div className="pt-24 pb-16">
      <div className="max-w-md mx-auto px-6">
        <h1 className="font-serif text-4xl text-charcoal mb-8 text-center">
          Choose a New Password
        </h1>

        <div className="bg-white p-8 border border-gray-100">
          {done ? (
            <div className="text-center">
              <p className="text-charcoal-light mb-6">
                Your password has been updated. You can now sign in with your
                new password.
              </p>
              <Link
                href="/account"
                className="inline-block bg-terracotta text-white px-8 py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center">
              <p className="text-charcoal-light mb-6">
                This link is missing its reset token. Please request a fresh
                link — each link expires in 15 minutes and works once.
              </p>
              <Link
                href="/account/forgot-password"
                className="text-sm uppercase tracking-widest text-terracotta font-bold hover:underline"
              >
                Request a New Link
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-charcoal mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full border border-gray-200 px-4 py-3 focus:outline-none focus:border-charcoal"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-terracotta text-white py-4 uppercase tracking-widest text-xs font-bold hover:bg-terracotta-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? "Updating…" : "Set New Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="pt-24 pb-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-terracotta border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
