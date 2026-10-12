/**
 * Fail closed: production-grade validation must apply whenever the process is
 * not explicitly local development or an automated test run. A missing or
 * misspelled NODE_ENV must never silently relax security checks, so the
 * relaxed set is enumerated instead of defaulting to it.
 */
export function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
}
