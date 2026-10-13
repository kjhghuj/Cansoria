import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resendNotification } from "../../../../../lib/send-notification"

/**
 * Operations entry for resending a failed or recovered notification from its
 * stored record (to/channel/template/data), under a fresh idempotency key
 * linked back to the original. Admin authentication is enforced by the
 * framework's /admin namespace middleware.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id
  if (typeof id !== "string" || !/^noti_[a-zA-Z0-9_-]{1,128}$/.test(id)) {
    return res.status(400).json({ type: "invalid_request", message: "Invalid notification id" })
  }
  try {
    const result = await resendNotification(req.scope, id)
    if (result.sent) return res.status(200).json({ success: true, notification: result.notification })
    if (result.reason === "stale_link") return res.status(409).json({ type: "conflict", message: result.message })
    if (result.reason === "incomplete") return res.status(400).json({ type: "invalid_request", message: "Notification record lacks the data needed for a safe resend" })
    return res.status(404).json({ type: "not_found", message: "Notification could not be resent" })
  } catch {
    return res.status(503).json({ type: "unavailable", message: "Notification resend unavailable" })
  }
}
