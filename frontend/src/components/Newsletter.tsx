"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { useNewsletter } from "@/hooks/useNewsletter";

const COMPACT_CAPTCHA_QUERY = "(max-width: 339px)";

function subscribeToCaptchaWidth(onChange: () => void) {
  const media = window.matchMedia(COMPACT_CAPTCHA_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getCaptchaWidthSnapshot() {
  return window.matchMedia(COMPACT_CAPTCHA_QUERY).matches;
}

function getServerCaptchaWidthSnapshot() {
  return false;
}

export default function Newsletter() {
  const id = useId();
  const [captchaError, setCaptchaError] = useState("");
  const compactCaptcha = useSyncExternalStore(
    subscribeToCaptchaWidth,
    getCaptchaWidthSnapshot,
    getServerCaptchaWidthSnapshot,
  );
  const emailId = `${id}-email`;
  const errorId = `${id}-error`;
  const consentId = `${id}-consent`;
  const {
    email, setEmail, isLoading, status, errorMessage, subscribe,
    turnstileRef, turnstileSiteKey, isSecurityConfigured,
    securityUnavailableMessage, setTurnstileToken, setErrorMessage,
  } = useNewsletter();

  return (
    <section className="cansoria-footer-newsletter" aria-labelledby={`${id}-title`}>
      <div className="cansoria-footer-container cansoria-footer-newsletter-layout">
        <div className="cansoria-footer-newsletter-copy">
          <p className="cansoria-footer-eyebrow">CANSORIA STUDIO NOTES</p>
          <h2 id={`${id}-title`}>For the love of your pet.</h2>
          <p>Pet portrait inspiration, studio updates, and news about our upcoming commissions — straight to your inbox.</p>
        </div>
        <div className="cansoria-footer-newsletter-signup">
          {status === "success" ? (
            <p className="cansoria-footer-success" role="status">
              Please check your email to confirm your subscription.
            </p>
          ) : (
            <form onSubmit={subscribe} aria-busy={isLoading}>
              <label htmlFor={emailId}>Email address</label>
              <div className="cansoria-footer-email-row">
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="Enter your email"
                  value={email}
                  disabled={isLoading}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrorMessage("");
                  }}
                  onInvalid={() => setErrorMessage("Please enter a valid email address.")}
                  aria-invalid={Boolean(errorMessage)}
                  aria-describedby={`${consentId}${errorMessage ? ` ${errorId}` : ""}`}
                />
                <button type="submit" disabled={isLoading || !isSecurityConfigured}>
                  {isLoading ? "Joining…" : "Join the List"}
                </button>
              </div>
              {isSecurityConfigured ? (
                <div className="cansoria-footer-captcha">
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={turnstileSiteKey}
                    onSuccess={(token) => {
                      setTurnstileToken(token);
                      setCaptchaError("");
                      setErrorMessage((message) => message === "Please complete the security check." ? "" : message);
                    }}
                    onError={() => {
                      setTurnstileToken(null);
                      setCaptchaError("Security check failed. Please complete it again.");
                    }}
                    onExpire={() => {
                      setTurnstileToken(null);
                      setCaptchaError("Security check expired. Please complete it again.");
                    }}
                    options={{ action: "newsletter", theme: "light", size: compactCaptcha ? "compact" : "flexible" }}
                  />
                </div>
              ) : (
                <p className="cansoria-footer-error" role="alert">{securityUnavailableMessage}</p>
              )}
              {errorMessage && (
                <p id={errorId} className="cansoria-footer-error" role="alert">{errorMessage}</p>
              )}
              {captchaError && (
                <p className="cansoria-footer-error" role="alert">{captchaError}</p>
              )}
              <p id={consentId} className="cansoria-footer-consent">
                Subscribe to receive Cansoria pet portrait emails. Unsubscribe anytime.{" "}
                <Link href="/privacy">Privacy Policy</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
