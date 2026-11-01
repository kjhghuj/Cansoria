import { cache } from "react";
import { cookies } from "next/headers";
import { getRegion, listRegions } from "./medusa";
import { REGION_COOKIE, pickRegion } from "./lorencess-region";

/**
 * The region this request should price in: the visitor's validated
 * `lorencess_region` cookie when it names a real region, otherwise the store
 * default. React `cache` deduplicates the backend calls per request.
 */
export const getRequestRegion = cache(async () => {
  try {
    const [jar, regions] = await Promise.all([cookies(), listRegions()]);
    const raw = jar.get(REGION_COOKIE)?.value;
    const fromCookie = pickRegion(raw, regions, null);
    if (fromCookie) return fromCookie;
    // No validated cookie: same default the client provider falls back to.
    const fallback = await getRegion();
    if (fallback) return fallback;
    return regions[0] ?? null;
  } catch {
    // Backend unreachable or cookies unavailable: fall back to the default.
    return getRegion();
  }
});
