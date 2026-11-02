import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  deleteRegionsWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Collapses the store onto a single USD market.
 *
 * The dev seed created a Europe (eur) region next to North America (usd) and
 * the catalogue import priced every variant in both currencies. The storefront
 * targets one market (frontend/src/lib/market.ts pins US/USD), so the EUR side is
 * carried cost with no buyer: it doubles the price rows, doubles the query work
 * per product, and lets a de/fr/nl visitor reach a region whose prices would
 * silently drift from the USD master.
 *
 * This script is the one-time data migration:
 *   1. folds the Europe region's countries into the USD region,
 *   2. deletes the empty Europe region,
 *   3. makes USD the store's only currency,
 *   4. strips EUR prices from every variant.
 *
 * Idempotent: every step is skipped when already done.
 *
 *   NODE_ENV=development npx medusa exec ./src/scripts/florencess-usd-only.ts
 */

export default async function usdOnly({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const pricing = container.resolve(Modules.PRICING);
  const regionService = container.resolve(Modules.REGION);

  // --- 1/2. one region, USD currencies ------------------------------------
  const { data: regions } = (await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
    filters: { deleted_at: { $eq: null } },
    pagination: { take: 100 },
  })) as { data: { id: string; name: string; currency_code: string; countries: { iso_2: string }[] }[] };

  const usdRegion = regions.find((region) => region.currency_code.toLowerCase() === "usd");
  if (!usdRegion) throw new Error("No USD region found; refusing to guess which region to keep.");

  const otherRegions = regions.filter((region) => region.id !== usdRegion.id);
  if (otherRegions.length) {
    const inherited = otherRegions.flatMap((region) => region.countries.map((country) => country.iso_2));
    const existing = new Set(usdRegion.countries.map((country) => country.iso_2));
    const missing = inherited.filter((country) => !existing.has(country));

    // A country can belong to exactly one region, so the old regions have to be
    // released before their countries can move; updating first is rejected with
    // "Countries with codes: ... are already assigned to a region".
    await deleteRegionsWorkflow(container).run({ input: { ids: otherRegions.map((region) => region.id) } });
    logger.info(`Deleted ${otherRegions.length} non-USD region(s): ${otherRegions.map((r) => r.name).join(", ")}`);

    if (missing.length) {
      await updateRegionsWorkflow(container).run({
        input: { selector: { id: usdRegion.id }, update: { countries: [...existing, ...missing] } },
      });
      logger.info(`Moved ${missing.join(", ")} into ${usdRegion.name}`);
    } else {
      logger.info("All countries already belong to the USD region");
    }
  } else {
    logger.info("Only one region exists, nothing to merge");
  }

  // --- 3. store currency ---------------------------------------------------
  // listStores() does not populate supported_currencies, so read the relation
  // through the graph; otherwise the idempotency check below never fires.
  const { data: stores } = (await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
    pagination: { take: 10 },
  })) as { data: { id: string; supported_currencies: { currency_code: string; is_default?: boolean }[] }[] };
  for (const store of stores) {
    const currencies = store.supported_currencies ?? [];
    const alreadyUsdOnly = currencies.length === 1 && currencies[0].currency_code.toLowerCase() === "usd";
    if (alreadyUsdOnly) {
      logger.info("Store already supports USD only");
      continue;
    }
    await updateStoresWorkflow(container).run({
      input: { selector: { id: store.id }, update: { supported_currencies: [{ currency_code: "usd", is_default: true }] } },
    });
    logger.info(`Store currencies -> usd only (was: ${currencies.map((c) => c.currency_code).join(", ") || "none"})`);
  }

  // --- 4. drop EUR price rows ---------------------------------------------
  const { data: variants } = (await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "price_set.id", "price_set.prices.id", "price_set.prices.currency_code"],
    pagination: { take: 50000 },
  })) as { data: { id: string; sku: string | null; price_set: { id: string; prices: { id: string; currency_code: string }[] } | null }[] };

  const withEur = variants.filter((variant) =>
    variant.price_set?.prices.some((price) => price.currency_code.toLowerCase() === "eur"),
  );
  logger.info(`Variants holding EUR prices: ${withEur.length}`);

  const CONCURRENCY = 10;
  let removed = 0;
  for (let offset = 0; offset < withEur.length; offset += CONCURRENCY) {
    const slice = withEur.slice(offset, offset + CONCURRENCY);
    await Promise.all(
      slice.map(async (variant) => {
        const kept = (variant.price_set as { prices: { id: string; currency_code: string }[] }).prices
          .filter((price) => price.currency_code.toLowerCase() !== "eur")
          .map((price) => ({ id: price.id, currency_code: price.currency_code }));
        // Omitting a price from the payload is how the Pricing module deletes it.
        await pricing.updatePriceSets((variant.price_set as { id: string }).id, { prices: kept as never });
        removed += 1;
      }),
    );
    if (removed % 1000 === 0 || offset + CONCURRENCY >= withEur.length) {
      logger.info(`  stripped EUR from ${removed}/${withEur.length}`);
    }
  }

  logger.info(`USD-only migration complete: ${removed} price sets trimmed`);
}
