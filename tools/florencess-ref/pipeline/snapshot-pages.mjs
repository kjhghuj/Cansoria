/**
 * Parse the captured information pages (articles, FAQ, contact, brands) into
 * src/data/florencess-content.json. The reference serves these as Journal3
 * "blocks" pages: a centred page title, a meta line and a prose column.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "H:/Cansoria";
const INFO = path.join(ROOT, "frontend_ref/snapshot/info");
const OUT = path.join(ROOT, "frontend/src/data/florencess-content.json");

const FEEDBACK_EMAIL = "service@entntnt.com";

function decode(value) {
  return String(value)
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function text(value) {
  return decode(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function read(name) {
  return fs.readFileSync(path.join(INFO, `${name}.html`), "utf8");
}

function pageLabel(html) {
  const match = html.match(/<h1 class="title page-title[^"]*"[^>]*>\s*<span class="page-title-text">([\s\S]*?)<\/span>/);
  return match ? text(match[1]) : "";
}

function metaLine(html) {
  const date = html.match(/<span class="p-date[^"]*">([\s\S]*?)<\/span>/);
  const comments = html.match(/<span class="p-comment">([\s\S]*?)<\/span>/);
  const views = html.match(/<span class="p-view">([\s\S]*?)<\/span>/);
  return [text(date?.[1] || ""), text(comments?.[1] || ""), text(views?.[1] || "")]
    .filter(Boolean)
    .join(" ");
}

function articleSections(html) {
  const start = html.indexOf('<div class="bagers-pad">');
  if (start < 0) return [];
  const inner = html.slice(start + '<div class="bagers-pad">'.length);
  // Stop at the matching close of the article's bagers-pad wrapper; the
  // post-navigation marker is absent in several captured pages, and slicing
  // a fixed 20K otherwise imports footer headings as editorial content.
  const end = inner.indexOf("</div>");
  if (end < 0) throw new Error("Article wrapper was not closed in capture");
  const body = inner.slice(0, end);
  const sections = [];
  for (const match of body.matchAll(/<(h1|h2|h3|p)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
    const tag = match[1];
    const raw = match[2];
    const value = text(raw).replace(/\[email(?:&#160;|\s)protected\]/g, FEEDBACK_EMAIL).trim();
    if (!value) {
      sections.push({ kind: "spacer", text: "" });
      continue;
    }
    if (value === "⸻") {
      sections.push({ kind: "divider", text: "⸻" });
      continue;
    }
    if (tag === "h1") sections.push({ kind: "display", text: value });
    else if (tag === "h2" || tag === "h3") sections.push({ kind: "heading", text: value });
    else sections.push({ kind: "body", text: value });
  }
  return sections;
}

function article(name) {
  const html = read(name);
  const sections = articleSections(html);
  return {
    label: pageLabel(html) || name,
    meta: metaLine(html),
    blockTag: "p",
    sections,
  };
}

const ARTICLES = {
  careers: article("careers"),
  "affiliate-program": article("affiliate-program"),
  "customer-rewards-program": article("customer-rewards-program"),
  "payment-options": article("payment-options"),
  "returns-exchanges": article("returns-exchanges"),
  "order-tracking": article("order-tracking"),
};

function faq() {
  const html = read("faq");
  const groups = [];
  const panelRe =
    /<a[^>]*class="accordion-toggle[^"]*"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="block-content\s+block-html">([\s\S]*?)<\/div>/g;
  for (const match of html.matchAll(panelRe)) {
    const question = text(match[1]).replace(/\s*<i[^>]*><\/i>\s*/g, "").trim();
    const body = match[2];
    const blocks = [];
    for (const p of body.matchAll(/<(p|li|h[1-6])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      const value = text(p[2]);
      if (value) blocks.push(value);
    }
    if (!blocks.length) {
      const value = text(body);
      if (value) blocks.push(value);
    }
    groups.push({ question: question.replace(/\s*<[^>]*>\s*$/, ""), blocks });
  }
  return groups;
}

function contact() {
  const html = read("contact");
  const content = html.slice(html.indexOf('<div id="content"'));
  const addressMatch = content.match(
    /Room C1090,[\s\S]*?Guangzhou, Guangdong, China/,
  );
  const phoneMatch = content.match(/\+1 \(646\) 391-6438/);
  const careMatch = content.match(/Customer Care\s*(\+86 [\d ]+)/);
  return {
    address:
      text(addressMatch?.[0] || "") ||
      "Room C1090, 3A01, 3rd Floor, No. 6 Wuxi Road, Zhongluotan Town, Baiyun District, Guangzhou, Guangdong, China",
    phone: phoneMatch?.[0] || "+1 (646) 391-6438",
    carePhone: careMatch ? text(careMatch[1]) : "+86 13900747817",
  };
}

function brands() {
  const html = read("brands");
  const start = html.indexOf("Brand Index:");
  const seg = html.slice(start, start + 60000);
  const letters = [...seg.matchAll(/href="index\.php\?route=product\/manufacturer#([A-Z])"[^>]*>\s*([A-Z])\s*</g)].map(
    (m) => m[1],
  );
  const items = [];
  for (const match of seg.matchAll(/<a href="(https:\/\/entntnt\.com\/(brand-[^"]+)|https:\/\/entntnt\.com\/index\.php\?route=product\/manufacturer\/info&amp;manufacturer_id=(\d+))"[^>]*>([\s\S]*?)<\/a>/g)) {
    const label = text(match[4]);
    if (!label) continue;
    const slug = match[2] || `manufacturer-${match[3]}`;
    items.push({ slug, label });
  }
  const unique = [...new Map(items.map((item) => [item.slug, item])).values()];
  const groups = letters.map((letter) => ({
    letter,
    items: unique.filter((item) => item.label.toUpperCase().startsWith(letter)),
  }));
  return { letters, groups, total: unique.length };
}

const payload = {
  generatedAt: new Date().toISOString(),
  articles: ARTICLES,
  faq: faq(),
  contact: contact(),
  brands: brands(),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload, null, 1) + "\n", "utf8");
console.log(
  `content: ${Object.keys(ARTICLES).length} articles, ${payload.faq.length} faq groups, ` +
    `${payload.brands.total} brands`,
);
for (const [slug, page] of Object.entries(ARTICLES)) {
  console.log(`  ${slug}: ${page.sections.length} sections, label="${page.label}" meta="${page.meta}"`);
}