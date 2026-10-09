"use client";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { COMPANY_INFO } from "@/lib/constants";

export default function ContactForm() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const captcha = useRef<TurnstileInstance>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || busy) return;
    const form = event.currentTarget,
      data = new FormData(form);
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/medusa/store/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(data),
          turnstile_token: token,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message ||
            "Unable to send your message. Please email the studio.",
        );
      setStatus(
        "Your message has been sent to the studio. Thank you for getting in touch.",
      );
      form.reset();
    } catch (reason) {
      setStatus(
        reason instanceof Error
          ? reason.message
          : "Unable to send your message.",
      );
    } finally {
      setBusy(false);
      setToken("");
      captcha.current?.reset();
    }
  }
  return (
    <form className="studio-form" onSubmit={submit}>
      <label>
        Your name
        <input
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          disabled={busy}
        />
      </label>
      <label>
        Email address
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          disabled={busy}
        />
      </label>
      <label>
        How can we help?
        <select name="topic" disabled={busy}>
          <option value="photo">Choosing a photo</option>
          <option value="commission">Planning a portrait</option>
          <option value="order">An existing order</option>
          <option value="feedback">Sharing feedback</option>
        </select>
      </label>
      <label>
        Your message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          disabled={busy}
        />
      </label>
      <div hidden aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {siteKey ? (
        <Turnstile
          ref={captcha}
          siteKey={siteKey}
          options={{ action: "contact" }}
          onSuccess={setToken}
          onExpire={() => setToken("")}
          onError={() => {
            setToken("");
            setStatus("Security check unavailable. Please email the studio.");
          }}
        />
      ) : (
        <p className="text-sm text-charcoal-light">
          The contact form is currently unavailable. Email{" "}
          <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="underline">
            {COMPANY_INFO.supportEmail}
          </a>
          .
        </p>
      )}
      <button className="studio-button" disabled={!token || busy} type="submit">
        {busy ? "Sending…" : "Send Your Message →"}
      </button>
      <p role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}
