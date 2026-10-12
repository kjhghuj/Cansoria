import type { MedusaRequest, MedusaNextFunction, MedusaResponse } from "@medusajs/framework/http"

/**
 * Retired compatibility export. Product updates change references only.
 * Physical cleanup must wait for complete reference checks, retention and recovery.
 * This middleware is deliberately no longer registered.
 */
export function productImageCleanupMiddleware(
    _req: MedusaRequest,
    _res: MedusaResponse,
    next: MedusaNextFunction
) {
    return next()
}
