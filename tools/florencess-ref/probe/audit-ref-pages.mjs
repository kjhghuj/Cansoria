import fs from "node:fs";

const BASE = "https://entntnt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  return { status: r.status, finalUrl: r.url, html: await r.text() };
}

// the homepage is the only known-good entry point
const home = await get(BASE + "/");
fs.writeFileSync("H:/Cansoria/tools/florencess-ref/data/home.html", home.html, "utf8");
console.log("home", home.status, "bytes", home.html.length);

const hrefs = new Set();
const re = /href=["']([^"'#]+)["']/g;
let m;
while ((m = re.exec(home.html))) {
  let h = m[1].trim();
  if (!h || h.startsWith("mailto:") || h.startsWith("tel:") || h.startsWith("javascript:")) continue;
  if (h.startsWith("//")) h = "https:" + h;
  if (h.startsWith("http") && !h.includes("entntnt.com")) continue;
  if (h.startsWith("/") === false && !h.startsWith("http")) h = "/" + h.replace(/^\.?\//, "");
  const u = new URL(h, BASE);
  if (u.host !== "entntnt.com") continue;
  const path = u.pathname + (u.search || "");
  // skip pure asset links
  if (/\.(css|js|png|jpe?g|webp|svg|woff2?|ttf|ico|gif)(\?|$)/i.test(path)) continue;
  if (path.startsWith("/catalog/view")) continue;
  hrefs.add(path);
}
console.log("unique internal paths:", hrefs.size);

const list = [...hrefs].sort();
fs.writeFileSync(
  "H:/Cansoria/tools/florencess-ref/data/ref-links.json",
  JSON.stringify(list, null, 1),
  "utf8",
);
for (const p of list) console.log("  " + p);
