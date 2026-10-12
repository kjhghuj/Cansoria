import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Physical file deletion is retired until shared references, retention and
 * recoverable storage are enforced. Also used to block native upload deletion.
 */
export async function POST(_req: MedusaRequest, res: MedusaResponse) {
    return res.status(410).json({
        message: "File deletion is unavailable. Remove image references from the product instead; stored files are retained.",
        deletion_available: false,
        deleted_count: 0,
    })
}
