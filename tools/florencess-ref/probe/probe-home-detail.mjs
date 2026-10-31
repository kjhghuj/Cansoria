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
  const out = {};
  const grab = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), y: Math.round(r.top + window.scrollY), imgs: el.querySelectorAll("img").length,
      html: el.innerHTML.replace(/\\s+/g, " ").slice(0, 200) };
  };
  out.b24 = grab(".grid-row-top-24");
  out.b26 = grab(".grid-row-top-26");
  out.b28 = grab(".grid-row-top-28");
  out.b30 = grab(".grid-row-top-30");
  out.b32 = grab(".grid-row-top-32");
  out.b34 = grab(".grid-row-top-34");

  // products inside each shelf
  const shelf = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cards = [...el.querySelectorAll(".product-layout, .product-thumb, .product-grid-item")];
    return {
      count: cards.length,
      names: cards.map((c) => {
        const n = c.querySelector(".caption a, .name a, h4 a, .product-name a");
        return n ? n.textContent.replace(/\\s+/g, " ").trim() : null;
      }).filter(Boolean).slice(0, 30),
      imgsPerCard: cards.length ? cards[0].querySelectorAll("img").length : 0,
    };
  };
  out.shelf26 = shelf(".grid-row-top-26");
  out.shelf32 = shelf(".grid-row-top-32");

  // heading row text/style
  const head = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const t = el.querySelector("h1,h2,h3,h4,.title,span");
    const s = t ? getComputedStyle(t) : null;
    return { txt: (el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 80),
      fs: s ? s.fontSize : null, fw: s ? s.fontWeight : null, ls: s ? s.letterSpacing : null,
      tt: s ? s.textTransform : null, ta: s ? s.textAlign : null };
  };
  out.head24 = head(".grid-row-top-24");
  out.head30 = head(".grid-row-top-30");

  // category mosaic
  const mosaic = document.querySelector(".grid-row-top-28");
  if (mosaic) {
    out.mosaicChildren = [...mosaic.querySelectorAll(".grid-item, .grid-col")].map((k) => {
      const r = k.getBoundingClientRect();
      return { cls: (k.className || "").toString().split(" ").filter((c) => /grid-col|item/.test(c))[0],
        w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.top + window.scrollY),
        imgs: k.querySelectorAll("img").length,
        txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 40) };
    }).filter((k) => k.h > 10);
  }

  // social block
  const soc = document.querySelector(".grid-row-top-34");
  if (soc) {
    out.social = {
      imgs: [...soc.querySelectorAll("img")].map((i) => ({ w: Math.round(i.getBoundingClientRect().width), src: (i.currentSrc || i.src || "").split("/").pop() })),
      txt: (soc.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 160),
    };
  }
  return out;
})()`;

const LOC = `(() => {
  const out = {};
  const sec = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { h: Math.round(r.height), y: Math.round(r.top + window.scrollY), imgs: el.querySelectorAll("img").length,
      cards: el.querySelectorAll(".fl-card").length,
      txt: (el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120) };
  };
  out.usp = sec(".fl-usp");
  out.sale = sec(".fl-section");
  out.mosaic = sec(".fl-container");
  out.also = sec(".fl-section--tight");
  out.social = sec(".fl-social");
  out.news = sec(".fl-news");
  out.mosaicKids = [...document.querySelectorAll(".fl-mosaic > *")].map((k) => {
    const r = k.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), imgs: k.querySelectorAll("img").length,
      txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 30) };
  }));
  return out;
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
  await new Promise((r) => setTimeout(r, 3500));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1500));
  const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF, returnByValue: true })).result.value;
  console.log("REF:\n" + JSON.stringify(ref, null, 1));

  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 5000));
  const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value;
  console.log("\nLOC:\n" + JSON.stringify(loc, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
