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

const MOSAIC = `(() => {
  const row = document.querySelector(".grid-row-top-28");
  const w = row ? row.querySelector(".grid-cols-wrapper") : null;
  const cs = w ? getComputedStyle(w) : null;
  const items = [...row.querySelectorAll(".grid-col")].map((k) => {
    const r = k.getBoundingClientRect();
    const inner = (k.innerText || "").replace(/\\s+/g, " ").trim();
    const img = k.querySelector("img");
    const ir = img ? img.getBoundingClientRect() : null;
    const st = getComputedStyle(k);
    return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
      y: Math.round(r.top + window.scrollY),
      pad: st.padding, txt: inner.slice(0, 40),
      imgSrc: img ? (img.currentSrc || img.src).split("/").pop() : null,
      imgW: ir ? Math.round(ir.width) : null, imgH: ir ? Math.round(ir.height) : null };
  });
  return { wrapper: cs ? { display: cs.display, cols: cs.gridTemplateColumns, gap: cs.gap, w: Math.round(w.getBoundingClientRect().width), pad: cs.padding } : null, items };
})()`;

const SOCIAL = `(() => {
  const row = document.querySelector(".grid-row-top-34");
  if (!row) return { missing: true };
  const r = row.getBoundingClientRect();
  const parts = [];
  const walk = (el, d) => {
    if (parts.length > 30 || d > 3) return;
    for (const k of el.children) {
      const kr = k.getBoundingClientRect();
      if (kr.height < 6) continue;
      const s = getComputedStyle(k);
      parts.push({ d, t: k.tagName.toLowerCase() + "." + (k.className || "").toString().split(" ").filter(Boolean).slice(0, 2).join("."),
        x: Math.round(kr.left), y: Math.round(kr.top + window.scrollY), w: Math.round(kr.width), h: Math.round(kr.height),
        fs: s.fontSize, ta: s.textAlign, txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 50) });
      walk(k, d + 1);
    }
  };
  walk(row, 0);
  return { h: Math.round(r.height), y: Math.round(r.top + window.scrollY), parts };
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

  console.log("MOSAIC:\n" + JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: MOSAIC, returnByValue: true })).result.value, null, 1));
  console.log("\nSOCIAL ROW:\n" + JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: SOCIAL, returnByValue: true })).result.value, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
