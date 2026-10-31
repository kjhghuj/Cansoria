import fs from "node:fs";

const BASE = "https://entntnt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

const cats = [
  "bags-all", "clothing", "shoes", "dresses", "tops", "new", "final-few",
  "heels", "boots", "sandals", "loafers", "ballet-flats", "denim",
  "pants-leggings", "sweatshirts-sweatpants", "tanks-tees",
  "leather-belt-bags", "leather-bucket-bags", "leather-clutches",
  "leather-crossbody-bags", "leather-evening-bags", "leather-mini-micro-bags",
  "leather-phone-crossbody", "leather-shoulder-bags", "leather-totes",
];

async function get(p) {
  const r = await fetch(BASE + p, {
    headers: { "user-agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  return { status: r.status, html: await r.text() };
}

const rows = [];
for (const c of cats) {
  try {
    const { status, html } = await get("/" + c);
    const cards = (html.match(/class="[^"]*\bproduct-layout\b/g) || []).length;
    const showing = html.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim();
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const desc = (html.match(/<div class="[^"]*category-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
    const empty = /There are no products to list/i.test(html);
    rows.push({
      slug: c,
      status,
      title: title.slice(0, 60),
      h1,
      cards,
      total: showing ? Number(showing[3]) : cards,
      pages: showing ? Math.ceil(Number(showing[3]) / 48) : null,
      empty,
      desc,
      bytes: html.length,
    });
    console.log(
      `  ${String(status)} ${c.padEnd(26)} h1="${h1.slice(0, 26).padEnd(26)}" cards=${String(cards).padStart(3)} total=${String(showing ? showing[3] : "?").padStart(5)}${empty ? "  EMPTY" : ""}`,
    );
  } catch (e) {
    console.log(`  ERR ${c} ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 500));
}

fs.writeFileSync(
  "H:/Cansoria/tools/florencess-ref/data/ref-categories.json",
  JSON.stringify(rows, null, 1),
  "utf8",
);
const withItems = rows.filter((r) => r.total > 0);
console.log(`\ncategories: ${rows.length}, non-empty: ${withItems.length}`);
console.log("sum of totals (with overlap):", rows.reduce((a, r) => a + (r.total || 0), 0));
