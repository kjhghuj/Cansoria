import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const CDP = "http://127.0.0.1:9227";
const OUT = path.join(REF, "pages");

function conn(u) {
  return new Promise((res, rej) => {
    const w = new WebSocket(u);
    w.onopen = () => res(w);
    w.onerror = () => rej(new Error("ws"));
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

const WS = "[ \\r\\n\\t]+";

const EXPR = `(() => {
  const collapse = (s) => s.split(new RegExp(${JSON.stringify(WS)}, "g")).join(" ").trim();
  const root = document.querySelector("#content") || document.querySelector(".main-content") || document.querySelector("main");
  if (!root) return { err: "no root" };
  const titleEl = document.querySelector(".page-title, h1");
  const blocks = [];
  const walk = (el) => {
    for (const c of el.children) {
      const tag = c.tagName.toLowerCase();
      if (["h1","h2","h3","h4","h5","h6","p","li","td","th"].includes(tag)) {
        const txt = collapse(c.textContent || "");
        const s = getComputedStyle(c);
        const r = c.getBoundingClientRect();
        if (txt) blocks.push({ tag, txt, fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, color: s.color, mt: s.marginTop, mb: s.marginBottom, tt: s.textTransform, y: Math.round(r.top) });
      } else if (["div","section","article","ul","ol","table","tbody","tr","blockquote"].includes(tag)) {
        const txt = collapse(c.textContent || "");
        if (txt) {
          const s = getComputedStyle(c);
          const r = c.getBoundingClientRect();
          blocks.push({ tag, txt: txt.slice(0, 6000), fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, color: s.color, mt: s.marginTop, mb: s.marginBottom, tt: s.textTransform, y: Math.round(r.top), container: true });
        }
        walk(c);
      }
    }
  };
  walk(root);
  const imgs = [...root.querySelectorAll("img")].map((i) => ({ src: i.getAttribute("src"), alt: i.alt, w: i.naturalWidth, h: i.naturalHeight }));
  const rr = root.getBoundingClientRect();
  const tr = titleEl ? titleEl.getBoundingClientRect() : null;
  const bc = [...document.querySelectorAll(".breadcrumb a, ol.breadcrumb li")].map((e) => collapse(e.textContent || "")).filter(Boolean);
  const titleStyle = titleEl ? getComputedStyle(titleEl) : null;
  return {
    url: location.pathname,
    title: titleEl ? { txt: collapse(titleEl.textContent || ""), tag: titleEl.tagName, y: Math.round(tr.top), h: Math.round(tr.height), fs: titleStyle.fontSize, fw: titleStyle.fontWeight, color: titleStyle.color, tt: titleStyle.textTransform } : null,
    breadcrumb: bc,
    rootW: Math.round(rr.width), rootX: Math.round(rr.left),
    blocks, imgs,
  };
})()`;

const urls = ["about-us", "shipping-policy", "terms-conditions", "privacy-policy", "cookie-policy"];

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const page = targets.find((x) => x.type === "page");
  const ws = await conn(page.webSocketDebuggerUrl);
  await rpc(ws, 1, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  fs.mkdirSync(OUT, { recursive: true });
  for (const u of urls) {
    await rpc(ws, 2, "Page.navigate", { url: "https://entntnt.com/" + u });
    await new Promise((r) => setTimeout(r, 7000));
    const res = await rpc(ws, 3, "Runtime.evaluate", { expression: EXPR, returnByValue: true });
    const v = res.result && res.result.value;
    if (!v || v.err) { console.log("FAIL", u, JSON.stringify(v)); continue; }
    fs.writeFileSync(OUT + "/" + u + ".json", JSON.stringify(v, null, 1));
    const top = v.blocks.filter((b) => !b.container).length;
    console.log(u, "title:", v.title && v.title.txt, "| titleH:", v.title && v.title.h, "| rootW:", v.rootW, "| leaf blocks:", top, "| total:", v.blocks.length, "| imgs:", v.imgs.length);
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
