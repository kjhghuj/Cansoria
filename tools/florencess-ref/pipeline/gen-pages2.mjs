import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const SRC = path.join(REF, "pages");
const OUT = path.join(REPO, "frontend", "src/lib/florencess-pages.ts");

const PAGES = [
  { slug: "about-us", key: "About Us", label: "About Us", meta: "06 Sep 0 Comment(s) 3138 View(s)" },
  { slug: "shipping-policy", key: "Shipping Policy", label: "Shipping Policy", meta: "07 Sep 0 Comment(s) 2802 View(s)" },
  { slug: "terms-conditions", key: "Terms & Conditions", label: "Terms & Conditions", meta: "07 Sep 0 Comment(s) 2502 View(s)" },
  { slug: "privacy-policy", key: "Privacy Policy", label: "Privacy Policy", meta: "07 Sep 0 Comment(s) 2477 View(s)" },
  { slug: "cookie-policy", key: "Cookie Policy", label: "Cookie Policy", meta: "07 Sep 0 Comment(s) 2404 View(s)" },
];

const DIVIDER = "\u2E3B";
const BULLET = "\u2022";
const WSRE = /[ \r\n\t]+/;
const collapse = (s) => s.split(WSRE).join(" ").trim();

function classify(tag, text) {
  if (tag === "h1") return "display";
  if (text.length === 0) return "spacer";
  if (text === DIVIDER) return "divider";
  if (/^\d\)\s/.test(text)) return "heading";
  if (text.startsWith(BULLET)) return "bullet";
  return "body";
}

const out = {};

for (const p of PAGES) {
  const dump = JSON.parse(fs.readFileSync(`${SRC}/${p.slug}-blocks.json`, "utf8"));
  const blocks = dump.blocks;

  // The reference renders About Us with bare <div>s and every other page with
  // <p>; both keep their own margin rhythm (div:0, p:0 0 10px) and their own
  // spacer behaviour, so the block tag is part of the data.
  const blockTag = blocks.find((b) => b.text.length > 0 && b.tag !== "h1").tag === "div" ? "div" : "p";

  const sections = blocks.map((b) => ({
    kind: classify(b.tag, collapse(b.text || "")),
    text: collapse(b.text || ""),
  }));

  const counts = sections.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
  out[p.slug] = { ...p, blockTag, sections };
  console.log(p.slug.padEnd(18), blockTag, JSON.stringify(counts));

  const sum = blocks.reduce((a, b) => a + b.h + parseFloat(b.mb), 0);
  console.log("   blocks", blocks.length, "sumH+mb", Math.round(sum * 10) / 10);
}

const esc = (s) => JSON.stringify(s);

let ts = `/**
 * Static FLORENCESS content pages, transcribed from the live storefront.
 *
 * Layout comes from the reference theme: a centred 32px uppercase title band
 * with 80px/40px padding, then a 475px reading column whose prose is inset 64px
 * at 16px/24px. Text is stored verbatim 鈥?including the "飧? dividers, the "鈥?
 * bullets and the empty blocks the theme uses for spacing.
 *
 * Two structural details are reproduced because they change the vertical
 * rhythm: About Us lays its prose out as bare <div>s with no margins, while the
 * policy pages use <p> with a 10px bottom margin. Their spacers differ too 鈥?a
 * <div><br></div> that occupies one 24px line versus an empty <p> that
 * collapses to zero height and only contributes its margin.
 */

export type FlPageSectionKind = "display" | "heading" | "body" | "bullet" | "divider" | "spacer";

export interface FlPageSection {
  kind: FlPageSectionKind;
  text: string;
}

export interface FlStaticPage {
  slug: string;
  key: string;
  label: string;
  /** The reference "07 Sep 0 Comment(s) 2404 View(s)" line above the prose. */
  meta: string;
  /** Element the reference uses for prose blocks: bare divs or paragraphs. */
  blockTag: "div" | "p";
  sections: FlPageSection[];
}

`;

ts += "export const FL_STATIC_PAGES: Record<string, FlStaticPage> = {\n";
for (const p of PAGES) {
  const v = out[p.slug];
  ts += `  ${esc(p.slug)}: {\n`;
  ts += `    slug: ${esc(v.slug)},\n    key: ${esc(v.key)},\n    label: ${esc(v.label)},\n`;
  ts += `    meta: ${esc(v.meta)},\n    blockTag: ${esc(v.blockTag)},\n    sections: [\n`;
  for (const s of v.sections) {
    ts += `      { kind: ${esc(s.kind)}, text: ${esc(s.text)} },\n`;
  }
  ts += `    ],\n  },\n`;
}
ts += "};\n\n";
ts += "export const FL_STATIC_PAGE_SLUGS = Object.keys(FL_STATIC_PAGES);\n";

fs.writeFileSync(OUT, ts, "utf8");
console.log("written", OUT, "bytes", ts.length);

