/**
 * Generate the legacy id → slug table used by the compatibility redirects.
 *
 * The reference storefront exposes SEO paths (`/bags-all`, `/story-wave-...`),
 * so a visitor arriving from an old OpenCart bookmark may still carry
 * `index.php?route=product/product&product_id=...`. Only ids we captured can be
 * mapped; anything else stays a 404 instead of a guessed redirect.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/Cansoria";
const CATALOG = path.join(ROOT, "frontend/src/data/florencess-catalog.json");
const OUT = path.join(ROOT, "frontend/src/data/florencess-legacy-map.json");

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

const products = {};
for (const product of catalog.products) {
  if (product.id && product.slug) products[product.id] = product.slug;
}

const categories = {};
for (const category of catalog.categories) {
  categories[category.slug] = category.slug;
}

fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: "OpenCart numeric ids captured in the snapshot. Keys are the legacy ids/params, values are the current paths.",
      products,
      categories,
    },
    null,
    1,
  ) + "\n",
  "utf8",
);

console.log(`legacy map: ${Object.keys(products).length} products, ${Object.keys(categories).length} categories`);
