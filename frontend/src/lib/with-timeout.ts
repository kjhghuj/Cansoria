import { MedusaUnavailableError } from "./medusa";

/** Region/catalogue lookups must never hang a page render. */
export const REGION_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Race an operation against a deadline. A late or hanging operation surfaces
 * as MedusaUnavailableError (the existing degraded-state signal); a failure
 * inside the operation propagates unchanged. The losing promise gets a
 * no-op catch so a late rejection never becomes an unhandled rejection.
 */
export async function withMedusaTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number = REGION_LOOKUP_TIMEOUT_MS,
  label = "medusa request",
): Promise<T> {
  // Absorb a late rejection that arrives after the deadline wins the race.
  void operation.catch(() => {});
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new MedusaUnavailableError(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
