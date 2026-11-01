/**
 * Storefront identity shared by metadata, header, footer and structured data.
 * Internal module and CSS names keep the `florencess` / `fl-` prefix; only the
 * visible name lives here.
 */

export const SITE_NAME = "LORENCESS";

export const SITE_DESCRIPTION =
  "LORENCESS online store: bags, shoes and clothing, with secure checkout and tracked delivery.";

/** Operator line shown under the copyright; hidden when the env var is unset. */
export const SITE_COMPANY_LINE = process.env.NEXT_PUBLIC_COMPANY_LINE?.trim() ?? "";

const LOCAL_BASE_URL = "http://localhost:3030";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL?.trim() || LOCAL_BASE_URL;
}

export function pageTitle(label?: string): string {
  const trimmed = label?.trim();
  return trimmed ? `${trimmed} | ${SITE_NAME}` : SITE_NAME;
}
