import { AbstractNotificationProviderService } from "@medusajs/utils"
import { Resend } from "resend"
import * as path from "path"
import * as fs from "fs"
import Handlebars from "handlebars"

type ResendOptions = {
    apiKey: string
    from: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: unknown) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function formatMoney(amount: unknown, currencyCode: string) {
    const cents = typeof amount === "number" ? amount : 0
    return `${currencyCode.toUpperCase()} ${(cents / 100).toFixed(2)}`
}

function renderWelcomeEmail(data: Record<string, any>, frontendUrl: string) {
    const firstName = escapeHtml(data.first_name || data.firstName || "there")
    const discountCode = data.discountCode ? escapeHtml(data.discountCode) : ""
    const validUntil = data.validUntil ? escapeHtml(data.validUntil) : ""

    const discountHtml = discountCode
        ? `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                    <td style="background-color: #f7f2ec; border: 1px solid #eadfd3; padding: 26px; text-align: center;">
                        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #8c6b54; text-transform: uppercase;">Your Studio Welcome Gift</p>
                        <p style="margin: 0 0 16px; font-size: 15px; color: #3b332d;">Enjoy 15% off your first Cansoria painting.</p>
                        <div style="display: inline-block; border: 2px dashed #bca083; background: #ffffff; padding: 14px 22px; font-size: 22px; letter-spacing: 3px; color: #2d2926; font-weight: 700;">${discountCode}</div>
                        ${validUntil ? `<p style="margin: 14px 0 0; font-size: 12px; color: #8a8178;">Valid until ${validUntil}</p>` : ""}
                    </td>
                </tr>
            </table>`
        : ""

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Cansoria Studio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: Arial, Helvetica, sans-serif; color: #332d28;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f4ef; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #eee6dc;">
                    <tr>
                        <td style="padding: 42px 44px 24px; text-align: center;">
                            <h1 style="margin: 0; font-size: 28px; font-weight: 500; letter-spacing: 4px; color: #2d2926; text-transform: uppercase;">Cansoria Studio</h1>
                            <p style="margin: 10px 0 0; font-size: 12px; letter-spacing: 2px; color: #9a7c62; text-transform: uppercase;">Hand-painted oil art</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 24px 44px 42px;">
                            <h2 style="margin: 0 0 18px; font-size: 26px; font-weight: 500; color: #332d28;">Welcome, ${firstName}.</h2>
                            <p style="margin: 0 0 16px; font-size: 16px; line-height: 26px; color: #5d534b;">Thank you for joining Cansoria Studio. We create hand-painted oil portraits, custom canvas artwork, and meaningful wall art made to order.</p>
                            <p style="margin: 0 0 18px; font-size: 16px; line-height: 26px; color: #5d534b;">You will receive studio notes, custom painting ideas, and private offers for artwork that feels personal in your home.</p>
                            ${discountHtml}
                            <p style="margin: 28px 0 0; text-align: center;">
                                <a href="${frontendUrl}/shop" style="display: inline-block; background-color: #2d2926; color: #ffffff; text-decoration: none; padding: 14px 34px; font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">Explore Paintings</a>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 44px; background-color: #fbfaf8; border-top: 1px solid #eee6dc; text-align: center;">
                            <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 1px; color: #8a8178; text-transform: uppercase;">Cansoria Studio</p>
                            <p style="margin: 0; font-size: 12px; color: #8a8178;">Questions? Reply to this email or visit <a href="${frontendUrl}" style="color: #8c6b54;">cansoria.com</a>.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

function renderOrderEmail(data: Record<string, any>, frontendUrl: string) {
    const firstName = escapeHtml(data.first_name || data.firstName || "there")
    const fullOrderId = String(data.id || data.display_id || "N/A")
    const orderId = fullOrderId.startsWith("order_") ? fullOrderId.substring(6) : fullOrderId
    const currencyCode = String(data.currency_code || "USD").toUpperCase()
    const shippingName = escapeHtml(data.shipping_methods?.[0]?.name || "Shipping")

    let itemsHtml = ""
    if (Array.isArray(data.items)) {
        for (const item of data.items) {
            const itemName = escapeHtml(item.title || item.product_title || "Artwork")
            const itemVariant = item.variant_title ? escapeHtml(item.variant_title) : ""
            const itemQty = Number(item.quantity || 1)
            const itemImage = escapeHtml(item.thumbnail || "https://placehold.co/90x110/f7f2ec/8a8178?text=Art")
            const itemPrice = formatMoney(item.unit_price || 0, currencyCode)
            const itemTotal = formatMoney((item.unit_price || 0) * itemQty, currencyCode)

            itemsHtml += `
                <tr>
                    <td style="padding: 18px 0; border-bottom: 1px solid #eee6dc;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td width="90" valign="top">
                                    <img src="${itemImage}" alt="${itemName}" width="90" height="110" style="display: block; object-fit: cover; border: 1px solid #eee6dc;">
                                </td>
                                <td valign="top" style="padding-left: 18px;">
                                    <p style="margin: 0 0 6px; font-size: 16px; color: #332d28;">${itemName}</p>
                                    ${itemVariant ? `<p style="margin: 0 0 6px; font-size: 13px; color: #8a8178;">${itemVariant}</p>` : ""}
                                    <p style="margin: 0; font-size: 13px; color: #8a8178;">Qty: ${itemQty} x ${itemPrice}</p>
                                </td>
                                <td valign="top" align="right" style="white-space: nowrap; font-size: 14px; color: #332d28;">${itemTotal}</td>
                            </tr>
                        </table>
                    </td>
                </tr>`
        }
    }

    const subtotal = formatMoney(data.subtotal ?? data.total ?? 0, currencyCode)
    const shipping = formatMoney(data.shipping_total ?? 0, currencyCode)
    const total = formatMoney(data.total ?? 0, currencyCode)
    const lookupEmail = encodeURIComponent(data.email || "")

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Cansoria Studio Order</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ef; font-family: Arial, Helvetica, sans-serif; color: #332d28;">
    <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eee6dc;">
        <tr>
            <td align="center" style="padding: 38px 28px 18px;">
                <h1 style="margin: 0; font-size: 26px; letter-spacing: 4px; text-transform: uppercase; color: #2d2926; font-weight: 500;">Cansoria Studio</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 0 42px 28px; text-align: center;">
                <p style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8a8178;">Order #${escapeHtml(orderId)}</p>
                <h2 style="margin: 0 0 18px; font-size: 30px; line-height: 1.2; color: #332d28; font-weight: 500;">Your artwork order is confirmed.</h2>
                <p style="margin: 0; font-size: 15px; line-height: 26px; color: #5d534b;">Hi ${firstName}, thank you for choosing Cansoria Studio. We are preparing your order and will keep you updated as it moves through the studio.</p>
            </td>
        </tr>
        ${itemsHtml ? `<tr><td style="padding: 0 42px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table></td></tr>` : ""}
        <tr>
            <td style="padding: 18px 42px 34px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #8a8178;">Subtotal</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; color: #332d28;">${subtotal}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0 14px; font-size: 14px; color: #8a8178;">${shippingName}</td>
                        <td align="right" style="padding: 8px 0 14px; font-size: 14px; color: #332d28;">${shipping}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 16px; border-top: 1px solid #eee6dc; font-size: 18px; color: #332d28; font-weight: 600;">Total</td>
                        <td align="right" style="padding-top: 16px; border-top: 1px solid #eee6dc; font-size: 20px; color: #8c6b54; font-weight: 700;">${total}</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 0 42px 40px;">
                <a href="${frontendUrl}/order/lookup?order=${escapeHtml(orderId)}&email=${lookupEmail}" style="display: inline-block; background-color: #2d2926; color: #ffffff; padding: 14px 30px; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">View Order Details</a>
            </td>
        </tr>
        <tr>
            <td style="background-color: #fbfaf8; padding: 30px 42px;">
                <h3 style="margin: 0 0 14px; font-size: 18px; color: #332d28; font-weight: 500;">What happens next?</h3>
                <p style="margin: 0 0 10px; font-size: 14px; line-height: 22px; color: #5d534b;"><strong>Studio review:</strong> We review your order details and reference notes before production begins.</p>
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #5d534b;"><strong>Shipping updates:</strong> You will receive tracking details once your canvas is ready to leave the studio.</p>
            </td>
        </tr>
        <tr>
            <td align="center" style="padding: 30px 42px; background-color: #f7f4ef;">
                <p style="margin: 0; font-size: 12px; color: #8a8178;">Cansoria Studio - Online art studio serving homes worldwide</p>
            </td>
        </tr>
    </table>
</body>
</html>`
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "resend-notification"
    protected resend: Resend
    protected options: ResendOptions

    constructor({ logger }, options: ResendOptions) {
        if (!options.apiKey) {
            throw new Error("[Resend Notification Provider] RESEND_API_KEY is required")
        }
        super()
        this.resend = new Resend(options.apiKey)
        this.options = options
    }

    async send(notification: any): Promise<{ id: string; to: string; status: string; data: Record<string, unknown> }> {
        const from = this.options.from || "hello@cansoria.com"
        const { to, template, data = {} } = notification
        const frontendUrl = process.env.STOREFRONT_URL || process.env.FRONTEND_URL || "http://localhost:3030"

        if (!to) {
            throw new Error("No 'to' address provided for notification")
        }

        if (!EMAIL_REGEX.test(to)) {
            throw new Error("Invalid email address format")
        }

        let htmlContent = ""
        let textContent = ""
        let subject = "Cansoria Studio"

        try {
            if (template === "customer_created") {
                htmlContent = renderWelcomeEmail(data, frontendUrl)
                subject = `Welcome to Cansoria Studio, ${data.first_name || data.firstName || "there"}`
            } else if (template === "order_placed") {
                const fullOrderId = String(data.id || data.display_id || "N/A")
                const orderId = fullOrderId.startsWith("order_") ? fullOrderId.substring(6) : fullOrderId
                htmlContent = renderOrderEmail(data, frontendUrl)
                subject = `Cansoria Studio order confirmation #${orderId}`
            } else {
                const templateBaseDir = path.join(process.cwd(), "data", "templates", template)

                const htmlPath = path.join(templateBaseDir, "html.hbs")
                if (fs.existsSync(htmlPath)) {
                    const htmlSource = fs.readFileSync(htmlPath, "utf-8")
                    const htmlTemplate = Handlebars.compile(htmlSource)
                    htmlContent = htmlTemplate(data)
                } else {
                    console.warn(`[Resend] No template found for ${template}`)
                    htmlContent = `<h1>${escapeHtml(template)}</h1><pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`
                }

                const textPath = path.join(templateBaseDir, "text.hbs")
                if (fs.existsSync(textPath)) {
                    const textSource = fs.readFileSync(textPath, "utf-8")
                    const textTemplate = Handlebars.compile(textSource)
                    textContent = textTemplate(data)
                }

                if (template === "order_placed") {
                    subject = `Cansoria Studio order confirmation #${data.display_id || data.id}`
                }
            }
        } catch (err) {
            console.error("[Resend] Failed to render template:", err)
            htmlContent = `<pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>`
        }

        try {
            const emailOptions: any = {
                from,
                to,
                subject,
                html: htmlContent,
                reply_to: process.env.RESEND_REPLY_TO || "hello@cansoria.com",
            }

            if (textContent) {
                emailOptions.text = textContent
            }

            const { data: result, error } = await this.resend.emails.send(emailOptions)

            if (error) {
                console.error("[Resend] Email send failed:", error.message || "Unknown error")
                throw new Error("Failed to send email notification")
            }

            console.log(`[Resend] Email sent to ${to} [ID: ${result?.id}] [Template: ${template}]`)

            return {
                id: result?.id || `email-${Date.now()}`,
                to,
                status: "sent",
                data: {
                    resend_id: result?.id,
                    template,
                },
            }
        } catch (error) {
            console.error("[Resend] Send operation failed:", error instanceof Error ? error.message : "Unknown error")
            throw new Error("Email notification failed")
        }
    }
}

export default ResendNotificationProviderService
