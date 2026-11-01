import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  createUserAccountWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Development seed for the LORENCESS storefront (frontend/src/lib/florencess-*).
 *
 * Creates the minimum backend data the storefront needs to trade: an admin
 * user, two currency regions, one stock location, the `bags-all` category that
 * matches the storefront navigation, and one published `test-bag` product with
 * two colour variants so `/test-bag` and `/bags-all` resolve through Medusa.
 *
 * Idempotent: re-running skips anything that already exists. Run with
 * `npm run dev` up, then `npx medusa exec ./src/scripts/lorencess-dev-seed.ts`.
 * Change the admin credentials before exposing this machine publicly.
 */
const ADMIN_EMAIL = "admin@lorencess.dev";
const ADMIN_PASSWORD = "lorencess-dev-admin";
const NA_COUNTRIES = ["us", "ca"];
const EU_COUNTRIES = ["de", "fr", "nl"];

export default async function seedLorencessDevCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // 1. Admin user for the local Medusa Admin dashboard.
  const userModule = container.resolve(Modules.USER);
  const existingUsers = await userModule.listUsers({ email: ADMIN_EMAIL });
  if (!existingUsers.length) {
    const authModule = container.resolve(Modules.AUTH);
    const registered = await authModule.register("emailpass", {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const identityId =
      (registered as { authIdentity?: { id?: string } }).authIdentity?.id;
    if (identityId) {
      await createUserAccountWorkflow(container).run({
        input: {
          authIdentityId: identityId,
          userData: {
            email: ADMIN_EMAIL,
            first_name: "Store",
            last_name: "Owner",
          },
        },
      });
      logger.info(`Created admin user ${ADMIN_EMAIL}`);
    } else {
      logger.warn(
        `Could not create admin user (register failed: ${(registered as { error?: string }).error ?? "unknown"}); create it in the dashboard instead.`,
      );
    }
  }

  // 2. Currency regions: switching currency on the storefront switches region.
  const regionModule = container.resolve(Modules.REGION);
  let [naRegion, euRegion] = await Promise.all([
    regionModule.listRegions({ name: "North America" }),
    regionModule.listRegions({ name: "Europe" }),
  ]);
  if (!naRegion.length || !euRegion.length) {
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "North America",
            currency_code: "usd",
            countries: NA_COUNTRIES,
            automatic_taxes: false,
          },
          {
            name: "Europe",
            currency_code: "eur",
            countries: EU_COUNTRIES,
            automatic_taxes: false,
          },
        ],
      },
    });
    [naRegion, euRegion] = await Promise.all([
      regionModule.listRegions({ name: "North America" }),
      regionModule.listRegions({ name: "Europe" }),
    ]);
    logger.info("Created North America (usd) and Europe (eur) regions");
  }
  if (!naRegion[0] || !euRegion[0]) throw new Error("Region seeding failed");

  // 3. System tax regions so cart math has a tax provider to resolve.
  const taxModule = container.resolve(Modules.TAX);
  if (!(await taxModule.listTaxRegions()).length) {
    await createTaxRegionsWorkflow(container).run({
      input: [...NA_COUNTRIES, ...EU_COUNTRIES].map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
    logger.info("Created system tax regions");
  }

  // 4. Stock location that holds the seeded inventory.
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  let stockLocation = (
    await stockLocationModule.listStockLocations({
      name: "Lorencess Main Warehouse",
    })
  )[0];
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Lorencess Main Warehouse",
            address: {
              city: "Portland",
              country_code: "us",
              address_1: "1 Sample Way",
              postal_code: "97201",
            },
          },
        ],
      },
    });
    stockLocation = result[0];
    logger.info("Created stock location Lorencess Main Warehouse");
  }

  // 5. The storefront publishes the storefront channel's products only.
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const [defaultSalesChannel] =
    await salesChannelModule.listSalesChannels();

  // Store availability is summed over stock locations linked to the sales
  // channel; without this link every variant reads as out of stock.
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });

  // 6. Category handle must match the storefront navigation (`/bags-all`).
  const productModule = container.resolve(Modules.PRODUCT);
  let bagsCategory = (
    await productModule.listProductCategories({ handle: "bags-all" })
  )[0];
  if (!bagsCategory) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: "Bags",
            handle: "bags-all",
            description: "Leather bags carried from weekday to weekend.",
            is_active: true,
          },
        ],
      },
    });
    bagsCategory = result[0];
    logger.info("Created category bags-all");
  }

  // 7. Test product exercised by the storefront acceptance checks.
  const existingProduct = (
    await productModule.listProducts({ handle: "test-bag" })
  )[0];
  if (!existingProduct) {
    const { result: createdProducts } = await createProductsWorkflow(container)
      .run({
        input: {
          products: [
            {
              title: "Test Bag",
              handle: "test-bag",
              subtitle: "A sample leather tote for storefront verification.",
              description:
                "<p>A sturdy canvas-lined leather tote created to verify the LORENCESS storefront against a real Medusa catalogue. Two colourways, live prices, managed stock.</p>",
              status: ProductStatus.PUBLISHED,
              category_ids: [bagsCategory.id],
              options: [{ title: "Color", values: ["Black", "Tan"] }],
              metadata: { brand: "LORENCESS" },
              images: [
                { url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=1200" },
                { url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=1200" },
              ],
              variants: [
                {
                  title: "Black",
                  sku: "LORE-TEST-BAG-BLK",
                  options: { Color: "Black" },
                  manage_inventory: true,
                  prices: [
                    { amount: 129, currency_code: "usd" },
                    { amount: 129, currency_code: "usd", region_id: naRegion[0].id },
                    { amount: 119, currency_code: "eur" },
                    { amount: 119, currency_code: "eur", region_id: euRegion[0].id },
                  ],
                },
                {
                  title: "Tan",
                  sku: "LORE-TEST-BAG-TAN",
                  options: { Color: "Tan" },
                  manage_inventory: true,
                  prices: [
                    { amount: 129, currency_code: "usd" },
                    { amount: 129, currency_code: "usd", region_id: naRegion[0].id },
                    { amount: 119, currency_code: "eur" },
                    { amount: 119, currency_code: "eur", region_id: euRegion[0].id },
                  ],
                },
              ],
              sales_channels: [{ id: defaultSalesChannel.id }],
            },
          ],
        },
      });

    const variantIds = createdProducts[0].variants?.map((v) => v.id) ?? [];
    const { data: linkedVariants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "inventory_items.inventory_item_id"],
      filters: { id: variantIds },
    });
    const inventoryLevels: CreateInventoryLevelInput[] = [];
    for (const variant of linkedVariants as {
      inventory_items?: { inventory_item_id?: string }[];
    }[]) {
      for (const link of variant.inventory_items || []) {
        if (typeof link.inventory_item_id === "string") {
          inventoryLevels.push({
            location_id: stockLocation.id,
            inventory_item_id: link.inventory_item_id,
            stocked_quantity: 50,
          });
        }
      }
    }
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    });
    logger.info("Created published product test-bag with stock");
  }

  // 8. Open orders: the storefront gates every purchase action on this flag.
  const storeModule = container.resolve(Modules.STORE);
  const [store] = await storeModule.listStores();
  if (store.metadata?.orders_open !== true) {
    await storeModule.updateStores(store.id, {
      metadata: { ...store.metadata, orders_open: true },
    });
    logger.info("Store orders_open set to true");
  }

  logger.info("LORENCESS dev seed complete");
}
