import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { subscribeToNewsletter } from "../../../lib/klaviyo";
import { verifyTurnstileToken } from "../../../lib/turnstile";

type NewsletterRequestBody = {
    email: string;
    turnstile_token?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
    req: MedusaRequest<NewsletterRequestBody>,
    res: MedusaResponse
) {
    const { email, turnstile_token } = req.body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            type: "invalid_request",
            message: "A valid email is required",
        });
    }

    if (!turnstile_token || typeof turnstile_token !== "string") {
        return res.status(400).json({
            type: "invalid_request",
            message: "Turnstile token is required",
        });
    }

    const isValidToken = await verifyTurnstileToken(turnstile_token);
    if (!isValidToken) {
        return res.status(400).json({
            type: "invalid_request",
            message: "Invalid Turnstile token",
        });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const discountCode = `ART15-${randomSuffix}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    let promotionCreated = false;
    let klaviyoSubscribed = false;

    try {
        try {
            const promotionModule = req.scope.resolve("promotion");

            if (promotionModule) {
                const campaign = await promotionModule.createCampaigns({
                    campaign_identifier: `cansoria-newsletter-${randomSuffix}`,
                    name: `Cansoria Newsletter Welcome ${randomSuffix}`,
                    starts_at: now,
                    ends_at: expiresAt,
                });

                await promotionModule.createPromotions({
                    code: discountCode,
                    type: "standard",
                    status: "active",
                    campaign_id: campaign.id,
                    application_method: {
                        type: "percentage",
                        target_type: "order",
                        value: 15,
                        allocation: "across",
                    },
                });

                promotionCreated = true;
                console.log(`[Newsletter] Created Cansoria promotion code: ${discountCode}`);
            }
        } catch (err) {
            console.error("[Newsletter] Failed to create Cansoria promotion:", err);
        }

        try {
            await subscribeToNewsletter(normalizedEmail, {
                discountCode,
                validUntil: expiresAt.toISOString(),
                source: "cansoria-storefront",
            });
            klaviyoSubscribed = true;
        } catch (err) {
            console.warn("[Newsletter] Klaviyo sync skipped or failed:", err instanceof Error ? err.message : err);
        }

        return res.status(200).json({
            message: promotionCreated
                ? "Successfully subscribed. Your Cansoria welcome code is ready."
                : "Successfully subscribed.",
            discount_code: promotionCreated ? discountCode : undefined,
            valid_until: promotionCreated ? expiresAt.toISOString() : undefined,
            promotion_created: promotionCreated,
            klaviyo_subscribed: klaviyoSubscribed,
        });
    } catch (error) {
        console.error("[Newsletter] Flow error:", error);
        return res.status(500).json({
            type: "internal_error",
            message: "Failed to process subscription",
        });
    }
}
