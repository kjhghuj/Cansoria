import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const prods = JSON.parse(fs.readFileSync(path.join(REF, "products.json"), "utf8"));
const sale = JSON.parse(fs.readFileSync(path.join(REF, "shelf-sale.json"), "utf8")).items;
const also = JSON.parse(fs.readFileSync(path.join(REF, "shelf-also.json"), "utf8")).items;

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// index scraped products by normalised name
const byName = new Map();
prods.forEach((p, i) => byName.set(norm(p.name), { ...p, idx: i + 1 }));

function build(items) {
  return items.map((it, position) => {
    const src = byName.get(norm(it.name));
    if (!src) throw new Error("unmatched: " + it.name);
    const n = String(src.idx).padStart(2, "0");
    const priceNew = it.priceNew || (it.priceText.match(/^\$[\d.]+/) || [""])[0];
    const priceOld = it.priceOld || ((it.priceText.match(/\$[\d.]+/g) || [])[1] || "");
    let discount = "";
    if (priceOld && priceNew) {
      const pn = parseFloat(priceNew.replace(/[^0-9.]/g, ""));
      const po = parseFloat(priceOld.replace(/[^0-9.]/g, ""));
      if (po > 0 && pn < po) discount = `-${Math.round((1 - pn / po) * 100)}%`;
    }
    const slug = it.href ? it.href.split("/").pop() : String(src.idx);
    return {
      id: slug,
      name: it.name,
      price: priceNew,
      oldPrice: priceOld,
      discount,
      image: `/florencess/img/p${n}a.webp`,
      imageAlt: `/florencess/img/p${n}b.webp`,
      href: "/shop",
      position,
    };
  });
}

const saleItems = build(sale);
const alsoItems = build(also);

const line = (p) =>
  `  { id: ${JSON.stringify(p.id)}, name: ${JSON.stringify(p.name)}, price: ${JSON.stringify(p.price)}, oldPrice: ${JSON.stringify(
    p.oldPrice,
  )}, discount: ${JSON.stringify(p.discount)}, image: ${JSON.stringify(p.image)}, imageAlt: ${JSON.stringify(p.imageAlt)}, href: ${JSON.stringify(
    p.href,
  )} },`;

const ts = `export interface FlorencessProduct {
  id: string;
  name: string;
  price: string;
  oldPrice: string;
  discount: string;
  image: string;
  imageAlt: string;
  href: string;
}

/**
 * Homepage shelf "WAREHOUSE SALE FOR $9.99" — the 16 products the reference
 * renders in grid-row-top-26, in the same order, with the struck-through
 * original prices it shows.
 */
export const FL_SALE_PRODUCTS: FlorencessProduct[] = [
${saleItems.map(line).join("\n")}
];

/**
 * Homepage shelf "YOU MAY ALSO LIKE" — the 16 products the reference renders
 * in grid-row-top-32, at full price (no discount label).
 */
export const FL_ALSO_PRODUCTS: FlorencessProduct[] = [
${alsoItems.map(line).join("\n")}
];

export const FLORENCESS_PRODUCTS: FlorencessProduct[] = [
  ...FL_SALE_PRODUCTS,
  ...FL_ALSO_PRODUCTS,
];
`;

fs.writeFileSync(path.join(REPO, "frontend", "src/lib/florencess-products.ts"), ts, "utf8");
console.log("sale", saleItems.length, "also", alsoItems.length);
console.log("discounted", saleItems.filter((p) => p.discount).length);
for (const p of saleItems) console.log(" ", p.name.slice(0, 34).padEnd(34), p.price, p.oldPrice, p.discount, p.image);
console.log("---");
for (const p of alsoItems) console.log(" ", p.name.slice(0, 34).padEnd(34), p.price, p.oldPrice, p.discount, p.image);
