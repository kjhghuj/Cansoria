import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import { storefrontUrl } from "../lib/access-tokens"
import { sendNotification } from "../lib/send-notification"

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
  // Only identities with a registered account get a link; guests never existed.
  const customers = container.resolve(Modules.CUSTOMER)
  const [customer] = await customers.listCustomers({ email: [data.entity_id] })
  if (!customer || customer.has_account !== true) return

  const resetUrl = new URL("/account/reset-password", storefrontUrl())
  resetUrl.searchParams.set("token", data.token)

  // Failures propagate so the worker requeues; each issued token invalidates
  // the previous one, and the per-token key prevents double email on retry.
  await sendNotification(container, {
    to: customer.email,
    channel: "email",
    template: "password_reset",
    idempotency_key: `password-reset:${createHash("sha256").update(data.token).digest("hex").slice(0, 32)}`,
    data: { reset_url: resetUrl.toString() },
  })
}

export const config: SubscriberConfig = { event: "auth.password_reset" }
