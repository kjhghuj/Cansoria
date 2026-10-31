import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const dir = path.join(REPO, "frontend", "public/florencess/img");
const prods = JSON.parse(fs.readFileSync(path.join(REF, "products.json"), "utf8"));
const files = new Set(fs.readdirSync(dir));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const jobs = [];
prods.forEach((p, i) => {
  for (const [key, suffix] of [["img", "a"], ["img2", "b"]]) {
    const url = p[key];
    if (!url) continue;
    const fn = `p${String(i + 1).padStart(2, "0")}${suffix}.webp`;
    if (!files.has(fn)) jobs.push({ url, fn });
  }
});

console.log("to fetch:", jobs.length);
let ok = 0, fail = 0;
for (const j of jobs) {
  try {
    const r = await fetch(j.url, { headers: { "User-Agent": UA, Referer: "https://entntnt.com/" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(dir, j.fn), buf);
    console.log("ok", j.fn, buf.length, "bytes");
    ok++;
  } catch (e) {
    console.log("FAIL", j.fn, j.url, e.message);
    fail++;
  }
}
console.log(`done ok=${ok} fail=${fail}`);
