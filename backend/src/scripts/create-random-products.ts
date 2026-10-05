import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    ProductStatus,
} from "@medusajs/framework/utils";
import {
    createProductsWorkflow,
    createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";

const productData = [
    {
        title: "Sunlit Family Portrait",
        subtitle: "Custom oil portrait from a family photo",
        description: "A warm hand-painted family portrait created from a favorite reference photo, designed for living rooms, hallways, and meaningful gifts.",
    },
    {
        title: "Golden Retriever Portrait",
        subtitle: "Pet portrait oil painting",
        description: "A characterful oil portrait that captures a beloved pet's expression, fur texture, and everyday charm on premium canvas.",
    },
    {
        title: "Anniversary Ceremony Portrait",
        subtitle: "Wedding memory on canvas",
        description: "A hand-painted artwork based on a wedding or anniversary photo, made for lasting home display.",
    },
    {
        title: "Quiet Lake Landscape",
        subtitle: "Landscape oil painting",
        description: "A calm landscape composition with layered brushwork, soft water reflections, and a timeless palette.",
    },
    {
        title: "Warm Abstract Canvas",
        subtitle: "Abstract wall art",
        description: "A textured abstract canvas designed to add movement, warmth, and depth to a modern interior.",
    },
    {
        title: "Classic Garden Reproduction",
        subtitle: "Classic art inspired reproduction",
        description: "A classic-style garden scene painted to order with expressive brush texture and rich color transitions.",
    },
    {
        title: "Neutral Home Decor Canvas",
        subtitle: "Interior wall art",
        description: "A soft neutral canvas created for bedrooms, reading corners, and calm home styling.",
    },
    {
        title: "Mountain Air Study",
        subtitle: "Made-to-order landscape artwork",
        description: "A crisp mountain landscape study with atmospheric distance and a balanced natural color palette.",
    },
    {
        title: "Heirloom Portrait Study",
        subtitle: "Custom portrait painting",
        description: "A refined portrait study for personal milestones, family keepsakes, and thoughtful gifts.",
    },
    {
        title: "Coastal Light Canvas",
        subtitle: "Ocean-inspired wall art",
        description: "A coastal oil painting with gentle light, open space, and painterly texture for relaxed interiors.",
    },
];

const sizes = ["8x10", "12x16", "16x20", "24x36"];
const framing = ["Canvas Only", "Framed"];

function getRandomPrice(): number {
    return Math.floor(Math.random() * 18001) + 12900;
}

export default async function createRandomProducts({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Creating 10 Cansoria sample artwork products...");

    const { data: salesChannels } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "name"],
    });

    if (!salesChannels.length) {
        logger.error("No sales channel found. Please run seed first.");
        return;
    }

    const defaultSalesChannel = salesChannels[0];
    logger.info(`Using sales channel: ${defaultSalesChannel.name}`);

    const { data: shippingProfiles } = await query.graph({
        entity: "shipping_profile",
        fields: ["id"],
        filters: { type: "default" },
    });

    if (!shippingProfiles.length) {
        logger.error("No shipping profile found. Please run seed first.");
        return;
    }

    const shippingProfile = shippingProfiles[0];

    const { data: stockLocations } = await query.graph({
        entity: "stock_location",
        fields: ["id"],
    });

    if (!stockLocations.length) {
        logger.error("No stock location found. Please run seed first.");
        return;
    }

    const stockLocation = stockLocations[0];

    const productsToCreate = productData.map((product, index) => {
        const selectedSize = sizes[index % sizes.length];
        const selectedFraming = framing[index % framing.length];
        const priceUsd = getRandomPrice();
        const priceGbp = Math.floor(priceUsd * 0.78);
        const priceEur = Math.floor(priceUsd * 0.92);

        return {
            title: product.title,
            handle: product.title.toLowerCase().replace(/\s+/g, "-"),
            subtitle: product.subtitle,
            description: product.description,
            weight: Math.floor(Math.random() * 1800) + 500,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
                { url: `https://images.unsplash.com/photo-${1578301978693 + index * 1000}?auto=format&fit=crop&q=80&w=800` },
            ],
            options: [
                { title: "Size", values: [selectedSize] },
                { title: "Framing", values: [selectedFraming] },
            ],
            metadata: {
                customizable: true,
                free_preview: true,
                production_time: "2-3 weeks",
            },
            variants: [
                {
                    title: `${selectedSize} / ${selectedFraming}`,
                    sku: `CANSORIA-SAMPLE-${String(index + 1).padStart(2, "0")}`,
                    options: {
                        Size: selectedSize,
                        Framing: selectedFraming,
                    },
                    manage_inventory: true,
                    prices: [
                        { amount: priceUsd, currency_code: "usd" },
                        { amount: priceGbp, currency_code: "gbp" },
                        { amount: priceEur, currency_code: "eur" },
                    ],
                },
            ],
            sales_channels: [{ id: defaultSalesChannel.id }],
        };
    });

    try {
        const { result: createdProducts } = await createProductsWorkflow(container).run({
            input: { products: productsToCreate },
        });

        logger.info(`Created ${createdProducts.length} Cansoria sample products`);

        const inventoryLevels: any[] = [];

        for (const product of createdProducts as any[]) {
            for (const variant of product.variants || []) {
                if (variant.inventory_items?.length) {
                    for (const inventoryItem of variant.inventory_items) {
                        inventoryLevels.push({
                            inventory_item_id: inventoryItem.inventory_item_id,
                            location_id: stockLocation.id,
                            stocked_quantity: 100,
                        });
                    }
                }
            }
        }

        if (inventoryLevels.length > 0) {
            await createInventoryLevelsWorkflow(container).run({
                input: { inventory_levels: inventoryLevels },
            });
            logger.info(`Set inventory to 100 for ${inventoryLevels.length} variants`);
        }

        logger.info("Successfully created 10 Cansoria sample artwork products.");

        for (const product of createdProducts as any[]) {
            const variant = product.variants?.[0];
            const usdPrice = variant?.prices?.find((price: any) => price.currency_code === "usd");
            logger.info(`  - ${product.title}: $${(usdPrice?.amount || 0) / 100}`);
        }
    } catch (error) {
        logger.error("Error creating Cansoria sample products:", error);
        throw error;
    }
}
