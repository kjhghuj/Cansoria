import path from "path";
import fs from "fs";
import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Imports the captured FLORENCESS catalogue (frontend/src/data/florencess-catalog.json)
 * into Medusa, then writes frontend/src/data/florencess-variant-map.json so the
 * storefront can resolve a real variant for every product it lists.
 *
 * Idempotent: products whose handle already exists are skipped, and the variant
 * map is rebuilt from the database at the end, so re-running repairs the map
 * after a partial import.
 *
 *   NODE_ENV=development npx medusa exec ./src/scripts/florencess-import.ts
 */

type FlOptionValue = { value: string; label: string };
type FlOption = { id: string; name: string; values: FlOptionValue[] };
type FlImage = { src: string; alt: string };
type FlProduct = {
  id: string;
  slug: string;
  title: string;
  model: string;
  brand: string;
  description: string;
  price: string;
  currency: string;
  availability: string;
  options: FlOption[];
  localImages: FlImage[];
  pageCaptured: boolean;
};
type FlCategory = { slug: string; title: string; productIds: string[] };
type FlCatalog = { products: FlProduct[]; categories: FlCategory[] };

const BATCH_SIZE = 20;

function catalogPath(): string {
  return path.resolve(process.cwd(), "../frontend/src/data/florencess-catalog.json");
}

function mapPath(): string {
  return path.resolve(process.cwd(), "../frontend/src/data/florencess-variant-map.json");
}

function parseAmount(value: string): number {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function cleanText(value: string, max: number): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cartesian(options: FlOption[]): Record<string, string>[] {
  if (!options.length) return [{}];
  return options.reduce<Record<string, string>[]>(
    (acc, option) => {
      const labels = option.values.map((entry) => entry.label);
      return acc.flatMap((partial) => labels.map((label) => ({ ...partial, [option.name]: label })));
    },
    [{}],
  );
}

function buildProduct(product: FlProduct, shippingProfileId: string, channelId: string, categoryIds: string[]) {
  const usd = parseAmount(product.price);
  // Medusa rejects a product whose variants declare no option, so optionless
  // catalogue entries get a single synthetic "Style" option. The variant map
  // written below still records an empty selection for them, which is what the
  // storefront's resolveVariantFrom() expects for an optionless product.
  const hasOptions = product.options.length > 0;
  const sourceOptions = hasOptions
    ? product.options
    : [{ id: "style", name: "Style", values: [{ value: "standard", label: "Standard" }] }];
  const combos = cartesian(sourceOptions);
  const images = product.localImages.map((image) => ({ url: image.src }));

  return {
    title: cleanText(product.title, 120) || `Product ${product.id}`,
    handle: product.slug,
    description: cleanText(product.description, 4000) || undefined,
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: shippingProfileId,
    thumbnail: images[0]?.url,
    images,
    category_ids: categoryIds,
    options: sourceOptions.map((option) => ({
      name: option.name,
      title: option.name,
      values: option.values.map((entry) => entry.label),
    })),
    variants: combos.map((selection, index) => ({
      title: Object.values(selection).join(" / ") || product.title,
      sku: `FL-${product.id}-${index + 1}`,
      manage_inventory: false,
      allow_backorder: false,
      options: selection,
      // USD only: the store runs a single market (see florencess-usd-only.ts).
      prices: [{ currency_code: "usd", amount: usd }],
    })),
    metadata: {
      brand: product.brand,
      model: product.model,
      fl_product_id: product.id,
      fl_source: "entntnt.com",
      availability: product.availability,
    },
    sales_channels: [{ id: channelId }],
  };
}

export default async function importFlorencessCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

  const catalog = JSON.parse(fs.readFileSync(catalogPath(), "utf8")) as FlCatalog;
  logger.info(`Catalogue: ${catalog.products.length} products, ${catalog.categories.length} categories`);

  // --- prerequisites -------------------------------------------------------
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id", "name"] });
  if (!channels.length) throw new Error("No sales channel found. Run the dev seed first.");
  const channelId = channels[0].id;

  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id", "name"] });
  if (!profiles.length) throw new Error("No shipping profile found. Run the dev seed first.");
  const shippingProfileId = profiles[0].id;

  // --- categories ----------------------------------------------------------
  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });
  const categoryByHandle = new Map(existingCategories.map((row) => [row.handle as string, row.id as string]));

  const missingCategories = catalog.categories.filter((category) => !categoryByHandle.has(category.slug));
  if (missingCategories.length) {
    const { result: created } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingCategories.map((category) => ({
          name: cleanText(category.title, 100) || category.slug,
          handle: category.slug,
          is_active: true,
        })),
      },
    });
    for (const category of created) {
      categoryByHandle.set(category.handle, category.id);
    }
    logger.info(`Created ${created.length} categories`);
  }

  const categoriesByProductId = new Map<string, string[]>();
  for (const category of catalog.categories) {
    const id = categoryByHandle.get(category.slug);
    if (!id) continue;
    for (const productId of category.productIds) {
      const list = categoriesByProductId.get(productId) ?? [];
      list.push(id);
      categoriesByProductId.set(productId, list);
    }
  }

  // --- products ------------------------------------------------------------
  const { data: existingProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    pagination: { take: 10000 },
  });
  const existingHandles = new Set(existingProducts.map((row) => row.handle as string));
  const pending = catalog.products.filter((product) => !existingHandles.has(product.slug));
  logger.info(`Skipping ${catalog.products.length - pending.length} existing products, importing ${pending.length}`);

  let imported = 0;
  for (let offset = 0; offset < pending.length; offset += BATCH_SIZE) {
    const batch = pending.slice(offset, offset + BATCH_SIZE);
    await createProductsWorkflow(container).run({
      input: {
        products: batch.map((product) =>
          buildProduct(product, shippingProfileId, channelId, categoriesByProductId.get(product.id) ?? []),
        ),
      },
    });
    imported += batch.length;
    logger.info(`Imported ${imported}/${pending.length}`);
  }

  // --- variant map ---------------------------------------------------------
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "metadata",
      "options.id",
      "options.title",
      "options.values.value",
      "variants.id",
      "variants.sku",
      "variants.options.value",
      "variants.options.option_id",
    ],
    pagination: { take: 10000 },
  });

  const productsById = new Map(catalog.products.map((product) => [product.id, product]));
  const mappings: {
    productId: string;
    medusaProductId: string;
    variants: { id: string; selection: Record<string, string> }[];
  }[] = [];

  for (const product of products) {
    const metadata = (product.metadata ?? {}) as { fl_product_id?: unknown };
    const flId = typeof metadata.fl_product_id === "string" ? metadata.fl_product_id : undefined;
    if (!flId || !productsById.has(flId)) continue;

    const flProduct = productsById.get(flId)!;
    const optionless = flProduct.options.length === 0;
    const optionNameById = new Map<string, string>();
    for (const option of product.options ?? []) {
      optionNameById.set(option.id as string, option.title as string);
    }
    const variants = (product.variants ?? []).map((variant) => {
      const selection: Record<string, string> = {};
      for (const value of variant.options ?? []) {
        const optionName = optionNameById.get(value.option_id as string);
        if (optionName) selection[optionName] = value.value as string;
      }
      return { id: variant.id as string, selection: optionless ? {} : selection };
    });

    mappings.push({
      productId: flId,
      medusaProductId: product.id as string,
      variants: variants.filter((variant) => variant.id.startsWith("variant_")),
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "medusa",
    products: mappings,
  };
  fs.writeFileSync(mapPath(), `${JSON.stringify(output, null, 2)}\n`);
  logger.info(`Variant map: ${mappings.length} products, ${mappings.reduce((sum, entry) => sum + entry.variants.length, 0)} variants → ${mapPath()}`);
  logger.info("FLORENCESS import complete");
}
