// Re-crawls the live source for products whose capture is incomplete, and for
// any product whose price or option set may have drifted since the last pass.
//
// The catalogue has 71 entries with no options, which the Medusa import has to
// paper over with a synthetic "Style" option. This script answers the question
// those entries raise: does the source actually have options we failed to
// parse, or is the product genuinely option-less?
//
// It reuses the exact extraction rules from snapshot-extract.mjs so the result
// is comparable with the stored catalogue, and writes a patch file rather than
// mutating the catalogue — applying a patch is a separate, reviewable step.
//
//   node tools/florencess-ref/pipeline/recrawl-options.mjs            # only option-less
//   node tools/florencess-ref/pipeline/recrawl-options.mjs --all      # every product
//   node tools/florencess-ref/pipeline/recrawl-options.mjs --limit 20 # smoke test

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const CATALOGUE = path.join(root, "frontend/src/data/florencess-catalog.json");
const PATCH = path.join(root, "tools/florencess-ref/data/crawl-patch.json");

const ALL = process.argv.includes("--all");
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const CONCURRENCY = 6;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback);
const stripTags = (value) => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const decodeEntities = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

// Option markup on the source is an OpenCart select pair inside a form-group.
function parseOptions(html) {
  const options = [];
  const re =
    /<div class="form-group[^"]*product-option-select[^"]*">\s*<label[^>]*>([^<]+)<\/label>\s*<select name="option\[(\d+)\]"[^>]*>([\s\S]*?)<\/select>/g;
  for (const match of html.matchAll(re)) {
    const values = [...match[3].matchAll(/<option value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/g)]
      .filter(([, value]) => value !== "")
      .map(([, value, label]) => ({ value, label: stripTags(label) }));
    if (values.length) options.push({ id: match[2], name: stripTags(match[1]), values });
  }
  return options;
}

function parsePrice(html) {
  const ld = parseProductJsonLd(html);
  const offer = ld?.offers ?? {};
  const fresh =
    html.match(/class="product-price-new">([^<]*)</) ||
    html.match(/class="product-price">([^<]*)</) ||
    html.match(/class="price-new">([^<]*)</);
  const old = html.match(/class="product-price-old">([^<]*)</) || html.match(/class="price-old">([^<]*)</);
  return {
    price: decodeEntities((fresh ? fresh[1] : String(offer.price ?? "")).trim()),
    oldPrice: decodeEntities(old ? old[1].trim() : ""),
    availability: String(offer.availability || "").split("/").pop() || "InStock",
  };
}

function parseProductJsonLd(html) {
  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const raw = match[1].trim();
    if (!raw.includes('"Product"')) continue;
    try {
      const data = JSON.parse(raw);
      if (data && data["@type"] === "Product") return data;
    } catch {
      // ignore malformed blocks and fall back to the regex paths above
    }
  }
  return null;
}

async function fetchProduct(slug) {
  const response = await fetch(`https://entntnt.com/${slug}`, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(45000),
  });
  return { status: response.status, html: await response.text() };
}

const catalogue = readJson(CATALOGUE, { products: [] });
const targets = (ALL ? catalogue.products : catalogue.products.filter((p) => !p.options || !p.options.length)).slice(
  0,
  LIMIT,
);
console.log(`Targets: ${targets.length} (${ALL ? "all products" : "option-less only"})`);

const results = [];
const failures = [];
let index = 0;

async function worker() {
  while (index < targets.length) {
    const position = index++;
    const product = targets[position];
    try {
      const { status, html } = await fetchProduct(product.slug);
      if (status !== 200) {
        failures.push({ slug: product.slug, status });
        continue;
      }
      const options = parseOptions(html);
      const live = parsePrice(html);
      const storedPrice = (product.price || "").replace(/[^0-9.]/g, "");
      const livePrice = (live.price || "").replace(/[^0-9.]/g, "");
      const priceChanged = livePrice !== "" && Math.abs(Number(livePrice) - Number(storedPrice)) > 0.009;

      results.push({
        slug: product.slug,
        id: product.id,
        title: product.title,
        hadOptions: (product.options || []).length,
        liveOptions: options,
        priceChanged,
        storedPrice: product.price,
        livePrice: live.price,
        availability: live.availability,
      });

      if ((results.length + failures.length) % 50 === 0) {
        console.log(`  crawled ${results.length + failures.length}/${targets.length}`);
      }
    } catch (error) {
      failures.push({ slug: product.slug, error: String(error.message || error) });
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const recovered = results.filter((row) => row.hadOptions === 0 && row.liveOptions.length > 0);
const stillEmpty = results.filter((row) => row.hadOptions === 0 && row.liveOptions.length === 0);
const priceDrift = results.filter((row) => row.priceChanged);
const optionDrift = results.filter((row) => row.hadOptions > 0 && JSON.stringify(row.liveOptions.map((o) => o.name)) !== undefined);

fs.writeFileSync(
  PATCH,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "https://entntnt.com",
      mode: ALL ? "all" : "optionless",
      crawled: results.length,
      failed: failures.length,
      recoveredOptions: recovered,
      stillOptionless: stillEmpty.map((row) => ({ slug: row.slug, id: row.id, title: row.title })),
      priceDrift,
      results,
      failures,
    },
    null,
    2,
  ),
);

console.log("");
console.log(`Crawled: ${results.length} ok, ${failures.length} failed`);
console.log(`Options recovered: ${recovered.length}`);
console.log(`Still option-less on the source: ${stillEmpty.length}`);
console.log(`Price drift: ${priceDrift.length}`);
if (recovered.length) {
  for (const row of recovered.slice(0, 10)) {
    console.log(`  + ${row.slug}: ${row.liveOptions.map((o) => `${o.name}(${o.values.length})`).join(", ")}`);
  }
}
if (failures.length) console.log("Failures:", JSON.stringify(failures.slice(0, 5)));
console.log(`Patch written: ${path.relative(root, PATCH)}`);
