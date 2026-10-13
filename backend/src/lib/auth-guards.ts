import { createHash } from "crypto"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 256

/** The authoritative password policy, mirrored from the storefront BFF. */
export function isValidPassword(password: unknown): boolean {
  return typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH
}

/**
 * Reject weak or malformed passwords at the backend entry points instead of
 * relying on the BFF proxy. Runs before the reset token is consumed, so an
 * invalid update never burns a single-use link.
 */
export function enforcePasswordPolicy(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  if (req.body !== undefined && !isValidPassword((req.body as Record<string, unknown>)?.password)) {
    return res.status(400).json({ type: "invalid_request", message: `Password must be a string of ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters.` })
  }
  return next()
}

/**
 * The framework consumes a password reset token with a non-atomic
 * list-then-delete, so two concurrent requests carrying the same token can
 * both read the row and both succeed. Serialize the whole request — token
 * consumption plus the password write — behind a distributed lock keyed by
 * the bearer token itself. The second request then finds the token row gone.
 *
 * `"identifier"` keys issuance instead: concurrent reset requests for one
 * account invalidate each other's older tokens under the same lock.
 */

/**
 * The framework's bearer parsing collapses case and whitespace ("Bearer t",
 * "bearer  t", …) into the same validated JWT, so the lock key must collapse
 * them the same way — hashing the raw header lets equivalent headers race.
 * Mirrors getAuthContextFromJwtToken's `(\S+)\s+(\S+)` extraction.
 */
function stableSecret(raw: string, source: "token" | "identifier"): string {
  if (source === "identifier") return raw.trim().toLowerCase()
  const match = raw.match(/(\S+)\s+(\S+)/)
  return match && match[1].toLowerCase() === "bearer" ? match[2] : raw.trim()
}

export function serializePasswordReset(secretSource: "token" | "identifier") {
  return async (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const raw = secretSource === "token"
      ? req.headers["authorization"]
      : (req.body as Record<string, unknown> | undefined)?.identifier
    if (typeof raw !== "string" || !raw.length || raw.length > 4096) return next()
    const secret = stableSecret(raw, secretSource)
    const key = `pwreset:${createHash("sha256").update(secret).digest("hex").slice(0, 40)}`
    try {
      const locking = req.scope.resolve(Modules.LOCKING)
      await locking.execute(key, async () => {
        await new Promise<void>((resolve) => {
          let settled = false
          const done = () => { if (!settled) { settled = true; resolve() } }
          // The critical section ends ONLY when the downstream work has
          // actually terminated, i.e. when the framework's handler — which
          // consumes the token and writes the password before answering —
          // ends the response. A client disconnect must NOT end it (the work
          // keeps running and 'finish' still fires), and no fixed timer may
          // release it either: a stall longer than any chosen bound would
          // reopen the double-consumption race while the first request is
          // still mid-flight. Holding until real termination is safe because
          // the locking providers keep the lease alive for the job's whole
          // runtime (in-memory: held while the job runs; redis: renewed
          // underneath and aborted — never silently handed over — if renewal
          // loses connectivity). A handler that never answers keeps the lock
          // held until process death: fail closed on purpose.
          res.on("finish", done)
          res.on("close", () => { if (res.writableEnded) done() })
          next()
        })
      }, { timeout: 30 })
    } catch {
      // Lock unavailable: fail closed rather than racing the consumption.
      if (!res.headersSent) return res.status(503).json({ type: "unavailable", message: "Password reset unavailable" })
    }
  }
}
