/**
 * Download and verify the catalog images for the snapshot.
 *
 * Naming: /florencess/catalog/<product-slug>/<sha256-prefix>.<ext>. The digest
 * comes from the downloaded bytes, so re-running the pipeline never overwrites
 * a historical asset with a different one. Homepage products keep the asset
 * paths the existing homepage already uses (see florencess-products.ts), so the
 * replicated shelf is untouched.
 *
 * Every file is decoded with sharp (borrowed from the backend install) and the
 * recorded width/height/format/sha256 are written to the manifest.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const ROOT = "H:/Cansoria";
const CATALOG_FILE = path.join(ROOT, "frontend/src/data/florencess-catalog.json");
const PUBLIC_DIR = path.join(ROOT, "frontend/public/florencess/catalog");
const MANIFEST = path.join(ROOT, "tools/florencess-ref/data/image-manifest.json");
const PRODUCTS_TS = path.join(ROOT, "frontend/src/lib/florencess-products.ts");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

const require = createRequire(path.join(ROOT, "backend/package.json"));
const sharp = require("sharp");

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8"));
const imageIndex = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tools/florencess-ref/data/snapshot-images.json"), "utf8"),
);
const remoteByProduct = new Map();
for (const item of imageIndex) {
  if (!remoteByProduct.has(item.productId)) remoteByProduct.set(item.productId, []);
  remoteByProduct.get(item.productId)[item.index] = item.remote;
}
const manifest = (() => {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
})();

// Old index keys refer to alternating 1000px/1800px URLs. Reuse matching
// remote bytes, never an old index alone, and revalidate every digest.
const cachedByRemote = new Map();
for (const entry of Object.values(manifest)) {
  if (entry.remote && !cachedByRemote.has(entry.remote)) cachedByRemote.set(entry.remote, entry);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchImage(url, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": UA, accept: "image/webp,image/jpeg,image/png,*/*" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (attempt < 2) {
      await sleep(800 * (attempt + 1));
      return fetchImage(url, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function save(product, index, remote) {
  if (!remote) return null;
  const key = `${product.slug}#${index}`;
  const cached = cachedByRemote.get(remote);
  if (cached) {
    const file = path.join(ROOT, "frontend/public", cached.src.replace(/^\//, ""));
    if (fs.existsSync(file)) {
      const bytes = fs.readFileSync(file);
      const digest = crypto.createHash("sha256").update(bytes).digest("hex");
      if (digest === cached.sha256 && bytes.length === cached.bytes) {
        const meta = await sharp(bytes).metadata();
        if (meta.width === cached.width && meta.height === cached.height && meta.format === cached.format) {
          manifest[key] = cached;
          return cached;
        }
      }
    }
  }
  const buffer = await fetchImage(remote);
  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const meta = await sharp(buffer).metadata();
  if (!meta.width || !meta.height || !meta.format) {
    throw new Error(`undecodable image ${remote}`);
  }
  const ext = meta.format === "jpeg" ? "jpg" : meta.format;
  const dir = path.join(PUBLIC_DIR, product.slug);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${sha256.slice(0, 12)}.${ext}`;
  const file = path.join(dir, filename);
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file);
    if (crypto.createHash("sha256").update(existing).digest("hex") !== sha256)
      throw new Error(`digest collision or corrupt asset ${file}`);
  } else fs.writeFileSync(file, buffer);
  const entry = {
    src: `/florencess/catalog/${product.slug}/${filename}`,
    alt: product.title,
    sha256,
    bytes: buffer.length,
    width: meta.width,
    height: meta.height,
    format: meta.format,
    remote,
  };
  manifest[key] = entry;
  cachedByRemote.set(remote, entry);
  return entry;
}

let downloaded = 0;
let reused = 0;
const failures = [];

const task = async (product) => {
  const wanted = remoteByProduct.get(product.id) || product.remoteImages || [];
  const local = [];
  for (let index = 0; index < wanted.length; index += 1) {
    try {
      const wasCached = cachedByRemote.has(wanted[index]);
      const entry = await save(product, index, wanted[index]);
      if (!entry) continue;
      local.push({ src: entry.src, alt: product.title });
      if (wasCached) reused += 1;
      else downloaded += 1;
    } catch (error) {
      failures.push({ slug: product.slug, index, remote: wanted[index], error: String(error.message) });
    }
  }
  product.localImages = local;
};

const concurrency = 5;
let cursor = 0;
async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= catalog.products.length) return;
    await task(catalog.products[index]);
    if (index % 100 === 0) console.log(`  ${index}/${catalog.products.length}`);
    await sleep(120);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

if (failures.length) {
  fs.writeFileSync(
    path.join(ROOT, "tools/florencess-ref/data/image-failures.json"),
    JSON.stringify(failures, null, 1) + "\n",
    "utf8",
  );
  throw new Error(`${failures.length} asset failures; original catalog and manifest preserved`);
}

for (const product of catalog.products) {
  if (!product.localImages) product.localImages = [];
  // Keep the payload lean: the source URL list is evidence, not storefront data.
  product.remoteImages = undefined;
}

catalog.snapshot.images = catalog.products.reduce((sum, product) => sum + product.localImages.length, 0);
catalog.snapshot.imageRefs = imageIndex.length;
catalog.snapshot.imagesMissing = catalog.products.filter((product) => product.localImages.length === 0).length;
catalog.snapshot.assetFailures = failures.length;

fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 1) + "\n", "utf8");
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n", "utf8");
console.log(
  `images: ${catalog.snapshot.images} local, ${catalog.snapshot.imagesMissing} products without image, ` +
    `${failures.length} failures, ${downloaded} downloaded, ${reused} reused this run`,
);
