import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const files = [
  path.join(REPO, "frontend", "src/app/florencess.css"),
  path.join(REPO, "frontend", "src/lib/florencess-data.ts"),
  path.join(REPO, "frontend", "src/lib/florencess-pages.ts"),
];

for (const f of files) {
  let t = fs.readFileSync(f, "utf8");
  const before = t;

  // the en dash in "3–5 Days Delivery of USPS" lost both the dash and the 5
  t = t.replace(/3\u9225\?? Days Delivery of USPS/g, "3\u20135 Days Delivery of USPS");
  // remaining mangled em dashes
  t = t.replace(/\u9225\uFFFD?/g, "\u2014");
  // the pages header quotes the divider glyph and the bullet
  t = t.replace(/"\u98E7\?/g, '"\u2E3B');

  if (t !== before) {
    fs.writeFileSync(f, t, "utf8");
    console.log("fixed", f);
  } else {
    console.log("clean", f);
  }
}

// verify
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  const bad = (t.match(/[\u9225\uFFFD]/g) || []).length;
  console.log(f.split("/").pop(), "residual", bad);
}
const d = fs.readFileSync(files[1], "utf8");
console.log("topbar line:", d.split(/\r?\n/)[12]);
