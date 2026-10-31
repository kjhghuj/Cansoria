import path from "node:path";

// Repository root, overridable for other checkouts.
const REPO = process.env.CANSORIA_ROOT ?? path.resolve(import.meta.dirname, "..", "..", "..");
// Reference working directory (scraped html/pages + json dumps), overridable.
const REF = process.env.FLORENCESS_REF_DIR ?? path.join(REPO, "frontend_ref");

import fs from "node:fs";

const CDP = "http://127.0.0.1:9228";
const WSRE = "[ \\r\\n\\t]+";
const SLUGS = ["about-us", "shipping-policy", "terms-conditions", "privacy-policy", "cookie-policy"];

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

function metricsExpr(sel) {
  return `(() => {
  const collapse = (s) => s.split(new RegExp(${JSON.stringify(WSRE)}, "g")).join(" ").trim();
  const st = (el, props) => {
    if (!el) return null;
    const s = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = s[p];
    return o;
  };
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };

  const title = document.querySelector(${JSON.stringify(sel.title)});
  const col = document.querySelector(${JSON.stringify(sel.col)});
  const prose = document.querySelector(${JSON.stringify(sel.prose)});
  const ps = prose ? [...prose.querySelectorAll("p")] : [];
  const firstReal = ps.find((p) => collapse(p.textContent || "").length > 0) || null;

  // element that actually paints the page background
  const bgOwner = (() => {
    let el = title ? title.parentElement : document.body;
    while (el) {
      const c = getComputedStyle(el).backgroundColor;
      if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return { tag: el.tagName + "." + (el.className || "").toString().split(" ")[0], bg: c };
      el = el.parentElement;
    }
    return null;
  })();

  const inline = prose ? {
    links: prose.querySelectorAll("a").length,
    linkSample: (() => { const a = prose.querySelector("a"); return a ? { text: collapse(a.textContent).slice(0, 30), href: a.getAttribute("href"), color: getComputedStyle(a).color, deco: getComputedStyle(a).textDecorationLine } : null; })(),
    strong: prose.querySelectorAll("strong,b").length,
    em: prose.querySelectorAll("em,i").length,
    lists: prose.querySelectorAll("ul,ol").length,
    lis: prose.querySelectorAll("li").length,
    imgs: prose.querySelectorAll("img").length,
    brs: prose.querySelectorAll("br").length,
    tables: prose.querySelectorAll("table").length,
  } : null;

  const colRect = rect(col);
  const docH = document.documentElement.scrollHeight;
  const lastChild = col && col.lastElementChild ? col.lastElementChild.getBoundingClientRect() : null;

  return {
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bgOwner,
    titleRect: rect(title),
    titleStyle: st(title, ["fontSize","fontWeight","lineHeight","letterSpacing","textTransform","color","textAlign","paddingTop","paddingBottom","paddingLeft","paddingRight","marginTop","marginBottom","backgroundColor","fontFamily","borderBottomWidth","borderBottomStyle","borderBottomColor"]),
    titleText: title ? collapse(title.textContent) : null,
    colRect,
    colStyle: st(col, ["width","paddingTop","paddingBottom","paddingLeft","paddingRight","marginTop","marginLeft","backgroundColor"]),
    proseRect: rect(prose),
    proseStyle: st(prose, ["fontSize","fontWeight","lineHeight","color","letterSpacing","paddingLeft","paddingRight","paddingTop","textAlign","fontFamily","wordSpacing","textRendering"]),
    firstP: firstReal ? { rect: rect(firstReal), style: st(firstReal, ["fontSize","fontWeight","lineHeight","color","marginTop","marginBottom","letterSpacing","textAlign","textIndent"]), text: collapse(firstReal.textContent).slice(0, 44) } : null,
    pCount: ps.length,
    inline,
    docH,
    gapAfterCol: lastChild ? Math.round((docH - (lastChild.bottom + window.scrollY)) * 10) / 10 : null,
    colTopFromTitle: title && col ? Math.round((colRect.y - (rect(title).y + rect(title).h)) * 10) / 10 : null,
  };
})()`;
}

const SEL_REF = { title: ".page-title", col: ".post-detail", prose: ".post-content" };
const SEL_LOC = { title: ".fl-page__title", col: ".fl-page__col", prose: ".fl-page__prose" };

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  const out = {};

  for (const [side, base, sel] of [
    ["ref", "https://entntnt.com/", SEL_REF],
    ["loc", "http://localhost:3030/", SEL_LOC],
  ]) {
    for (const w of [1440, 390]) {
      for (const slug of SLUGS) {
        await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 });
        await rpc(ws, ++id, "Page.navigate", { url: base + slug });
        await new Promise((r) => setTimeout(r, side === "ref" ? 7000 : 4000));
        const res = await rpc(ws, ++id, "Runtime.evaluate", { expression: metricsExpr(sel), returnByValue: true });
        out[`${slug}@${w}`] = out[`${slug}@${w}`] || {};
        out[`${slug}@${w}`][side] = res.result && res.result.value;
      }
    }
  }

  fs.writeFileSync(path.join(REF, "pages/compare.json"), JSON.stringify(out, null, 1), "utf8");

  // Print a focused diff: only fields that differ.
  const KEYS = ["titleStyle", "colStyle", "proseStyle", "firstP"];
  for (const key of Object.keys(out)) {
    const r = out[key].ref;
    const l = out[key].loc;
    const diffs = [];
    if (r && l) {
      const simple = (a, b, label) => { if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push(`${label}: ref=${JSON.stringify(a)} loc=${JSON.stringify(b)}`); };
      simple(r.htmlBg, l.htmlBg, "htmlBg");
      simple(r.bodyBg, l.bodyBg, "bodyBg");
      simple(r.bgOwner && r.bgOwner.bg, l.bgOwner && l.bgOwner.bg, "bgOwner.bg");
      simple(r.pCount, l.pCount, "pCount");
      simple(r.inline, l.inline, "inline");
      simple(r.titleText, l.titleText, "titleText");
      for (const k of KEYS) {
        const a = r[k] || {};
        const b = l[k] || {};
        for (const prop of Object.keys(a)) {
          if (JSON.stringify(a[prop]) !== JSON.stringify(b[prop])) diffs.push(`  ${k}.${prop}: ref=${JSON.stringify(a[prop])} loc=${JSON.stringify(b[prop])}`);
        }
      }
      diffs.push(`  titleRect: ref=${JSON.stringify(r.titleRect)} loc=${JSON.stringify(l.titleRect)}`);
      diffs.push(`  colRect:   ref=${JSON.stringify(r.colRect)} loc=${JSON.stringify(l.colRect)}`);
      diffs.push(`  proseRect: ref=${JSON.stringify(r.proseRect)} loc=${JSON.stringify(l.proseRect)}`);
      diffs.push(`  docH: ref=${r.docH} loc=${l.docH}`);
    }
    console.log("\n=== " + key + " ===");
    for (const d of diffs) console.log(d);
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
