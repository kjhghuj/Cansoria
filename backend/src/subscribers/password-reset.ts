import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import { storefrontUrl } from "../lib/access-tokens"

type PasswordResetEvent = {
  entity_id: string
  actor_type: string
  token: string
  metadata: Record<string, unknown>
}

/**
 * Sends the single-use password reset link when a customer requests one through
 * `POST /auth/customer/emailpass/reset-password`. The route always answers 201
 * without revealing whether the identity exists; this subscriber decides silently.
 */
export default async function passwordResetHandler({ event: { data }, container }: SubscriberArgs<PasswordResetEvent>) {
  if (data?.actor_type !== "customer" || !data.entity_id || typeof data.token !== "string") return
  const logger = container.resolve("logger")
  try {
    // Only identities with a registered account get a link; guests never existed.
    const customers = container.resolve(Modules.CUSTOMER)
    const [customer] = await customers.listCustomers({ email: [data.entity_id] })
    if (!customer || customer.has_account !== true) return

    const resetUrl = new URL("/account/reset-password", storefrontUrl())
    resetUrl.searchParams.set("token", data.token)

    const notifications = container.resolve(Modules.NOTIFICATION)
    await notifications.createNotifications({
      to: customer.email,
      channel: "email",
      template: "password_reset",
      // Each issued token invalidates the previous one; dedupe per token so a
      // retried event does not email the same link twice.
      idempotency_key: `password-reset:${createHash("sha256").update(data.token).digest("hex").slice(0, 32)}`,
      data: { reset_url: resetUrl.toString() },
    })
  } catch (error) {
    logger.error(`[PasswordResetSubscriber] Reset email for ${data.entity_id} failed and must be resent:`, error)
  }
}

export const config: SubscriberConfig = { event: "auth.password_reset" }
