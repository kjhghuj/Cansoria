import path from "path";
import fs from "fs";
import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

/**
 * Repairs the price unit bug introduced by the first catalogue import.
 *
 * Medusa v2 treats `price.amount` as a major currency unit (see
 * backend/src/lib/watch-prices.ts, which sends `cents / 100`). The initial
 * import wrote minor units, so every FL- variant was priced 100x too high.
 *
 * Scope is limited to SKUs with the `FL-` prefix; the seeded `LORE-TEST-BAG-*`
 * variants are never touched. Prices are rewritten through the Pricing module
 * (`updatePriceSets`), which keeps `amount` and `raw_amount` consistent — the
 * table is never edited directly. Idempotent: price sets that already hold the
 * catalogue value are skipped.
 *
 *   NODE_ENV=development npx medusa exec ./src/scripts/florencess-price-fix.ts
 *   DRY=1 NODE_ENV=development npx medusa exec ./src/scripts/florencess-price-fix.ts
 */

const CONCURRENCY = 10;
const SKU_PREFIX = "FL-";

type CatalogueProduct = { id: string; price: string };

function cataloguePath(): string {
  return path.resolve(process.cwd(), "../frontend/src/data/florencess-catalog.json");
}

function parseMajorUnits(value: string): number {
  const numeric = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 100) / 100 : 0;
}

function productIdFromSku(sku: string): string | null {
  const match = /^FL-(\d+)-\d+$/.exec(sku);
  return match ? match[1] : null;
}

type PriceRow = { id: string; amount: number; currency_code: string };
type VariantRow = {
  id: string;
  sku: string | null;
  price_set: { id: string; prices: PriceRow[] } | null;
};

export default async function fixFlorencessPrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pricing = container.resolve(Modules.PRICING);
  const dryRun = process.env.DRY === "1";

  const catalogue = JSON.parse(fs.readFileSync(cataloguePath(), "utf8")) as {
    products: CatalogueProduct[];
  };
  const usdByProductId = new Map<string, number>();
  for (const product of catalogue.products) {
    usdByProductId.set(product.id, parseMajorUnits(product.price));
  }
  logger.info(`Catalogue prices loaded: ${usdByProductId.size}`);

  const { data: variants } = (await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "price_set.id",
      "price_set.prices.id",
      "price_set.prices.amount",
      "price_set.prices.currency_code",
    ],
    pagination: { take: 50000 },
  })) as { data: VariantRow[] };

  const targets = variants.filter(
    (variant) => typeof variant.sku === "string" && variant.sku.startsWith(SKU_PREFIX) && variant.price_set,
  );
  logger.info(`FL- variants with a price set: ${targets.length}`);

  const plan: { priceSetId: string; prices: { id: string; currency_code: string; amount: number }[]; sku: string }[] = [];
  let alreadyCorrect = 0;
  let unknownSku = 0;

  for (const variant of targets) {
    const productId = productIdFromSku(variant.sku as string);
    const usd = productId ? usdByProductId.get(productId) : undefined;
    if (usd === undefined) {
      unknownSku += 1;
      continue;
    }

    const prices = (variant.price_set as { id: string; prices: PriceRow[] }).prices.map((price) => {
      const code = price.currency_code.toLowerCase();
      // USD is the only priced currency; anything else keeps its current value
      // so the script never deletes a row it does not own.
      const amount = code === "usd" ? usd : price.amount;
      return { id: price.id, currency_code: price.currency_code, amount };
    });

    const unchanged = prices.every((next) => {
      const before = (variant.price_set as { prices: PriceRow[] }).prices.find((row) => row.id === next.id);
      return before && Math.abs(Number(before.amount) - next.amount) < 0.005;
    });
    if (unchanged) {
      alreadyCorrect += 1;
      continue;
    }

    plan.push({ priceSetId: (variant.price_set as { id: string }).id, prices, sku: variant.sku as string });
  }

  logger.info(
    `Plan: ${plan.length} to fix, ${alreadyCorrect} already correct, ${unknownSku} unknown SKUs${dryRun ? " (DRY RUN)" : ""}`,
  );

  if (dryRun) {
    for (const row of plan.slice(0, 3)) {
      logger.info(`  sample ${row.sku}: ${JSON.stringify(row.prices)}`);
    }
    logger.info("Dry run complete, nothing written");
    return;
  }

  let done = 0;
  let failed = 0;
  for (let offset = 0; offset < plan.length; offset += CONCURRENCY) {
    const slice = plan.slice(offset, offset + CONCURRENCY);
    await Promise.all(
      slice.map(async (entry) => {
        try {
          await pricing.updatePriceSets(entry.priceSetId, { prices: entry.prices as never });
          done += 1;
        } catch (error) {
          failed += 1;
          logger.error(`  failed ${entry.sku}: ${(error as Error).message}`);
        }
      }),
    );
    if (done % 500 === 0 || offset + CONCURRENCY >= plan.length) {
      logger.info(`  fixed ${done}/${plan.length} (failed ${failed})`);
    }
  }

  logger.info(`Price fix complete: ${done} price sets updated, ${failed} failed, ${alreadyCorrect} already correct`);
}
