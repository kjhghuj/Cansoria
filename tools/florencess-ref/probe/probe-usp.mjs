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
  const row = document.querySelector(".grid-row-top-22");
  if (!row) return { missing: true };
  const r = row.getBoundingClientRect();
  const s = getComputedStyle(row);
  const items = [...row.querySelectorAll(".grid-item")].map((el) => {
    const ir = el.getBoundingClientRect();
    const t = (el.textContent || "").replace(/\\s+/g, " ").trim();
    const is = getComputedStyle(el);
    const link = el.querySelector("a");
    return { txt: t, w: Math.round(ir.width), h: Math.round(ir.height), x: Math.round(ir.left),
      fs: is.fontSize, fw: is.fontWeight, ls: is.letterSpacing, tt: is.textTransform, ta: is.textAlign,
      href: link ? link.getAttribute("href") : null,
      inner: el.innerHTML.replace(/\\s+/g, " ").slice(0, 220) };
  });
  const textEl = row.querySelector(".grid-item *") ;
  return {
    h: Math.round(r.height), y: Math.round(r.top),
    bg: s.backgroundColor, pad: s.padding, mar: s.margin,
    borderTop: s.borderTop, borderBottom: s.borderBottom,
    items,
    sample: textEl ? { fs: getComputedStyle(textEl).fontSize, fw: getComputedStyle(textEl).fontWeight,
      ls: getComputedStyle(textEl).letterSpacing, tt: getComputedStyle(textEl).textTransform,
      color: getComputedStyle(textEl).color, lh: getComputedStyle(textEl).lineHeight } : null,
  };
})()`;

const LOC = `(() => {
  const el = document.querySelector(".fl-usp__row") || document.querySelector(".fl-usp");
  const r = el ? el.getBoundingClientRect() : null;
  return {
    found: !!el,
    h: r ? Math.round(r.height) : null,
    y: r ? Math.round(r.top) : null,
    html: el ? el.innerHTML.replace(/\\s+/g, " ").slice(0, 700) : null,
    txt: el ? (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 200) : null,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/" });
  await new Promise((r) => setTimeout(r, 8000));
  const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF, returnByValue: true })).result.value;

  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 5000));
  const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value;

  console.log("REF USP:\n" + JSON.stringify(ref, null, 1));
  console.log("\nLOC USP:\n" + JSON.stringify(loc, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
