import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"

function generateDiscountCode(): string {
    const randomPart = randomBytes(3).toString("hex").toUpperCase()
    return `ART15-${randomPart}`
}

function getExpiryDate(): Date {
    const now = new Date()
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

export default async function customerCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const promotionModuleService = container.resolve(Modules.PROMOTION)
    const logger = container.resolve("logger")

    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer) {
        logger.warn(`[CustomerCreatedSubscriber] Customer ${data.id} not found.`)
        return
    }

    logger.info(`[CustomerCreatedSubscriber] Processing new Cansoria customer: ${customer.email}`)

    let discountCode: string | undefined
    let validUntil: string | undefined

    try {
        const code = generateDiscountCode()
        const expiryDate = getExpiryDate()
        const campaignSuffix = code.toLowerCase()

        logger.info(`[CustomerCreatedSubscriber] Creating Cansoria promotion with code: ${code}`)

        const campaign = await promotionModuleService.createCampaigns({
            campaign_identifier: `cansoria-account-${campaignSuffix}`,
            name: `Cansoria Account Welcome ${code}`,
            starts_at: new Date(),
            ends_at: expiryDate,
        })

        const promotions = await promotionModuleService.createPromotions({
            code,
            type: "standard",
            status: "active",
            is_automatic: false,
            campaign_id: campaign.id,
            application_method: {
                type: "percentage",
                value: 15,
                target_type: "order",
                allocation: "across",
            },
        })

        const promotion = Array.isArray(promotions) ? promotions[0] : promotions
        logger.info(`[CustomerCreatedSubscriber] Promotion created with ID: ${promotion?.id}`)

        discountCode = code
        validUntil = formatDate(expiryDate)

        const existingCoupons = Array.isArray(customer.metadata?.coupons)
            ? customer.metadata.coupons
            : []

        await customerModuleService.updateCustomers(customer.id, {
            metadata: {
                ...customer.metadata,
                coupons: [...existingCoupons, code],
                welcome_discount_code: code,
                welcome_discount_valid_until: expiryDate.toISOString(),
            },
        })

        logger.info(`[CustomerCreatedSubscriber] Promotion added to customer metadata (valid until ${validUntil})`)
    } catch (error) {
        logger.error("[CustomerCreatedSubscriber] Failed to create Cansoria promotion:", error)
    }

    try {
        await notificationModuleService.createNotifications({
            to: customer.email,
            channel: "email",
            template: "customer_created",
            data: {
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                discountCode,
                validUntil,
            },
        })
        logger.info(`[CustomerCreatedSubscriber] Welcome email sent to ${customer.email}`)
    } catch (error) {
        logger.error("[CustomerCreatedSubscriber] Failed to send welcome email:", error)
    }
}

export const config: SubscriberConfig = {
    event: "customer.created",
}
