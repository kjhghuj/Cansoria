import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { decorateCartTotals, MathBN } from "@medusajs/framework/utils"
import { orderAccessUrl } from "../lib/access-tokens"
import { sendNotification } from "../lib/send-notification"

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
        entity: "order",
        fields: [
            "id",
            "display_id",
            "email",
            "total",
            "subtotal",
            "item_subtotal",
            "shipping_subtotal",
            "shipping_total",
            "discount_total",
            "discount_tax_total",
            "tax_total",
            "credit_lines.amount",
            "currency_code",
            "items.*",
            "items.total",
            "shipping_methods.name",
            "shipping_address.first_name",
            "shipping_address.last_name"
        ],
        filters: { id: data.id }
    })

    const order = orders[0]

    if (!order) {
        console.warn(`[OrderPlacedSubscriber] Order ${data.id} not found.`)
        return
    }

    const firstName = order.shipping_address?.first_name || "Valued Customer"

    if (!order.email) {
        console.warn(`[OrderPlacedSubscriber] Order ${data.id} has no email address.`)
        return
    }

    console.log("[OrderPlacedSubscriber] Processing order notification")

    // Failures propagate so the event worker requeues this handler (Redis
    // backoff retries are configured); sendNotification keeps the
    // idempotency key deliverable across those retries.
    await sendNotification(container, {
            to: order.email,
            channel: "email",
            template: "order_placed",
            // Stable per-order key: provider retries and event replays must not
            // send a second confirmation email for the same order.
            idempotency_key: `order:${order.id}:placed`,
            data: {
                id: order.id,
                display_id: order.display_id,
                // Signed once and persisted with the notification: retries reuse
                // this exact link and content under the same idempotency key.
                access_url: orderAccessUrl(order.id),
                email: order.email,
                first_name: firstName,
                total: order.total,
                subtotal: order.subtotal,
                item_subtotal: order.item_subtotal,
                shipping_subtotal: order.shipping_subtotal,
                shipping_total: order.shipping_total,
                // These computed DTO fields are not exposed at the root of the
                // Order graph schema. Derive them from supported order fields.
                discount_subtotal: MathBN.sub(order.discount_total ?? 0, order.discount_tax_total ?? 0),
                tax_total: order.tax_total,
                // With only credits, the public decorator's total is their
                // negative net amount, after the same currency epsilon rule.
                credit_line_total: MathBN.sub(0, decorateCartTotals({
                    currency_code: order.currency_code,
                    credit_lines: (order.credit_lines || []).map(line => ({ amount: line?.amount ?? 0 })),
                }).total),
                currency_code: order.currency_code,
                items: order.items || [],
                shipping_methods: order.shipping_methods || [],
            },
        })
        console.log(`[OrderPlacedSubscriber] Notification triggered successfully.`)
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
