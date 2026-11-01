import { cache } from "react";
import { cookies } from "next/headers";
import { getRegion, listRegions } from "./medusa";
import { REGION_COOKIE, pickRegion } from "./lorencess-region";
import { REGION_LOOKUP_TIMEOUT_MS, withMedusaTimeout } from "./with-timeout";
import type { StoreRegion } from "./types";

/**
 * Region resolution with a hard deadline on every backend call. Injected so
 * the fallback behaviour is unit-testable: a validated cookie match wins; an
 * unavailable region list falls back to the default lookup; when that also
 * times out the answer is null (never a thrown error, never a hang).
 */
export async function resolveRegionWithFallback(
  cookieValue: string | undefined,
  fetchRegions: () => Promise<StoreRegion[]>,
  fetchDefault: () => Promise<StoreRegion | null>,
): Promise<StoreRegion | null> {
  let regions: StoreRegion[] = [];
  try {
    regions = await fetchRegions();
    const fromCookie = pickRegion(cookieValue, regions, null);
    if (fromCookie) return fromCookie;
  } catch {
    // Region list unavailable: fall through to the default lookup.
  }
  try {
    return await fetchDefault();
  } catch {
    return regions[0] ?? null;
  }
}

/**
 * The region this request should price in: the visitor's validated
 * `lorencess_region` cookie when it names a real region, otherwise the store
 * default. React `cache` deduplicates the backend calls per request; every
 * call is deadline-bounded so an unresponsive backend costs at most one
 * timeout instead of hanging the render.
 */
export const getRequestRegion = cache(async (): Promise<StoreRegion | null> => {
  return resolveRegionWithFallback(
    // cookies() is read inside try-less: a cookie-less context (e.g. some
    // metadata renders) simply yields no cookie value.
    await cookies()
      .then((jar) => jar.get(REGION_COOKIE)?.value)
      .catch(() => undefined),
    () => withMedusaTimeout(listRegions(), REGION_LOOKUP_TIMEOUT_MS, "region list"),
    () => withMedusaTimeout(getRegion(), REGION_LOOKUP_TIMEOUT_MS, "default region"),
  );
});
