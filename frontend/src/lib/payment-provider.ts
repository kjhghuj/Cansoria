/**
 * Payment provider the storefront starts sessions with.
 *
 * Production is Stripe. A local mock provider can be selected for development
 * so the full checkout can run without an acquirer; the value is read from the
 * same env var the backend whitelist uses.
 */
export const PAYMENT_PROVIDER_ID =
  process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_ID?.trim() || 'pp_stripe_stripe';

/** True when checkout is running against the local test provider. */
export const IS_LOCAL_PAYMENT_MOCK = PAYMENT_PROVIDER_ID !== 'pp_stripe_stripe';
