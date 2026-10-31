import fs from "node:fs";

const BASE = "https://entntnt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

async function get(p) {
  const r = await fetch(BASE + p, {
    headers: { "user-agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const html = await r.text();
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  return {
    path: p,
    status: r.status,
    title,
    notFound: /The page you requested cannot be found/i.test(title),
    bytes: html.length,
    html,
  };
}

// candidate OpenCart routes that the home page does not link to
const candidates = [
  "/contact-us",
  "/contact",
  "/faq",
  "/blog",
  "/brands",
  "/special-offers",
  "/index.php?route=information/contact",
  "/index.php?route=product/search",
  "/index.php?route=product/special",
  "/index.php?route=product/manufacturer",
  "/index.php?route=account/login",
  "/index.php?route=account/wishlist",
  "/index.php?route=checkout/checkout",
  "/index.php?route=information/information&information_id=4",
  "/sale",
  "/men",
  "/women",
  "/gift-vouchers",
  "/stores",
  "/sitemap",
];

console.log("=== candidate routes ===");
const rows = [];
for (const c of candidates) {
  try {
    const r = await get(c);
    const live = r.status === 200 && !r.notFound;
    rows.push({ path: c, status: r.status, live, title: r.title.slice(0, 50) });
    console.log(`  ${String(r.status).padStart(3)} ${live ? "LIVE" : "dead"} ${c.padEnd(56)} ${live ? r.title.slice(0, 50) : ""}`);
  } catch (e) {
    console.log(`  ERR ${c} ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 300));
}

// how many products does a category actually hold
console.log("\n=== category inventory ===");
for (const cat of ["/bags-all", "/clothing", "/shoes", "/new", "/final-few"]) {
  const r = await get(cat);
  const html = r.html;
  const cards = (html.match(/class="[^"]*\bproduct-layout\b/g) || []).length;
  const showing = html.match(/Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i);
  const pages = [...html.matchAll(/[?&]page=(\d+)/g)].map((m) => Number(m[1]));
  const results = html.match(/(\d+)\s+products?/i);
  console.log(
    `  ${cat.padEnd(14)} cards=${String(cards).padStart(3)}  ` +
      (showing ? `showing ${showing[1]}-${showing[2]} of ${showing[3]}` : "no counter") +
      (pages.length ? `  maxPage=${Math.max(...pages)}` : "") +
      (results ? `  [${results[0]}]` : ""),
  );
  await new Promise((r) => setTimeout(r, 500));
}

fs.writeFileSync(
  "H:/Cansoria/tools/florencess-ref/data/ref-extra-routes.json",
  JSON.stringify(rows, null, 1),
  "utf8",
);
