import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

const artworkSizes = ["8x10", "12x16", "16x20", "24x36"];
const framingOptions = ["Canvas Only", "Framed"];
const orientations = ["Portrait", "Landscape", "Square"];

const sizeBasePrices: Record<string, number> = {
  "8x10": 12900,
  "12x16": 18900,
  "16x20": 25900,
  "24x36": 39900,
};

function money(amountUsd: number) {
  return [
    { amount: Math.round(amountUsd * 0.78), currency_code: "gbp" },
    { amount: Math.round(amountUsd * 0.92), currency_code: "eur" },
    { amount: amountUsd, currency_code: "usd" },
  ];
}

function slug(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createArtworkVariants(skuPrefix: string, priceOffset = 0) {
  return artworkSizes.flatMap((size) =>
    framingOptions.flatMap((framing) =>
      orientations.map((orientation) => {
        const framedPremium = framing === "Framed" ? 7000 : 0;
        const squareAdjustment = orientation === "Square" ? 1500 : 0;
        const amount = sizeBasePrices[size] + framedPremium + squareAdjustment + priceOffset;

        return {
          title: `${size} / ${framing} / ${orientation}`,
          sku: `${skuPrefix}-${slug(size)}-${slug(framing)}-${slug(orientation)}`,
          options: {
            Size: size,
            Framing: framing,
            Orientation: orientation,
          },
          prices: money(amount),
          metadata: {
            size,
            framing,
            orientation,
          },
        };
      })
    )
  );
}

function storySections(subject: string, imageUrl: string) {
  return [
    {
      id: "artist-interpretation",
      title: "Painted From a Meaningful Reference",
      content: `Every ${subject} begins with composition notes, color direction, and brushwork choices made by a real artist.`,
      imageUrl,
      imageAlt: `${subject} artwork in progress`,
    },
    {
      id: "preview-before-shipping",
      title: "Previewed Before It Leaves the Studio",
      content:
        "Cansoria sends a digital preview so customers can review the direction before the finished canvas is packed for delivery.",
      imageUrl,
      imageAlt: `${subject} finished canvas detail`,
    },
  ];
}

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  const countries = ["gb", "us", "de", "fr", "dk", "se", "es", "it", "nl", "be"];

  logger.info("Seeding Cansoria Studio store data...");
  const [store] = await storeModuleService.listStores();

  await storeModuleService.updateStores(store.id, {
    name: "Cansoria Studio",
    metadata: {
      ...store.metadata,
      brand: "Cansoria Studio",
      support_email: "hello@cansoria.com",
      studio_note: "Hand-painted canvas art made to order by independent artists.",
    },
  });

  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Cansoria Studio Storefront",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Cansoria Studio Storefront",
            description: "Custom oil paintings and canvas wall art",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        { currency_code: "gbp", is_default: true },
        { currency_code: "usd" },
        { currency_code: "eur" },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United Kingdom",
          currency_code: "gbp",
          countries: ["gb"],
          payment_providers: ["pp_stripe_stripe"],
        },
        {
          name: "United States",
          currency_code: "usd",
          countries: ["us"],
          payment_providers: ["pp_stripe_stripe"],
        },
        {
          name: "Europe",
          currency_code: "eur",
          countries: ["de", "fr", "dk", "se", "es", "it", "nl", "be"],
          payment_providers: ["pp_stripe_stripe"],
        },
      ],
    },
  });
  const ukRegion = regionResult[0];
  const usRegion = regionResult[1];
  const euRegion = regionResult[2];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Cansoria Studio Fulfillment",
          address: {
            city: "London",
            country_code: "GB",
            address_1: "Cansoria Studio Fulfillment",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Cansoria Artwork Shipping",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Cansoria Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Cansoria Global Delivery",
        geo_zones: countries.map((code) => ({
          country_code: code,
          type: "country" as const,
        })),
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Art Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard Art Delivery",
          description: "Tracked delivery for finished canvas artwork.",
          code: "standard-art-delivery",
        },
        prices: [
          { currency_code: "gbp", amount: 900 },
          { currency_code: "eur", amount: 1100 },
          { currency_code: "usd", amount: 1400 },
          { region_id: ukRegion.id, amount: 900 },
          { region_id: usRegion.id, amount: 1400 },
          { region_id: euRegion.id, amount: 1100 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Priority Art Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Priority Art Delivery",
          description: "Faster tracked delivery once the canvas is ready.",
          code: "priority-art-delivery",
        },
        prices: [
          { currency_code: "gbp", amount: 1800 },
          { currency_code: "eur", amount: 2200 },
          { currency_code: "usd", amount: 2800 },
          { region_id: ukRegion.id, amount: 1800 },
          { region_id: usRegion.id, amount: 2800 },
          { region_id: euRegion.id, amount: 2200 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Free Art Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Free Art Delivery",
          description: "Complimentary tracked delivery for qualifying artwork orders.",
          code: "free-art-delivery",
        },
        prices: [
          { currency_code: "gbp", amount: 0 },
          { currency_code: "eur", amount: 0 },
          { currency_code: "usd", amount: 0 },
          { region_id: ukRegion.id, amount: 0 },
          { region_id: usRegion.id, amount: 0 },
          { region_id: euRegion.id, amount: 0 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Cansoria Studio Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info(`Publishable API Key: ${(publishableApiKey as any).token || publishableApiKey.id}`);
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Custom Portraits",
          handle: "custom-portraits",
          description: "Photo-to-painting portraits created as hand-painted oil artwork.",
          is_active: true,
        },
        {
          name: "Custom Painting",
          handle: "custom-painting",
          description: "Made-to-order canvas paintings from customer references.",
          is_active: true,
        },
        {
          name: "Pet Portraits",
          handle: "pet-portraits",
          description: "Hand-painted canvas portraits of beloved companions.",
          is_active: true,
        },
        {
          name: "Wedding Gifts",
          handle: "wedding-gifts",
          description: "Anniversary and wedding memory paintings on canvas.",
          is_active: true,
        },
        {
          name: "Landscape",
          handle: "landscape",
          description: "Landscape oil paintings for calm, atmospheric rooms.",
          is_active: true,
        },
        {
          name: "Abstract",
          handle: "abstract",
          description: "Abstract canvas wall art with layered brushwork.",
          is_active: true,
        },
        {
          name: "Classic Art",
          handle: "classic-art",
          description: "Classic art reproductions and traditional oil studies.",
          is_active: true,
        },
        {
          name: "Home Decor",
          handle: "home-decor",
          description: "Canvas paintings chosen for living rooms, bedrooms, and offices.",
          is_active: true,
        },
        {
          name: "Wall Art",
          handle: "wall-art",
          description: "Display-ready oil paintings and decorative canvas art.",
          is_active: true,
        },
      ],
    },
  });

  const customPortraitsCategory = categoryResult.find((cat) => cat.handle === "custom-portraits")!;
  const customPaintingCategory = categoryResult.find((cat) => cat.handle === "custom-painting")!;
  const petPortraitsCategory = categoryResult.find((cat) => cat.handle === "pet-portraits")!;
  const weddingGiftsCategory = categoryResult.find((cat) => cat.handle === "wedding-gifts")!;
  const landscapeCategory = categoryResult.find((cat) => cat.handle === "landscape")!;
  const abstractCategory = categoryResult.find((cat) => cat.handle === "abstract")!;
  const classicArtCategory = categoryResult.find((cat) => cat.handle === "classic-art")!;
  const homeDecorCategory = categoryResult.find((cat) => cat.handle === "home-decor")!;
  const wallArtCategory = categoryResult.find((cat) => cat.handle === "wall-art")!;

  logger.info("Seeding Cansoria Studio products...");

  const commonOptions = [
    { title: "Size", values: artworkSizes },
    { title: "Framing", values: framingOptions },
    { title: "Orientation", values: orientations },
  ];

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Custom Portrait From Photo",
          handle: "custom-portrait-from-photo",
          subtitle: "A hand-painted oil portrait created from your favorite photo.",
          description:
            "Send a cherished photo and Cansoria artists will translate it into a timeless oil painting on premium canvas.",
          category_ids: [customPortraitsCategory.id, customPaintingCategory.id],
          material: "Artist-grade oil paint on premium cotton canvas",
          weight: 900,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-PORTRAIT"),
          metadata: {
            customizable: true,
            upload_required: true,
            free_preview: true,
            rating: 4.9,
            review_count: 214,
            production_time: "2-3 weeks",
            story_sections: storySections("custom portrait", "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Pet Portrait Oil Painting",
          handle: "pet-portrait-oil-painting",
          subtitle: "A museum-quality canvas tribute to a beloved companion.",
          description:
            "Capture the expression, texture, and spirit of a pet in a hand-painted canvas artwork.",
          category_ids: [petPortraitsCategory.id, customPaintingCategory.id],
          material: "Layered oil paint on stretched cotton canvas",
          weight: 900,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-PET", -2000),
          metadata: {
            customizable: true,
            upload_required: true,
            free_preview: true,
            rating: 4.8,
            review_count: 156,
            production_time: "2-3 weeks",
            story_sections: storySections("pet portrait", "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Wedding Anniversary Oil Portrait",
          handle: "wedding-anniversary-oil-portrait",
          subtitle: "A romantic hand-painted canvas made from a wedding memory.",
          description:
            "Transform a ceremony, first dance, proposal, or anniversary photo into a lasting oil portrait.",
          category_ids: [weddingGiftsCategory.id, customPortraitsCategory.id],
          material: "Artist-grade oil paint on premium stretched canvas",
          weight: 1000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-WEDDING", 1500),
          metadata: {
            customizable: true,
            upload_required: true,
            free_preview: true,
            rating: 4.9,
            review_count: 98,
            production_time: "2-4 weeks",
            story_sections: storySections("wedding portrait", "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Landscape Oil Painting",
          handle: "landscape-oil-painting",
          subtitle: "Atmospheric scenery painted in layered oils.",
          description:
            "A hand-painted landscape canvas for calm rooms, reading corners, and statement walls.",
          category_ids: [landscapeCategory.id, wallArtCategory.id],
          material: "Oil paint on stretched cotton canvas",
          weight: 1100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-LANDSCAPE", -1000),
          metadata: {
            customizable: false,
            upload_required: false,
            free_preview: true,
            rating: 4.7,
            review_count: 82,
            production_time: "1-2 weeks",
            story_sections: storySections("landscape painting", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Abstract Canvas Wall Art",
          handle: "abstract-canvas-wall-art",
          subtitle: "Modern abstract oil painting with tactile brushwork.",
          description:
            "Layered abstract wall art created for living rooms, bedrooms, offices, and gallery walls.",
          category_ids: [abstractCategory.id, wallArtCategory.id, homeDecorCategory.id],
          material: "Textured oil paint on stretched canvas",
          weight: 1100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-ABSTRACT", -500),
          metadata: {
            customizable: false,
            upload_required: false,
            free_preview: true,
            rating: 4.8,
            review_count: 121,
            production_time: "1-2 weeks",
            story_sections: storySections("abstract canvas wall art", "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Classic Art Reproduction",
          handle: "classic-art-reproduction",
          subtitle: "A traditional oil study inspired by classic painting techniques.",
          description:
            "A hand-painted classic reproduction for customers who want old-world composition and brushwork.",
          category_ids: [classicArtCategory.id, wallArtCategory.id],
          material: "Oil paint on premium cotton canvas",
          weight: 1000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-CLASSIC", 2500),
          metadata: {
            customizable: false,
            upload_required: false,
            free_preview: true,
            rating: 4.8,
            review_count: 64,
            production_time: "2-4 weeks",
            story_sections: storySections("classic art reproduction", "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Home Decor Canvas Painting",
          handle: "home-decor-canvas-painting",
          subtitle: "Display-ready oil painting selected for everyday rooms.",
          description:
            "A versatile canvas painting designed to add warmth, texture, and a finished feeling to your home.",
          category_ids: [homeDecorCategory.id, wallArtCategory.id],
          material: "Oil paint on stretched canvas with optional frame",
          weight: 1000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createArtworkVariants("CAN-HOME", -1500),
          metadata: {
            customizable: false,
            upload_required: false,
            free_preview: true,
            rating: 4.7,
            review_count: 73,
            production_time: "1-2 weeks",
            story_sections: storySections("home decor canvas painting", "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1200"),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    inventoryLevels.push({
      location_id: stockLocation.id,
      stocked_quantity: 1000,
      inventory_item_id: inventoryItem.id,
    });
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
  logger.info("======================================");
  logger.info("Cansoria Studio seed data complete!");
  logger.info(`Publishable API Key: ${(publishableApiKey as any).token || "Check admin panel"}`);
  logger.info("======================================");
}
