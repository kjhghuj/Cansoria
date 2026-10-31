/**
 * FLORENCESS snapshot crawler.
 *
 * Scope: every listing page of every category in data/ref-categories.json,
 * every product card found there, and the two homepage shelves. Raw HTML is
 * kept under frontend_ref/snapshot/ so parsing can be re-run without fetching.
 *
 * Politeness: concurrency 2, 25 s timeout, 2 retries, 429/503 honour
 * Retry-After and pause the batch. No challenge bypass, no login.
 *
 * Parsing note: card extraction uses plain string scanning rather than regular
 * expressions. The markup is regular enough, and string scanning cannot be
 * broken by escaping mistakes when this file is edited.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/Cansoria";
const SNAP = path.join(ROOT, "frontend_ref/snapshot");
const DATA = path.join(ROOT, "tools/florencess-ref/data");
const BASE = "https://entntnt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

const CONCURRENCY = 2;
const TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;
const MAX_PAGES = 60;

// The reference default sort is `random`, which reshuffles on every request and
// therefore cannot be paged deterministically. The snapshot is enumerated with
// sort=pd.name&order=ASC&limit=100 (both controls observed on the page) so every
// product is captured exactly once; the storefront uses that capture order as
// its stable "Default" order instead of imitating randomness.
const SNAPSHOT_QUERY = "sort=pd.name&order=ASC&limit=100";

const mode = process.argv[2] || "all";

const ensure = (dir) => fs.mkdirSync(dir, { recursive: true });
ensure(path.join(SNAP, "categories"));
ensure(path.join(SNAP, "products"));
ensure(path.join(SNAP, "info"));

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};

const writeJson = (file, value) => {
  fs.writeFileSync(file, JSON.stringify(value, null, 1) + "\n", "utf8");
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getHtml(urlPath, attempt = 0) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(BASE + urlPath, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (res.status === 429 || res.status === 503) {
      const retryAfter = Number(res.headers.get("retry-after")) || 30;
      if (attempt < MAX_RETRIES) {
        console.warn(`  ${urlPath} -> ${res.status}; pause ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        return getHtml(urlPath, attempt + 1);
      }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      await sleep(1500 * (attempt + 1));
      return getHtml(urlPath, attempt + 1);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function pool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
      await sleep(400);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function decodeEntities(value) {
  return String(value)
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&#160;", " ");
}

/** Collect the digits of `text` from `at` up to the first non-digit. */
function digitsAt(text, at) {
  let end = at;
  while (end < text.length && text[end] >= "0" && text[end] <= "9") end += 1;
  return text.slice(at, end);
}

/** Read the attribute value that starts right after `prefix` in `text`. */
function attrAfter(text, prefix, quote = '"') {
  const at = text.indexOf(prefix);
  if (at < 0) return null;
  const start = at + prefix.length;
  const end = text.indexOf(quote, start);
  return end < 0 ? null : text.slice(start, end);
}

/** Read visible text between `open` and `close`, starting at `from`. */
function between(text, open, close, from = 0) {
  const start = text.indexOf(open, from);
  if (start < 0) return null;
  const innerStart = start + open.length;
  const end = text.indexOf(close, innerStart);
  if (end < 0) return null;
  return text.slice(innerStart, end);
}

function stripTags(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const CARD_START = '<div class="product-layout';
const PRODUCT_ID = 'data-product-id="';

function cardAnchors(html) {
  const anchors = [];
  let at = 0;
  while (true) {
    const found = html.indexOf(CARD_START, at);
    if (found < 0) break;
    const cls = html.indexOf('"', found + CARD_START.length);
    const tagEnd = cls < 0 ? -1 : html.indexOf(">", cls);
    if (tagEnd < 0) break;
    const openTag = html.slice(found, tagEnd);
    const id = attrAfter(openTag, PRODUCT_ID);
    if (id) anchors.push({ index: found, id });
    at = tagEnd;
  }
  return anchors;
}

/** Turn a card href into {slug, id}; href may carry a /category/ prefix and a
 *  preserved ?sort=... query (the reference keeps listing filters on links). */
function slugFromHref(href) {
  const bare = href.split("?")[0].split("#")[0];
  const pathPart = bare.split("entntnt.com/").pop() || "";
  const segments = pathPart.split("/");
  const last = segments[segments.length - 1];
  if (!last || !/^[a-z0-9][a-z0-9-]*$/i.test(last)) return null;
  const dash = last.lastIndexOf("-");
  const suffix = dash >= 0 ? last.slice(dash + 1) : "";
  return { slug: last, id: /^\d+$/.test(suffix) ? suffix : null };
}

function parseCards(html) {
  const cards = [];
  const anchors = cardAnchors(html);
  for (let i = 0; i < anchors.length; i += 1) {
    const from = anchors[i].index;
    const to = i + 1 < anchors.length ? anchors[i + 1].index : Math.min(html.length, from + 30000);
    const block = html.slice(from, to);

    // The product link is the first <a> carrying class="product-img".
    const imgClassAt = block.indexOf('<a href="');
    const imgAnchorAt = block.indexOf('class="product-img', imgClassAt < 0 ? 0 : imgClassAt);
    if (imgAnchorAt < 0) continue;
    const hrefAt = block.lastIndexOf('<a href="', imgAnchorAt);
    if (hrefAt < 0) continue;
    const href = attrAfter(block.slice(hrefAt), 'href="');
    if (!href) continue;
    const parsed = slugFromHref(href);
    if (!parsed || (parsed.id && parsed.id !== anchors[i].id)) continue;

    const titleAttr = (() => {
      const at = block.indexOf('class="product-img');
      if (at < 0) return "";
      const tagEnd = block.indexOf(">", at);
      const tag = block.slice(at, tagEnd);
      return attrAfter(tag, 'title="') || "";
    })();

    const images = [];
    let imageAt = block.indexOf('data-src="');
    while (imageAt >= 0 && images.length < 4) {
      const url = attrAfter(block.slice(imageAt), 'data-src="');
      if (url && url.includes("entntnt.com/image/") && !images.includes(url)) images.push(url);
      imageAt = block.indexOf('data-src="', imageAt + 9);
    }

    const priceNewRaw =
      between(block, 'class="price-new">', "<") ?? between(block, 'class="price-normal">', "<");
    const priceOldRaw = between(block, 'class="price-old">', "<");
    const labelRaw = between(block, 'product-label', "</span>");
    const strongRaw = labelRaw ? between(labelRaw, "<strong>", "</strong>") : null;
    const descriptionRaw = between(block, '<div class="description">', "</div>");

    cards.push({
      id: anchors[i].id,
      slug: parsed.slug,
      hrefPath: `/${parsed.slug}`,
      title: decodeEntities(titleAttr),
      images,
      price: priceNewRaw ? decodeEntities(priceNewRaw).trim() : "",
      oldPrice: priceOldRaw ? decodeEntities(priceOldRaw).trim() : "",
      discount: strongRaw ? decodeEntities(strongRaw).trim() : "",
      description: descriptionRaw ? stripTags(descriptionRaw) : "",
    });
  }
  return cards;
}

/** Parse the reference "Showing 1 to 100 of 210 (3 Pages)" footer. */
function parseShowing(html) {
  const match = html.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s*\((\d+)\s+Pages?\)/i);
  if (!match) return null;
  return {
    from: Number(match[1]),
    to: Number(match[2]),
    total: Number(match[3]),
    pages: Number(match[4]),
  };
}

const pageFile = (slug, page) => path.join(SNAP, "categories", `${slug}-s100-p${page}.html`);

async function fetchCategoryPage(slug, page) {
  const file = pageFile(slug, page);
  if (fs.existsSync(file)) {
    return { html: fs.readFileSync(file, "utf8"), cached: true };
  }
  const html = await getHtml(`/${slug}?${SNAPSHOT_QUERY}&page=${page}`);
  fs.writeFileSync(file, html, "utf8");
  return { html, cached: false };
}

async function crawlCategory(category) {
  const pages = [];
  let total = null;
  let pageCount = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { html } = await fetchCategoryPage(category.slug, page);
    const cards = parseCards(html);
    const showing = parseShowing(html);
    if (showing) {
      total = showing.total;
      pageCount = showing.pages;
    }
    pages.push({ page, cards });
    if (!cards.length) break;
    if (pageCount && page >= pageCount) break;
  }
  const flat = [];
  const seen = new Set();
  for (const entry of pages) {
    for (const card of entry.cards) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      flat.push(card);
    }
  }
  return {
    slug: category.slug,
    title: stripTags(category.title),
    h1: stripTags(category.h1),
    total: total ?? category.total ?? null,
    pageCount: pageCount ?? pages.length,
    pagesCaptured: pages.filter((entry) => entry.cards.length).length,
    empty: !flat.length,
    cards: flat,
    pageCounts: pages.map((entry) => ({ page: entry.page, cards: entry.cards.length })),
    fetchedAt: new Date().toISOString(),
  };
}

async function crawlCategories() {
  const categories = readJson(path.join(DATA, "ref-categories.json"), []);
  const out = {};
  console.log(`categories: ${categories.length}`);
  await pool(categories, async (category) => {
    try {
      const entry = await crawlCategory(category);
      out[category.slug] = entry;
      console.log(
        `  ok ${category.slug} pages=${entry.pagesCaptured}/${entry.pageCount} cards=${entry.cards.length}/${entry.total}`,
      );
    } catch (error) {
      out[category.slug] = out[category.slug] || { slug: category.slug, error: String(error.message) };
      console.log(`  ERR ${category.slug} ${error.message}`);
    }
    writeJson(path.join(DATA, "snapshot-cards.json"), out);
  });
  writeJson(path.join(DATA, "snapshot-cards.json"), out);
  return out;
}

async function reparseCategories() {
  const categories = readJson(path.join(DATA, "ref-categories.json"), []);
  const out = {};
  for (const category of categories) {
    try {
      out[category.slug] = await crawlCategory(category);
      const entry = out[category.slug];
      console.log(
        `  ${category.slug} pages=${entry.pagesCaptured}/${entry.pageCount} cards=${entry.cards.length}/${entry.total}`,
      );
    } catch (error) {
      out[category.slug] = { slug: category.slug, error: String(error.message) };
      console.log(`  ERR ${category.slug} ${error.message}`);
    }
  }
  writeJson(path.join(DATA, "snapshot-cards.json"), out);
  console.log("reparsed", Object.keys(out).length, "categories");
}

async function crawlProducts() {
  const shelfProducts = readJson(path.join(DATA, "products.json"), []);
  const cardData = readJson(path.join(DATA, "snapshot-cards.json"), {});

  const products = new Map();
  for (const product of shelfProducts) {
    const slug = String(product.href || "").replace("https://entntnt.com/", "");
    const id = product.id || (slug.split("-").pop() || "");
    if (!id) continue;
    products.set(id, {
      id,
      slug,
      title: product.name,
      price: product.price || "",
      oldPrice: product.old || "",
      discount: product.discount || "",
      images: [product.img, product.img2].filter(Boolean),
      categories: [],
    });
  }
  for (const [categorySlug, entry] of Object.entries(cardData)) {
    for (const card of entry.cards || []) {
      const existing = products.get(card.id) || { ...card, categories: [] };
      existing.slug = existing.slug || card.slug;
      existing.title = existing.title || card.title;
      existing.price = existing.price || card.price;
      existing.oldPrice = existing.oldPrice || card.oldPrice;
      existing.discount = existing.discount || card.discount;
      if (!existing.images || !existing.images.length) existing.images = card.images;
      if (!existing.categories.includes(categorySlug)) existing.categories.push(categorySlug);
      products.set(card.id, existing);
    }
  }

  const list = [...products.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  writeJson(path.join(DATA, "snapshot-products.json"), list);
  console.log(`products in scope: ${list.length}`);

  const todo = list.filter((product) => !fs.existsSync(path.join(SNAP, "products", `${product.slug}.html`)));
  console.log(`product pages to fetch: ${todo.length}`);
  let done = 0;
  await pool(todo, async (product) => {
    try {
      const html = await getHtml(`/${product.slug}`);
      fs.writeFileSync(path.join(SNAP, "products", `${product.slug}.html`), html, "utf8");
      done += 1;
      if (done % 50 === 0) console.log(`  fetched ${done}/${todo.length}`);
    } catch (error) {
      console.log(`  ERR ${product.slug} ${error.message}`);
      product.error = String(error.message);
    }
  });
  writeJson(path.join(DATA, "snapshot-products.json"), list);
}

if (mode === "parse") await reparseCategories();
if (mode === "all" || mode === "categories") await crawlCategories();
if (mode === "all" || mode === "products") await crawlProducts();
console.log("done");
