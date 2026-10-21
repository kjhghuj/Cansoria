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
import {
  watchPrices, watchSizes, watchSku, watchUsdPrice,
  strapOptions, dialOptions, shippingPrice,
} from "../lib/watch-prices";

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

function createWatchVariants(skuPrefix: string, priceOffset = 0) {
  return watchSizes.flatMap((size) =>
    strapOptions.flatMap((strap) =>
      dialOptions.map((dial) => {
        const amount = watchUsdPrice(size, strap, priceOffset);

        return {
          title: `${size} / ${strap} / ${dial}`,
          sku: watchSku(skuPrefix, size, strap, dial),
          options: {
            Size: size,
            Strap: strap,
            Dial: dial,
          },
          prices: watchPrices(amount),
          metadata: {
            size,
            strap,
            dial,
          },
        };
      })
    )
  );
}

function storySections(subject: string, imageUrl: string, engraveable: boolean) {
  return [
    {
      id: "movement-and-craft",
      title: "Built Around a Movement Worth Keeping",
      content: `Every ${subject} is assembled in-house, regulated by hand, and tested across five positions before the case is sealed.`,
      imageUrl,
      imageAlt: `${subject} movement detail`,
    },
    engraveable
      ? {
          id: "caseback-engraving",
          title: "Engraved Casebacks, Finished by Hand",
          content:
            "Add up to twenty characters to the caseback. Each engraving is cut to order and inspected under magnification before the watch ships.",
          imageUrl,
          imageAlt: `${subject} engraved caseback detail`,
        }
      : {
          id: "quality-control",
          title: "Checked Before It Leaves the Studio",
          content:
            "Cansoria inspects every watch for timekeeping, water resistance, and finish before it is boxed with its warranty and strap tool.",
          imageUrl,
          imageAlt: `${subject} quality control detail`,
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
      studio_note: "Watches designed, assembled, and regulated in-house.",
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
            description: "Watches and accessories",
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
              name: "Cansoria Watch Shipping",
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
        name: "Standard Watch Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard Watch Delivery",
          description: "Insured tracked delivery for watches and accessories.",
          code: "standard-watch-delivery",
        },
        prices: [
          { currency_code: "gbp", amount: shippingPrice("Standard Watch Delivery", "gbp") },
          { currency_code: "eur", amount: shippingPrice("Standard Watch Delivery", "eur") },
          { currency_code: "usd", amount: shippingPrice("Standard Watch Delivery", "usd") },
          { region_id: ukRegion.id, amount: shippingPrice("Standard Watch Delivery", "gbp") },
          { region_id: usRegion.id, amount: shippingPrice("Standard Watch Delivery", "usd") },
          { region_id: euRegion.id, amount: shippingPrice("Standard Watch Delivery", "eur") },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Priority Watch Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Priority Watch Delivery",
          description: "Faster insured tracked delivery with signature on arrival.",
          code: "priority-watch-delivery",
        },
        prices: [
          { currency_code: "gbp", amount: shippingPrice("Priority Watch Delivery", "gbp") },
          { currency_code: "eur", amount: shippingPrice("Priority Watch Delivery", "eur") },
          { currency_code: "usd", amount: shippingPrice("Priority Watch Delivery", "usd") },
          { region_id: ukRegion.id, amount: shippingPrice("Priority Watch Delivery", "gbp") },
          { region_id: usRegion.id, amount: shippingPrice("Priority Watch Delivery", "usd") },
          { region_id: euRegion.id, amount: shippingPrice("Priority Watch Delivery", "eur") },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Free Watch Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Free Watch Delivery",
          description: "Complimentary insured tracked delivery for qualifying watch orders.",
          code: "free-watch-delivery",
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
          name: "Men's Watches",
          handle: "mens-watches",
          description: "Watches sized and styled for men's wrists.",
          is_active: true,
        },
        {
          name: "Women's Watches",
          handle: "womens-watches",
          description: "Slimmer cases and refined dials for women's wrists.",
          is_active: true,
        },
        {
          name: "Automatic",
          handle: "automatic",
          description: "Self-winding mechanical movements with exhibition casebacks.",
          is_active: true,
        },
        {
          name: "Chronograph",
          handle: "chronograph",
          description: "Stopwatch complications for timing what matters.",
          is_active: true,
        },
        {
          name: "Dress Watches",
          handle: "dress-watches",
          description: "Understated watches for evenings and tailoring.",
          is_active: true,
        },
        {
          name: "Dive Watches",
          handle: "dive-watches",
          description: "Water-resistant sports watches with rotating bezels.",
          is_active: true,
        },
        {
          name: "Everyday Watches",
          handle: "everyday-watches",
          description: "Versatile watches that earn their wrist time daily.",
          is_active: true,
        },
        {
          name: "Watch Gifts",
          handle: "watch-gifts",
          description: "Gift-ready watches with complimentary caseback engraving.",
          is_active: true,
        },
      ],
    },
  });

  const mensWatchesCategory = categoryResult.find((cat) => cat.handle === "mens-watches")!;
  const womensWatchesCategory = categoryResult.find((cat) => cat.handle === "womens-watches")!;
  const automaticCategory = categoryResult.find((cat) => cat.handle === "automatic")!;
  const chronographCategory = categoryResult.find((cat) => cat.handle === "chronograph")!;
  const dressWatchesCategory = categoryResult.find((cat) => cat.handle === "dress-watches")!;
  const diveWatchesCategory = categoryResult.find((cat) => cat.handle === "dive-watches")!;
  const everydayWatchesCategory = categoryResult.find((cat) => cat.handle === "everyday-watches")!;
  const watchGiftsCategory = categoryResult.find((cat) => cat.handle === "watch-gifts")!;

  logger.info("Seeding Cansoria Studio products...");

  const commonOptions = [
    { title: "Size", values: [...watchSizes] },
    { title: "Strap", values: [...strapOptions] },
    { title: "Dial", values: [...dialOptions] },
  ];

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Heritage Classic 40",
          handle: "heritage-classic-40",
          subtitle: "A slim dress watch with a domed dial and applied indices.",
          description:
            "The Heritage Classic pairs a double-domed dial with polished applied indices and a hand-assembled quartz movement, sized to slip under a cuff.",
          category_ids: [dressWatchesCategory.id, mensWatchesCategory.id],
          material: "316L stainless steel case with sapphire crystal",
          weight: 220,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-HERITAGE"),
          metadata: {
            engraveable: true,
            movement: "Swiss quartz, 4-year battery",
            water_resistance: "5 ATM",
            warranty: "2-year international warranty",
            rating: 4.9,
            review_count: 214,
            story_sections: storySections("Heritage Classic", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Meridian Automatic",
          handle: "meridian-automatic",
          subtitle: "A self-winding movement behind an exhibition caseback.",
          description:
            "The Meridian Automatic keeps a 42-hour power reserve Miyota 9039 movement on display through a sapphire caseback, with a quick-release strap system.",
          category_ids: [automaticCategory.id, mensWatchesCategory.id],
          material: "316L stainless steel case with sapphire crystal",
          weight: 260,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-MERIDIAN", 120),
          metadata: {
            engraveable: true,
            movement: "Miyota 9039 automatic, 42-hour power reserve",
            water_resistance: "10 ATM",
            warranty: "2-year international warranty",
            rating: 4.8,
            review_count: 156,
            story_sections: storySections("Meridian Automatic", "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Regent Chronograph",
          handle: "regent-chronograph",
          subtitle: "A three-register chronograph with a brushed steel case.",
          description:
            "The Regent Chronograph times laps, kitchens, and connections with a three-register meca-quartz movement and a fixed tachymeter chapter ring.",
          category_ids: [chronographCategory.id, mensWatchesCategory.id],
          material: "Brushed 316L stainless steel with sapphire crystal",
          weight: 280,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1495856458515-0637185db551?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-REGENT", 90),
          metadata: {
            engraveable: true,
            movement: "Seiko VK64 meca-quartz chronograph",
            water_resistance: "10 ATM",
            warranty: "2-year international warranty",
            rating: 4.9,
            review_count: 98,
            story_sections: storySections("Regent Chronograph", "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Averly Dress Watch",
          handle: "averly-dress-watch",
          subtitle: "A jewelry-grade dress watch with a mother-of-pearl dial.",
          description:
            "The Averly sets a blue mother-of-pearl dial between slim polished lugs, finished with a quick-release leather strap and a scratch-resistant sapphire crystal.",
          category_ids: [dressWatchesCategory.id, womensWatchesCategory.id],
          material: "Polished stainless steel with sapphire crystal",
          weight: 180,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-AVERLY", -30),
          metadata: {
            engraveable: true,
            movement: "Swiss quartz, 4-year battery",
            water_resistance: "3 ATM",
            warranty: "2-year international warranty",
            rating: 4.9,
            review_count: 82,
            story_sections: storySections("Averly Dress Watch", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Northsea Diver",
          handle: "northsea-diver",
          subtitle: "A 20 ATM dive watch with a ceramic rotating bezel.",
          description:
            "The Northsea Diver pairs a unidirectional ceramic bezel with a screw-down crown and 20 ATM water resistance, rated for real diving and hard weekends.",
          category_ids: [diveWatchesCategory.id, mensWatchesCategory.id],
          material: "316L stainless steel with ceramic bezel and sapphire crystal",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-NORTHSEA", 60),
          metadata: {
            engraveable: true,
            movement: "Seiko NH35 automatic, 41-hour power reserve",
            water_resistance: "20 ATM",
            warranty: "2-year international warranty",
            rating: 4.7,
            review_count: 121,
            story_sections: storySections("Northsea Diver", "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Lucienne Slim 32",
          handle: "lucienne-slim-32",
          subtitle: "An ultra-thin case with a sunray-brushed dial.",
          description:
            "The Lucienne Slim measures just 7.2mm thick, with a sunray-brushed dial and Milanese mesh option that dresses up or down without effort.",
          category_ids: [womensWatchesCategory.id, dressWatchesCategory.id],
          material: "Polished stainless steel with sapphire crystal",
          weight: 160,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1495856458515-0637185db551?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1495856458515-0637185db551?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-LUCIENNE", -10),
          metadata: {
            engraveable: true,
            movement: "Swiss quartz, 4-year battery",
            water_resistance: "3 ATM",
            warranty: "2-year international warranty",
            rating: 4.8,
            review_count: 64,
            story_sections: storySections("Lucienne Slim", "https://images.unsplash.com/photo-1495856458515-0637185db551?auto=format&fit=crop&q=80&w=1200", true),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Ellery Everyday",
          handle: "ellery-everyday",
          subtitle: "A grab-and-go watch with a soft iron dial.",
          description:
            "The Ellery Everyday is the watch you reach for without thinking: luminous hands, a readable dial, and a strap system that swaps in seconds.",
          category_ids: [everydayWatchesCategory.id, womensWatchesCategory.id],
          material: "Brushed stainless steel with hardened mineral crystal",
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-ELLERY", -40),
          metadata: {
            engraveable: false,
            movement: "Japanese quartz, 3-year battery",
            water_resistance: "5 ATM",
            warranty: "2-year international warranty",
            rating: 4.7,
            review_count: 73,
            story_sections: storySections("Ellery Everyday", "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&q=80&w=1200", false),
          },
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Field & Pine Safari",
          handle: "field-pine-safari",
          subtitle: "A field watch with a canvas strap and 24-hour dial.",
          description:
            "The Field & Pine Safari reads like proper kit: a matte steel case, 24-hour chapter ring, and a washed canvas strap that earns its wear marks.",
          category_ids: [watchGiftsCategory.id, everydayWatchesCategory.id],
          material: "Matte stainless steel with sapphire crystal",
          weight: 240,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200",
          images: [
            { url: "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200" },
            { url: "https://images.unsplash.com/photo-1495856458515-0637185db551?auto=format&fit=crop&q=80&w=1200" },
          ],
          options: commonOptions,
          variants: createWatchVariants("CAN-FIELD", -20),
          metadata: {
            engraveable: false,
            movement: "Seiko NH35 automatic, 41-hour power reserve",
            water_resistance: "10 ATM",
            warranty: "2-year international warranty",
            rating: 4.8,
            review_count: 57,
            story_sections: storySections("Field & Pine Safari", "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0b?auto=format&fit=crop&q=80&w=1200", false),
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
