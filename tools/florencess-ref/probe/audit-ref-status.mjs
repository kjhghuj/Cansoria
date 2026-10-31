import fs from "node:fs";

const BASE = "https://entntnt.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";

const paths = JSON.parse(
  fs.readFileSync("H:/Cansoria/tools/florencess-ref/data/ref-links.json", "utf8"),
);

async function probe(p) {
  try {
    const r = await fetch(BASE + p, {
      headers: { "user-agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    const html = await r.text();
    const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").trim();
    const notFound = /The page you requested cannot be found/i.test(title);
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 70);
    return {
      path: p,
      status: r.status,
      finalUrl: new URL(r.url).pathname + new URL(r.url).search,
      title: title.slice(0, 90),
      notFound,
      bytes: html.length,
      h1,
    };
  } catch (e) {
    return { path: p, status: 0, error: String(e.message || e), title: "", notFound: false, bytes: 0, h1: "" };
  }
}

const out = [];
const CONC = 4;
for (let i = 0; i < paths.length; i += CONC) {
  const batch = paths.slice(i, i + CONC);
  out.push(...(await Promise.all(batch.map(probe))));
  await new Promise((r) => setTimeout(r, 350));
}

fs.writeFileSync(
  "H:/Cansoria/tools/florencess-ref/data/ref-page-status.json",
  JSON.stringify(out, null, 1),
  "utf8",
);

const ok = out.filter((r) => r.status === 200 && !r.notFound);
const dead = out.filter((r) => r.status !== 200 || r.notFound);

console.log(`=== LIVE (${ok.length}) ===`);
for (const r of ok.sort((a, b) => a.path.localeCompare(b.path))) {
  console.log(`  ${String(r.status)} ${r.path.padEnd(58)} ${String(r.bytes).padStart(7)}B  ${r.h1 || r.title}`);
}
console.log(`\n=== DEAD / 404 (${dead.length}) ===`);
for (const r of dead.sort((a, b) => a.path.localeCompare(b.path))) {
  console.log(`  ${String(r.status).padStart(3)} ${r.path.padEnd(58)} ${r.notFound ? "404-page" : r.error || r.title.slice(0, 30)}`);
}
