import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

const CDP = "http://127.0.0.1:9228";
import fs from "node:fs";

function conn(u) {
  return new Promise((res, rej) => {
    const w = new WebSocket(u);
    w.onopen = () => res(w);
    w.onerror = () => rej(new Error("ws error"));
  });
}
function rpc(ws, id, method, params = {}) {
  return new Promise((res, rej) => {
    const h = (e) => {
      const x = JSON.parse(e.data);
      if (x.id === id) {
        ws.removeEventListener("message", h);
        x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result);
      }
    };
    ws.addEventListener("message", h);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

const SHELF = (rowSel) => `(() => {
  const row = document.querySelector("${rowSel}");
  if (!row) return { error: "no row" };
  const cards = [...row.querySelectorAll(".product-layout")];
  const seen = new Set();
  const items = [];
  for (const c of cards) {
    const a = c.querySelector("a[href*='product_id'], .caption a, h4 a");
    const href = a ? a.getAttribute("href") : null;
    const key = href || c.innerText.slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    const imgs = [...c.querySelectorAll("img")].map((i) => i.getAttribute("src") || i.getAttribute("data-src") || "");
    const name = (c.querySelector(".caption a, h4 a, .name a") || {}).textContent || "";
    const priceEl = c.querySelector(".price");
    const priceTxt = priceEl ? priceEl.innerText.replace(/\\s+/g, " ").trim() : "";
    const oldEl = c.querySelector(".price-old");
    const newEl = c.querySelector(".price-new");
    items.push({
      href,
      name: name.replace(/\\s+/g, " ").trim(),
      priceText: priceTxt,
      priceNew: newEl ? newEl.innerText.trim() : null,
      priceOld: oldEl ? oldEl.innerText.trim() : null,
      imgs: imgs.filter((s) => s && !s.startsWith("data:")),
      raw: c.innerText.replace(/\\s+/g, " ").trim().slice(0, 120),
    });
  }
  return { count: items.length, items };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/" });
  await new Promise((r) => setTimeout(r, 9000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight);1" });
  await new Promise((r) => setTimeout(r, 4000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1500));

  for (const [label, sel] of [["sale", ".grid-row-top-26"], ["also", ".grid-row-top-32"]]) {
    const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: SHELF(sel), returnByValue: true })).result.value;
    console.log(`--- ${label}: ${v.count} items`);
    v.items.slice(0, 30).forEach((it, i) => console.log(` ${String(i + 1).padStart(2)} ${it.name.slice(0, 44).padEnd(44)} | ${it.priceText.slice(0, 24).padEnd(24)} | ${it.imgs.length} img`));
    fs.writeFileSync(path.join(REF, `shelf-${label}.json`), JSON.stringify(v, null, 1), "utf8");
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
