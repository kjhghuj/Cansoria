export const KEY = 'cansoria_order_confirmation';
export interface OrderConfirmation {
  orderId: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function saveOrderConfirmation(data: OrderConfirmation): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    return true;
  } catch {
    // Storage may be disabled or full. The caller keeps an order reference in
    // the redirect so the confirmation page can still render server-authorized.
    return false;
  }
}

// Display-only state; access to an order still requires backend authorization.
export function readOrderConfirmation(): OrderConfirmation | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (!value || typeof value.orderId !== 'string' || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > 30 * 60_000 || !['email', 'firstName', 'lastName'].every((key) => typeof value[key] === 'string')) return null;
    return value;
  } catch { return null; }
}

const REF_COOKIE = 'cansoria_last_order';
/** Shared with the BFF logout, which clears it beside the order capability. */
export const REMEMBERED_ORDER_COOKIE = REF_COOKIE;

/**
 * Reload-safe reference to the most recent completed order, for browsers that
 * rejected session storage: after the address bar is cleaned and the page is
 * reloaded, the reference alone is gone even though the short-lived order read
 * capability cookie is still valid. The cookie is NOT a capability — reads
 * still require the server-issued order cookie; it expires with it (30 min).
 */
export function rememberOrderRef(orderId: string): void {
  if (!/^order_[A-Za-z0-9_-]{1,128}$/.test(orderId)) return;
  try {
    document.cookie = `${REF_COOKIE}=${encodeURIComponent(orderId)}; path=/order; max-age=1800; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
  } catch { /* cookies unavailable; the lookup flow remains */ }
}

export function readRememberedOrderRef(): string | null {
  try {
    const entry = document.cookie.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${REF_COOKIE}=`));
    const value = entry ? decodeURIComponent(entry.slice(REF_COOKIE.length + 1)) : null;
    return value && /^order_[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
  } catch { return null; }
}

export function clearRememberedOrderRef(): void {
  try {
    document.cookie = `${REF_COOKIE}=; path=/order; max-age=0; samesite=lax`;
  } catch { /* nothing to clear */ }
}
