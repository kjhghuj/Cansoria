import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { PUBLIC_STORE_METADATA_KEYS, publicCatalogMetadata } from "../../../lib/catalog-fields";
import { storeOrdersOpen } from "../../../lib/store-status";

/**
 * GET /store/store-info
 *
 * Custom endpoint to retrieve store information including metadata.
 * This is needed because MedusaJS v2 Store API doesn't have a default store endpoint.
 * `orders_open` is the computed commerce readiness used by storefront gating;
 * `capabilities` tells the storefront which optional services are actually
 * configured so it can hide entries it cannot serve.
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    // Gating data must not be cached by intermediaries.
    res.setHeader("Cache-Control", "no-store");
    try {
        const storeModule = req.scope.resolve(Modules.STORE);

        // Get the first (default) store
        const stores = await storeModule.listStores();
        const store = stores?.[0];

        if (!store) {
            return res.status(404).json({
                type: "not_found",
                message: "Store not found",
            });
        }

        res.status(200).json({
            store: {
                id: store.id,
                name: store.name,
                metadata: publicCatalogMetadata(store.metadata, PUBLIC_STORE_METADATA_KEYS) || {},
                orders_open: storeOrdersOpen(store.metadata),
                capabilities: {
                    // Presence only — never key values. Newsletter needs Turnstile
                    // verification plus a Klaviyo destination to be honest to show.
                    newsletter: Boolean(
                        process.env.TURNSTILE_SECRET_KEY &&
                        process.env.KLAVIYO_PRIVATE_KEY &&
                        process.env.KLAVIYO_LIST_ID
                    ),
                },
            },
        });
    } catch (error: any) {
        console.error("[store-info] Error fetching store:", error);
        res.status(500).json({
            type: "internal_error",
            message: "Failed to fetch store information",
        });
    }
}
