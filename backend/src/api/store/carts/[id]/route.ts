import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { updateCartWorkflowId } from "@medusajs/medusa/core-flows";
import { refetchCart } from "@medusajs/medusa/api/store/carts/helpers";
import { authorizeCart, sensitiveResponse, registeredOwner } from "../../../../lib/resource-access";
import { guestCustomer } from "../../../../lib/guest-customer";
import { applyCartFields, safeCartInput } from "../../../../lib/cart-fields";


export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    sensitiveResponse(res);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const cartId = req.params.id;

    // Validate cart ID is provided
    if (!cartId) {
        return res.status(400).json({ error: "Cart ID is required" });
    }


    try {
        if (!(await authorizeCart(req, cartId))) return res.status(403).json({ type: "forbidden", message: "Cart access denied" });
        const { data: carts } = await query.graph({
            entity: "cart",
            fields: [
                // Basic cart info
                "id",
                "email",
                "currency_code",
                "region_id",
                "completed_at",

                // Calculated totals - CRITICAL for cart page
                "total",
                "subtotal",
                "item_subtotal",
                "discount_total",
                "tax_total",
                "shipping_total",
                "item_tax_total",

                // Items with variants
                "items.*",
                "items.adjustments.*",
                "items.variant.*",
                "items.variant.images.*",
                "items.variant.product.id",
                "items.variant.product.title",
                "items.variant.product.thumbnail",
                "items.variant.product.handle",

                // Promotions/Coupons
                "promotions.*",

                // Shipping and payment state needed by checkout
                "shipping_methods.*",
                "shipping_methods.shipping_option.*",
                "payment_collection.id",
                "payment_collection.status",
                "payment_collection.payment_sessions.id",
                "payment_collection.payment_sessions.provider_id",
                "payment_collection.payment_sessions.status",
                "payment_collection.payment_sessions.data",

                // Region and addresses
                "region.*",
                "shipping_address.*",
                "billing_address.*",
            ],
            filters: { id: cartId },
        });

        if (!carts || carts.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        const cart = carts[0] as any;
        if (cart.payment_collection?.payment_sessions) {
            cart.payment_collection.payment_sessions = cart.payment_collection.payment_sessions.map((session: any) => ({
                id: session.id, provider_id: session.provider_id, status: session.status,
                data: { client_secret: session.data?.client_secret },
            }));
        }

        if (cart.completed_at) {
            return res.status(404).json({ error: "Cart is already completed" });
        }

        return res.json({ cart });
    } catch (error) {
        // Log the error but don't expose internal details to the client
        console.error("[API Error] Failed to fetch cart:", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ error: "Failed to retrieve cart" });
    }
}

/** Serialize email updates with explicit customer claim and recheck current ownership under the lock. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    sensitiveResponse(res);
    applyCartFields(req);
    const input = safeCartInput(req.validatedBody);
    if (!input) return res.status(400).json({ type: "invalid_request", message: "Provide address details rather than address references" });
    const id = req.params.id;
    try {
        const locking = req.scope.resolve(Modules.LOCKING);
        const result = await locking.execute(`cart-identity:${id}`, async () => {
            if (!(await authorizeCart(req, id))) return null;
            const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
            const { data } = await query.graph({ entity: "cart", fields: ["id", "customer_id", "customer.has_account", "metadata"], filters: { id } });
            if ("metadata" in input && Array.isArray(data[0]?.metadata?.portrait_photos)) {
                input.metadata = { ...(input.metadata || {}), portrait_photos: data[0].metadata.portrait_photos };
            }
            if (!registeredOwner(data[0]) && typeof input.email === "string") {
                const customerId = await guestCustomer(req, input.email);
                if (customerId) await req.scope.resolve(Modules.CART).updateCarts(id, { customer_id: customerId });
            }
            await req.scope.resolve(Modules.WORKFLOW_ENGINE).run(updateCartWorkflowId, { input: { ...input, id } });
            return refetchCart(id, req.scope, req.queryConfig.fields);
        }, { timeout: 300 });
        if (!result) return res.status(403).json({ type: "forbidden", message: "Cart access denied" });
        return res.status(200).json({ cart: result });
    } catch {
        return res.status(503).json({ type: "unavailable", message: "Cart update unavailable" });
    }
}
