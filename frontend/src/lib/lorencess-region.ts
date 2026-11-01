/**
 * Region-as-currency rules shared by the client switcher and the server price
 * renderer. The chosen region persists in the `lorencess_region` cookie so
 * server components can price in the same currency the visitor selected.
 */
import type { StoreRegion } from "./types";

export const REGION_COOKIE = "lorencess_region";
export const REGION_COOKIE_MAX_AGE = 365 * 24 * 3600;

const REGION_ID_PATTERN = /^reg_[A-Za-z0-9]{1,64}$/;

/** Medusa region ids look like `reg_…`; anything else is untrusted input. */
export function isValidRegionId(value: unknown): value is string {
  return typeof value === "string" && REGION_ID_PATTERN.test(value);
}

/**
 * Resolve the effective region: the cookie value only counts when it names a
 * region that exists; otherwise the caller's fallback is returned exactly as
 * given (null means "no default — let the caller decide"). Never throws on
 * hostile cookie payloads.
 */
export function pickRegion(
  cookieValue: unknown,
  regions: StoreRegion[],
  fallback: StoreRegion | null,
): StoreRegion | null {
  if (isValidRegionId(cookieValue)) {
    const match = regions.find((region) => region.id === cookieValue);
    if (match) return match;
  }
  return fallback;
}

/** "USD $" / "EUR €" — the symbol comes from Intl, never a hand-typed table. */
export function currencyLabel(currencyCode: string): string {
  const code = currencyCode.toUpperCase();
  try {
    const symbol = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    })
      .formatToParts(1)
      .find((part) => part.type === "currency")?.value;
    return symbol ? `${code} ${symbol}` : code;
  } catch {
    return code;
  }
}
