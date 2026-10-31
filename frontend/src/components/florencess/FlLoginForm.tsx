"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/providers";

/**
 * Reference login form: email, password and a "Forgotten Password" link. The
 * return URL is restricted to internal paths so the form cannot be turned into
 * an open redirect.
 */
export default function FlLoginForm() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [message, setMessage] = useState("");

  const returnTo = (() => {
    const raw = searchParams.get("returnTo") || "/account";
    if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\x00-\x1f\x7f]/.test(raw)) {
      return "/account";
    }
    return raw;
  })();

  if (authLoading) return <p className="fl-form__hint">Loading account…</p>;
  if (user) {
    return (
      <p className="fl-form__hint">
        You are signed in. <Link className="fl-info__link" href={returnTo}>Continue to your account</Link>
      </p>
    );
  }

  return (
    <form
      className="fl-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("pending");
        setMessage("");
        try {
          await login(email, password);
          setStatus("idle");
          router.push(returnTo);
        } catch {
          setStatus("error");
          setMessage("Those credentials were not accepted. Check your email and password.");
        }
      }}
    >
      <div className="fl-form__row">
        <label className="fl-form__label" htmlFor="fl-login-email">
          E-Mail Address
        </label>
        <input
          id="fl-login-email"
          className="fl-form__input"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
      </div>

      <div className="fl-form__row">
        <label className="fl-form__label" htmlFor="fl-login-password">
          Password
        </label>
        <input
          id="fl-login-password"
          className="fl-form__input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </div>

      <button className="fl-form__submit" type="submit" disabled={status === "pending"}>
        {status === "pending" ? "Signing in…" : "Login"}
      </button>

      {status === "error" ? (
        <p className="fl-form__status fl-form__status--error" role="alert">
          {message}
        </p>
      ) : null}

      <p className="fl-form__hint" style={{ marginTop: 18 }}>
        <Link className="fl-info__link" href="/account/forgot-password">
          Forgotten Password
        </Link>
      </p>
    </form>
  );
}
