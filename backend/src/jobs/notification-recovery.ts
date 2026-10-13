import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { STALE_PENDING_MS } from "../lib/send-notification"

type NotificationRecords = {
  listNotifications(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<Array<{ id: string; to: string; template: string | null }>>
  updateNotifications(entries: Array<Record<string, unknown>>): Promise<unknown[]>
}

/**
 * A PENDING notification older than the stale window was abandoned by a
 * crashed or killed worker — the framework never resends it and blocks the
 * idempotency key for replays. Mark it failed (which unblocks keyed retries
 * and sendNotification) and raise an operations alert with the record id so
 * the email can be resent manually if no replay follows.
 */
export default async function notificationRecoveryJob(container: MedusaContainer) {
  const notifications = container.resolve(Modules.NOTIFICATION) as unknown as NotificationRecords
  const logger = container.resolve("logger")
  const stale = await notifications.listNotifications({
    status: ["pending"],
    created_at: { $lt: new Date(Date.now() - STALE_PENDING_MS) },
  })
  if (!stale?.length) return
  await notifications.updateNotifications(stale.map((record) => ({ id: record.id, status: "failure" })))
  for (const record of stale) {
    logger.error(
      `[NotificationRecovery] Notification ${record.id} (${record.template} to ${record.to}) was stuck PENDING and is now marked failed; resend it from the admin if the customer has not been served.`,
    )
  }
}

export const config = {
  name: "notification-recovery",
  schedule: "*/5 * * * *", // every 5 minutes
};
