import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"
import { welcomeCustomerExpiry } from "../lib/welcome-promotions"
import { sendNotification } from "../lib/send-notification"

export default async function customerCreatedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const customers = container.resolve(Modules.CUSTOMER)
  const promotions = container.resolve(Modules.PROMOTION)
  const locking = container.resolve(Modules.LOCKING)
  const logger = container.resolve("logger")
  // Failures propagate so the worker requeues the event; the deterministic
  // coupon/campaign identifiers above make replays safe, and
  // welcome_email_sent flips only after the email actually went out.
  await locking.execute(`welcome-coupon:${data.id}`, async () => {
      const customer = await customers.retrieveCustomer(data.id)
      // Checkout creates guest customer records too; these do not qualify for registration coupons.
      if (!customer || customer.has_account !== true || !customer.email || customer.metadata?.welcome_email_sent === true) return
      const expiry = welcomeCustomerExpiry(customer)
      if (!expiry) return
      const code = `ART15-${createHash("sha256").update(`cansoria-welcome:${customer.id}`).digest("hex").slice(0, 16).toUpperCase()}`
      const existing = await promotions.listPromotions({ code })
      if (!existing.length) {
        // The deterministic identifiers permit safe retry after a partial event-handler failure.
        const identifier = `cansoria-account-${customer.id}`
        const campaigns = await promotions.listCampaigns({ campaign_identifier: [identifier] })
        const campaign = campaigns[0] || await promotions.createCampaigns({
          campaign_identifier: identifier,
          name: "Cansoria Account Welcome",
          // Account age enforces the 30-day eligibility window at application/completion.
          // No campaign expiry: native registerUsage must not silently skip a code mid-completion.
          starts_at: new Date(),
          budget: { type: "usage", limit: 1 },
        })
        await promotions.createPromotions({
          code, type: "standard", status: "active", is_automatic: false, campaign_id: campaign.id,
          rules: [
            { attribute: "customer.id", operator: "eq", values: [customer.id] },
            { attribute: "email", operator: "eq", values: [customer.email.trim().toLowerCase()] },
          ],
          application_method: { type: "percentage", value: 15, target_type: "order", allocation: "across" },
        })
      }
      const metadata = {
        ...customer.metadata,
        coupons: Array.from(new Set([...(Array.isArray(customer.metadata?.coupons) ? customer.metadata.coupons : []), code])),
        welcome_discount_code: code,
        welcome_discount_valid_until: expiry.toISOString(),
      }
      await customers.updateCustomers(customer.id, { metadata })
      await sendNotification(container, {
        to: customer.email, channel: "email", template: "customer_created", idempotency_key: `welcome:${customer.id}`,
        data: { first_name: customer.first_name, discountCode: code, validUntil: expiry.toLocaleDateString("en-GB") },
      })
      await customers.updateCustomers(customer.id, { metadata: { ...metadata, welcome_email_sent: true } })
  }, { timeout: 30 })
  .catch((error: unknown) => {
    // Keep the lock-scoped work durable in the logs, but never swallow the
    // failure: rethrow so the event worker retries the whole handler.
    logger.error(`[CustomerCreatedSubscriber] Welcome flow for ${data.id} failed and will be retried: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  })
}

export const config: SubscriberConfig = { event: "customer.created" }
