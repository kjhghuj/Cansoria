import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const sourceDir = path.join(root, "frontend_ref/snapshot/info");
const catalogPath = path.join(root, "frontend/src/data/florencess-catalog.json");
const outputPath = path.join(root, "frontend/src/data/florencess-brand-manifest.json");

/** Only IDs inside the captured manufacturer's main-products block are evidence of membership. */
export function extractBrandPage(html, file) {
  const slug = file.replace(/\.html$/, "");
  const manufacturerId = html.match(/<html\b[^>]*\broute-product-manufacturer-info\s+manufacturer-(\d+)\b/)?.[1];
  const canonical = html.match(/<link\s+href="([^"]+)"\s+rel="canonical"/)?.[1]?.replaceAll("&amp;", "&");
  if (!manufacturerId || !canonical || !/^(?:https:\/\/entntnt\.com\/brand-[^?#]+|https:\/\/entntnt\.com\/index\.php\?route=product\/manufacturer\/info&manufacturer_id=\d+)$/.test(canonical)) {
    throw new Error(`Unverified manufacturer page: ${file}`);
  }
  const canonicalId = new URL(canonical).searchParams.get("manufacturer_id");
  if (canonicalId && canonicalId !== manufacturerId) throw new Error(`Manufacturer mismatch: ${file}`);
  if (!canonicalId && new URL(canonical).pathname.slice(1) !== slug) throw new Error(`Canonical mismatch: ${file}`);
  const main = html.match(/<div class="main-products main-products-style[^\"]*">([\s\S]*?)<div class="row pagination-results">/);
  const ids = main ? [...main[1].matchAll(/<div class="product-layout[^\"]*" data-product-id="(\d+)"/g)].map((m) => m[1]) : [];
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate product ID in ${file}`);
  const pagination = html.match(/Showing (\d+) to (\d+) of (\d+) \((\d+) Pages\)/);
  if (ids.length && (!pagination || Number(pagination[2]) - Number(pagination[1]) + 1 !== ids.length)) {
    throw new Error(`Incomplete manufacturer listing: ${file}`);
  }
  const empty = /<div class="main-products-wrapper">\s*<p>There are no products to list\.<\/p>/.test(html);
  if (!ids.length && !empty) throw new Error(`Missing listing state: ${file}`);
  return { slug: canonicalId ? `manufacturer-${manufacturerId}` : slug, manufacturerId, canonical, source: `frontend_ref/snapshot/info/${file}`, sourceSha256: createHash("sha256").update(html).digest("hex"), sourceTotal: pagination ? Number(pagination[3]) : empty ? 0 : null, sourcePages: pagination ? Number(pagination[4]) : empty ? 1 : null, capturedPage: 1, productIds: ids };
}

export function buildBrandManifest({ source = sourceDir, catalog = catalogPath } = {}) {
  const products = new Set(JSON.parse(fs.readFileSync(catalog, "utf8")).products.map((p) => String(p.id)));
  const brands = {};
  for (const file of fs.readdirSync(source).filter((f) => /^brand-[^/]+\.html$/.test(f)).sort()) {
    const entry = extractBrandPage(fs.readFileSync(path.join(source, file), "utf8"), file);
    if (brands[entry.slug]) throw new Error(`Duplicate brand slug: ${entry.slug}`);
    brands[entry.slug] = { ...entry, localProductIds: entry.productIds.filter((id) => products.has(id)) };
  }
  return { schema: 1, scope: "Only captured first pages; sourceTotal is reference-wide, productIds are first-page only, localProductIds require identical captured product IDs", brands };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildBrandManifest();
  const output = JSON.stringify(manifest, null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (fs.readFileSync(outputPath, "utf8") !== output) throw new Error("Brand manifest differs from offline captures");
    console.log("Brand manifest matches offline captures");
  } else {
    fs.writeFileSync(outputPath, output);
    console.log(`Wrote ${outputPath}: ${Object.entries(manifest.brands).map(([key, value]) => `${key}=${value.productIds.length} captured/${value.localProductIds.length} local`).join(", ")}`);
  }
}
