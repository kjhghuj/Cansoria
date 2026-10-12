"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";

const subscribeToLocation = () => () => {};
// Capture the token once: after the address bar is cleaned the snapshot must
// keep returning it instead of flipping the page back to the missing-token view.
let cachedResetToken: string | null | undefined;
function getResetTokenSnapshot() {
  cachedResetToken ??= new URLSearchParams(window.location.search).get("token");
  return cachedResetToken;
}
const getServerResetToken = () => null;

export default function ResetPasswordPage() {
  const tokenRaw = useSyncExternalStore(
    subscribeToLocation,
    getResetTokenSnapshot,
    getServerResetToken,
  );
  const token =
    tokenRaw && tokenRaw.length >= 20 && tokenRaw.length <= 4096
      ? tokenRaw
      : null;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "This reset link is invalid or has expired.");
      }
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired.",
      );
    } finally {
      setSubmitting(false);
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
