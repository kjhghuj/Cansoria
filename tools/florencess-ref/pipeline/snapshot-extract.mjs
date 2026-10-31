/**
 * Parse the captured FLORENCESS HTML into the local catalog snapshot.
 *
 * Inputs are read-only captures under frontend_ref/snapshot/ and the reconciled
 * card index in data/. Output: src/data/florencess-catalog.json, which the
 * storefront imports at build time. Prices are display strings only 鈥?trading
 * amounts always come from Medusa.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/Cansoria";
const SNAP = path.join(ROOT, "frontend_ref/snapshot");
const DATA = path.join(ROOT, "tools/florencess-ref/data");
const OUT = path.join(ROOT, "frontend/src/data/florencess-catalog.json");

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

function decodeEntities(value) {
  return String(value)
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseProductJsonLd(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  for (const match of blocks) {
    const raw = match[1].trim();
    if (!raw.includes('"Product"')) continue;
    try {
      const data = JSON.parse(raw);
      if (data && data["@type"] === "Product") return data;
    } catch {
      // fall through to the regex-based fields below
    }
  }
  return null;
}

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

function parseDetailBlock(html) {
  const index = html.indexOf("block-description");
  if (index < 0) return "";
  const from = html.indexOf(">", index) + 1;
  const end = html.indexOf("</div>", from);
  const raw = end > from ? html.slice(from, end) : "";
  return stripTags(raw.replace(/<\/(p|br|div)>/gi, " "));
}

function parseGallery(html) {
  // A main-swiper slide is one view. data-largeimg and the thumbnail rail
  // are alternate resolutions, not additional gallery entries.
  const start = html.indexOf('class="swiper main-image');
  if (start < 0) return [];
  const controls = html.indexOf('class="swiper-controls', start);
  const additional = html.indexOf('class="swiper additional-images', start);
  const end = controls > start ? controls : additional > start ? additional : start + 30000;
  const block = html.slice(start, end);
  const urls = [];
  for (const slide of block.matchAll(/<div\b[^>]*class="[^"]*\bswiper-slide\b[^"]*"[^>]*>([\s\S]*?)<\/div>/g)) {
    const tag = slide[1].match(/<img\b[^>]*>/)?.[0] || "";
    const src =
      tag.match(/\bdata-src="(https:\/\/entntnt\.com\/image\/[^"]+)"/)?.[1] ||
      tag.match(/\bsrc="(https:\/\/entntnt\.com\/image\/[^"]+)"/)?.[1] ||
      tag.match(/\bdata-largeimg="(https:\/\/entntnt\.com\/image\/[^"]+)"/)?.[1];
    if (src && !urls.includes(src)) urls.push(src);
  }
  return urls;
}

function parseProductPage(html, seed) {
  const ld = parseProductJsonLd(html) || {};
  const offer = ld.offers || {};
  const priceNew =
    html.match(/class="product-price-new">([^<]*)</) ||
    html.match(/class="product-price">([^<]*)</) ||
    html.match(/class="price-new">([^<]*)</);
  const priceOld =
    html.match(/class="product-price-old">([^<]*)</) || html.match(/class="price-old">([^<]*)</);
  const label = html.match(/class="product-label-label[^"]*"[^>]*>([\s\S]{0,120}?)<\/span>/);
  const discountSpan = html.match(/class="product-label[^"]*price[^"]*"[^>]*>\s*<strong>([^<]*)<\/strong>/);
  const model = (ld.model || "").trim();
  const description = (ld.description || "").trim() || parseDetailBlock(html);
  const brand = ld.brand && typeof ld.brand === "object" ? String(ld.brand.name || "") : "";
  const availability = String(offer.availability || "").split("/").pop() || "";
  const galleryFromLd = typeof ld.image === "string" ? [ld.image] : Array.isArray(ld.image) ? ld.image : [];

  return {
    id: seed.id,
    slug: seed.slug,
    title: decodeEntities((ld.name || seed.title || "").trim()) || seed.title,
    model: model || seed.id,
    brand: brand || "",
    description,
    price: decodeEntities((priceNew ? priceNew[1] : seed.price || offer.price || "").trim()),
    oldPrice: decodeEntities((priceOld ? priceOld[1] : seed.oldPrice || "").trim()),
    discount: decodeEntities((discountSpan ? discountSpan[1] : label ? label[1] : seed.discount || "").trim()),
    currency: String(offer.priceCurrency || "USD"),
    availability: availability || "InStock",
    options: parseOptions(html),
    remoteImages: [...new Set([...(seed.images || []), ...galleryFromLd])],
    sourceImage: galleryFromLd[0] || seed.images?.[0] || "",
  };
}

const previous = readJson(OUT, { products: [] });
const previousById = new Map((previous.products || []).map((product) => [product.id, product]));
const cardData = readJson(path.join(DATA, "snapshot-cards.json"), {});
const shelf = readJson(path.join(DATA, "products.json"), []);

// Union of listing cards and homepage shelves, keyed by product id.
const seeds = new Map();
for (const product of shelf) {
  const slug = String(product.href || "").replace("https://entntnt.com/", "").split("/").pop();
  seeds.set(product.id, {
    id: product.id,
    slug,
    title: product.name,
    price: product.price,
    oldPrice: product.old || "",
    discount: product.discount || "",
    images: [product.img, product.img2].filter(Boolean),
  });
}

const categoryEntries = [];
for (const [slug, entry] of Object.entries(cardData)) {
  const productIds = [];
  for (const card of entry.cards || []) {
    productIds.push(card.id);
    const seed = seeds.get(card.id) || {
      id: card.id,
      slug: card.slug,
      title: card.title,
      price: card.price,
      oldPrice: card.oldPrice,
      discount: card.discount,
      images: card.images,
    };
    seed.images = [...new Set([...(seed.images || []), ...(card.images || [])])];
    seeds.set(card.id, seed);
  }
  categoryEntries.push({
    slug,
    title: stripTags(entry.title || slug),
    sourceTotal: entry.total ?? null,
    pageCount: entry.pageCount ?? null,
    pagesCaptured: entry.pagesCaptured ?? null,
    pageCounts: entry.pageCounts ?? [],
    captured: productIds.length,
    empty: productIds.length === 0,
    productIds,
  });
}

const products = [];
const images = [];
let missingPages = 0;
for (const seed of seeds.values()) {
  const file = path.join(SNAP, "products", `${seed.slug}.html`);
  if (!fs.existsSync(file)) {
    missingPages += 1;
    products.push({
      ...seed,
      model: seed.id,
      brand: "",
      description: "",
      currency: "USD",
      availability: "Unknown",
      options: [],
      remoteImages: seed.images || [],
      localImages: previousById.get(seed.id)?.localImages || [],
      pageCaptured: false,
    });
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const parsed = parseProductPage(html, seed);
  // Detail gallery wins over listing thumbnails: the listing card repeats the
  // same two images for every product of a colourway.
  const gallery = parseGallery(html);
  parsed.remoteImages = gallery.length ? gallery : parsed.remoteImages;
  products.push({ ...parsed, localImages: previousById.get(seed.id)?.localImages || [], pageCaptured: true });
  for (const [index, remote] of parsed.remoteImages.entries()) {
    images.push({ productId: parsed.id, index, remote });
  }
}

products.sort((a, b) => a.slug.localeCompare(b.slug));
// Stable capture order for each category.
const order = new Map(products.map((product, index) => [product.id, index]));

const catalog = {
  generatedAt: new Date().toISOString(),
  source: "https://entntnt.com",
  snapshot: {
    scope:
      "Every listing page of all 25 discovered categories (deterministic sort=pd.name&order=ASC&limit=100 enumeration) plus the two homepage shelves; detail pages for every captured product.",
    categoryPages: categoryEntries.length,
    categoryPagesCaptured: categoryEntries.reduce((sum, c) => sum + (c.pagesCaptured || 0), 0),
    products: products.length,
    productPagesCaptured: products.filter((p) => p.pageCaptured).length,
    productPagesMissing: missingPages,
    images: images.length,
  },
  categories: categoryEntries,
  products,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 1) + "\n", "utf8");
fs.writeFileSync(path.join(DATA, "snapshot-images.json"), JSON.stringify(images, null, 1) + "\n", "utf8");
console.log(
  `catalog: ${catalog.categories.length} categories, ${catalog.products.length} products, ` +
    `${catalog.snapshot.productPagesCaptured} pages, ${missingPages} missing, ${images.length} image refs`,
);

