import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = "H:/Cansoria";
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
const catalog = readJson("frontend/src/data/florencess-catalog.json");
const manifest = readJson("tools/florencess-ref/data/image-manifest.json");
const imageIndex = readJson("tools/florencess-ref/data/snapshot-images.json");
const byId = new Map(catalog.products.map((product) => [product.id, product]));
const refsById = new Map();
const problems = [];
for (const { productId, index, remote } of imageIndex) {
  const product = byId.get(productId);
  if (!product) { problems.push(`unknown product ${productId}`); continue; }
  if (!refsById.has(productId)) refsById.set(productId, []);
  const refs = refsById.get(productId);
  if (index !== refs.length || refs.includes(remote)) {
    problems.push(`non-distinct or non-sequential view ${product.slug}#${index}`);
  }
  refs.push(remote);
  const entry = manifest[`${product.slug}#${index}`];
  const local = product.localImages[index];
  if (!entry || entry.remote !== remote || local?.src !== entry.src) {
    problems.push(`source mismatch ${product.slug}#${index}`);
    continue;
  }
  const filename = path.join(root, "frontend/public", local.src.slice(1));
  if (!fs.existsSync(filename)) { problems.push(`missing asset ${filename}`); continue; }
  const bytes = fs.readFileSync(filename);
  if (bytes.length !== entry.bytes || crypto.createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
    problems.push(`corrupt asset ${filename}`);
  }
}
for (const product of catalog.products) {
  const refs = refsById.get(product.id) || [];
  if (product.localImages.length !== refs.length) problems.push(`incomplete gallery ${product.slug}: ${product.localImages.length}/${refs.length}`);
  if (!refs.length) problems.push(`missing gallery ${product.slug}`);
  if (!product.price) problems.push(`missing price ${product.slug}`);
}
if (catalog.snapshot.images !== imageIndex.length) problems.push("catalog image count differs from gallery refs");
const out = {
  products: catalog.products.length,
  imageRefs: imageIndex.length,
  imagesInCatalog: catalog.snapshot.images,
  categories: catalog.categories.length,
  categoryDifferences: catalog.categories
    .filter((category) => category.captured !== category.sourceTotal)
    .map(({ slug, captured, sourceTotal }) => ({ slug, captured, sourceTotal })),
  problems: problems.slice(0, 20),
  problemCount: problems.length,
};
console.log(JSON.stringify(out, null, 2));
if (problems.length) process.exitCode = 1;
