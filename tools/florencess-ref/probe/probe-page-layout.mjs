import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const CDP = "http://127.0.0.1:9227";
const WS = "[ \\r\\n\\t]+";

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

const EXPR = `(() => {
  const collapse = (s) => s.split(new RegExp(${JSON.stringify(WS)}, "g")).join(" ").trim();
  const R = (el, label) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { label, tag: el.tagName, cls: (el.className || "").toString().slice(0, 48), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), fs: s.fontSize, fw: s.fontWeight, lh: s.lineHeight, color: s.color, bg: s.backgroundColor, pad: s.padding, ta: s.textAlign, tt: s.textTransform, ls: s.letterSpacing, bb: s.borderBottomWidth + " " + s.borderBottomColor, txt: collapse(el.textContent || "").slice(0, 60) };
  };
  const titleBar = document.querySelector(".page-title") ? document.querySelector(".page-title").parentElement : null;
  const bc = document.querySelector(".breadcrumb");
  const bcItems = bc ? [...bc.querySelectorAll("li")].map((li) => R(li, "bc-item")) : [];
  const post = document.querySelector(".post-detail");
  const img = document.querySelector(".post-image img");
  const meta = document.querySelector(".post-stats");
  const content = document.querySelector(".post-content");
  return {
    page: R(document.querySelector(".page-title"), "h1"),
    titleBar: R(titleBar, "titleBar"),
    bcWrap: R(bc, "breadcrumb"),
    bcItems,
    post: R(post, "post"),
    img: R(img, "banner"),
    imgSrc: img ? img.getAttribute("src") : null,
    meta: R(meta, "meta"),
    content: R(content, "content"),
    contentBox: R(document.querySelector(".post-content .bagers-pad") || content, "contentInner"),
    h1Inside: R(document.querySelector(".post-content h1"), "contentH1"),
    firstP: R(document.querySelector(".post-content p"), "firstP"),
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const page = targets.find((x) => x.type === "page");
  const ws = await conn(page.webSocketDebuggerUrl);
  const out = {};
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    await rpc(ws, 1, "Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: mob });
    await rpc(ws, 2, "Page.navigate", { url: "https://entntnt.com/shipping-policy" });
    await new Promise((r) => setTimeout(r, 7000));
    const res = await rpc(ws, 3, "Runtime.evaluate", { expression: EXPR, returnByValue: true });
    out[w] = res.result && res.result.value;
  }
  fs.writeFileSync(path.join(REF, "pages/layout.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1).slice(0, 4000));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
