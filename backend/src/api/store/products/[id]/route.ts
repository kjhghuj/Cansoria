import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE_REGEX = /^[a-z0-9-_]+$/i;

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const productId = req.params.id;

    if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
    }

    const isValidUUID = UUID_REGEX.test(productId);
    const isValidHandle = HANDLE_REGEX.test(productId);

    if (!isValidUUID && !isValidHandle) {
        return res.status(400).json({ error: "Invalid product ID or handle format" });
    }

    try {
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "subtitle",
                "description",
                "handle",
                "thumbnail",
                "status",
                "metadata",
                "images.*",
                "options.*",
                "tags.*",
                "variants.*",
                "variants.metadata",
                "variants.thumbnail",
                "variants.images.*",
                "variants.prices.*",
                "variants.options.*",
                "categories.*",
            ],
            filters: {
                $or: [
                    { id: productId },
                    { handle: productId },
                ],
            },
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        const product = products[0] as any;

        if (Array.isArray(product.variants)) {
            product.variants.forEach((variant: any) => {
                const metaImages = variant.metadata?.images as { url: string }[] | undefined;
                if (metaImages?.[0]?.url && !variant.thumbnail) {
                    variant.thumbnail = metaImages[0].url;
                }
            });
        }

        return res.json({ product });
    } catch (error) {
        console.error("[API Error] Failed to fetch product:", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ error: "Failed to retrieve product" });
    }
}
