import fs from "node:fs";

const CDP = "http://127.0.0.1:9228";

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

const REF = `(() => {
  const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return { y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), pad: s.padding, bg: s.backgroundColor, mar: s.margin }; };
  const footer = document.querySelector("#footer, .footer, footer");
  const kids = footer ? [...footer.children].map((el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return { cls: (el.className || "").toString().split(" ").slice(0, 2).join("."), tag: el.tagName.toLowerCase(),
      h: Math.round(r.height), y: Math.round(r.top), pad: s.padding, mar: s.margin };
  }) : [];
  return {
    title: rect(".page-title"),
    crumb: rect(".breadcrumb"),
    header: rect("#header, header"),
    topbar: rect("#top-bar, .top-bar, .switcher"),
    footer: rect("#footer, .footer, footer"),
    footerKids: kids.slice(0, 12),
    docH: document.documentElement.scrollHeight,
  };
})()`;

const LOC = `(() => {
  const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null;
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return { y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), pad: s.padding, bg: s.backgroundColor, mar: s.margin }; };
  const footer = document.querySelector("footer.fl-footer");
  const kids = footer ? [...footer.children].map((el) => {
    const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return { cls: (el.className || "").toString().split(" ").slice(0, 2).join("."), tag: el.tagName.toLowerCase(),
      h: Math.round(r.height), y: Math.round(r.top), pad: s.padding, mar: s.margin };
  }) : [];
  const inner = footer ? [...footer.querySelector(".fl-container").children].map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: (el.className || "").toString().split(" ").slice(0, 2).join("."), h: Math.round(r.height) };
  }) : [];
  return {
    title: rect(".fl-page__title"),
    head: rect(".fl-page__head"),
    header: rect(".fl-header"),
    topbar: rect(".fl-topbar"),
    footer: rect("footer.fl-footer"),
    footerKids: inner,
    docH: document.documentElement.scrollHeight,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;

  for (const w of [390]) {
    await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 });
    await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/cookie-policy" });
    await new Promise((r) => setTimeout(r, 7000));
    const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF, returnByValue: true })).result.value;

    await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/cookie-policy" });
    await new Promise((r) => setTimeout(r, 4500));
    const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value;

    console.log("\n########## width " + w + " ##########");
    console.log("REF", JSON.stringify(ref, null, 1));
    console.log("LOC", JSON.stringify(loc, null, 1));
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });

