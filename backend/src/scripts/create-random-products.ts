import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    ProductStatus,
} from "@medusajs/framework/utils";
import {
    createProductsWorkflow,
    createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";
import { watchPrices, sampleUsdPrice } from "../lib/watch-prices";

const productData = [
    {
        title: "Harbor Moonphase",
        subtitle: "Moonphase complication watch",
        description: "A moonphase display set against a deep blue dial, with a date ring and polished case for evenings out.",
    },
    {
        title: "Cedar GMT",
        subtitle: "Dual-time travel watch",
        description: "A GMT watch with a 24-hour hand and two-tone bezel, made for keeping home time while away.",
    },
    {
        title: "Aster Skeleton",
        subtitle: "Open-heart automatic watch",
        description: "An open-heart dial that shows the balance wheel at work, finished with an exhibition caseback.",
    },
    {
        title: "Quill Small Seconds",
        subtitle: "Dress watch with small seconds",
        description: "A restrained dial with a sub-seconds register at six o'clock and a slim leather strap.",
    },
    {
        title: "Beacon Pilot",
        subtitle: "Flieger-style pilot watch",
        description: "A pilot watch with luminous Arabic numerals, a fluted bezel, and a soft riveted strap.",
    },
    {
        title: "Wren Pocket Watch",
        subtitle: "Modern pocket watch",
        description: "A contemporary pocket watch with a chain, exhibition back, and a stand for desk display.",
    },
    {
        title: "Fable Rectangular",
        subtitle: "Art-deco rectangular watch",
        description: "A stepped rectangular case with a guilloche-style dial and blued hands.",
    },
    {
        title: "Tarn Pocket Chrono",
        subtitle: "Single-button chronograph",
        description: "A single-push chronograph with a telemeter scale and domed pusher.",
    },
    {
        title: "Birch Field Watch",
        subtitle: "Everyday field watch",
        description: "A matte field watch with crossed-out luminous numerals and a quick-release canvas strap.",
    },
    {
        title: "Solen Dress Minimal",
        subtitle: "Two-hand minimalist watch",
        description: "A two-hand watch with a clean sandwich dial and hidden lugs for an uninterrupted profile.",
    },
];

const sizes = ["36mm", "38mm", "40mm", "42mm"];
const straps = ["Leather Strap", "Steel Bracelet"];

export default async function createRandomProducts({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Creating 10 Cansoria sample watch products...");

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
        const selectedStrap = straps[index % straps.length];
        const priceUsd = sampleUsdPrice();

        return {
            title: product.title,
            handle: product.title.toLowerCase().replace(/\s+/g, "-"),
            subtitle: product.subtitle,
            description: product.description,
            weight: Math.floor(Math.random() * 180) + 150,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            images: [
                { url: `https://images.unsplash.com/photo-${1578301978693 + index * 1000}?auto=format&fit=crop&q=80&w=800` },
            ],
            options: [
                { title: "Size", values: [selectedSize] },
                { title: "Strap", values: [selectedStrap] },
            ],
            metadata: {
                engraveable: false,
                movement: "Japanese quartz, 3-year battery",
                water_resistance: "5 ATM",
                warranty: "2-year international warranty",
            },
            variants: [
                {
                    title: `${selectedSize} / ${selectedStrap}`,
                    sku: `CANSORIA-SAMPLE-${String(index + 1).padStart(2, "0")}`,
                    options: {
                        Size: selectedSize,
                        Strap: selectedStrap,
                    },
                    manage_inventory: true,
                    prices: watchPrices(priceUsd),
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

        logger.info("Successfully created 10 Cansoria sample watch products.");

        for (const product of createdProducts as any[]) {
            const variant = product.variants?.[0];
            const usdPrice = variant?.prices?.find((price: any) => price.currency_code === "usd");
            logger.info(`  - ${product.title}: ${new Intl.NumberFormat("en-US", {
                style: "currency", currency: "USD",
            }).format(Number(usdPrice?.amount || 0))}`);
        }
    } catch (error) {
        logger.error("Error creating Cansoria sample products:", error);
        throw error;
    }
}
