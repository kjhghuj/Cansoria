import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { createHash } from "crypto"

export default async function customerCreatedHandler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  const customers = container.resolve(Modules.CUSTOMER)
  const promotions = container.resolve(Modules.PROMOTION)
  const notifications = container.resolve(Modules.NOTIFICATION)
  const locking = container.resolve(Modules.LOCKING)
  const logger = container.resolve("logger")
  try {
    await locking.execute(`welcome-coupon:${data.id}`, async () => {
      const customer = await customers.retrieveCustomer(data.id)
      // Checkout creates guest customer records too; these do not qualify for registration coupons.
      if (!customer || !customer.has_account || !customer.email || customer.metadata?.welcome_email_sent === true) return
      const code = `ART15-${createHash("sha256").update(`cansoria-welcome:${customer.id}`).digest("hex").slice(0, 16).toUpperCase()}`
      const existing = await promotions.listPromotions({ code })
      const createdAt = customer.created_at ? new Date(customer.created_at).getTime() : Date.now()
      const expiry = new Date(createdAt + 30 * 24 * 60 * 60 * 1000)
      if (!existing.length) {
        // The deterministic identifiers permit safe retry after a partial event-handler failure.
        const identifier = `cansoria-account-${customer.id}`
        const campaigns = await promotions.listCampaigns({ campaign_identifier: [identifier] })
        const campaign = campaigns[0] || await promotions.createCampaigns({
          campaign_identifier: identifier,
          name: "Cansoria Account Welcome",
          starts_at: new Date(), ends_at: expiry,
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
      await notifications.createNotifications({
        to: customer.email, channel: "email", template: "customer_created", idempotency_key: `welcome:${customer.id}`,
        data: { first_name: customer.first_name, discountCode: code, validUntil: expiry.toLocaleDateString("en-GB") },
      })
      await customers.updateCustomers(customer.id, { metadata: { ...metadata, welcome_email_sent: true } })
    }, { timeout: 30 })
  } catch {
    logger.warn("[CustomerCreatedSubscriber] Welcome notification unavailable")
  }
}

export const config: SubscriberConfig = { event: "customer.created" }
