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

const LOC = `(() => {
  const rows = [...document.querySelectorAll(".fl-root > *")].map((k) => {
    const r = k.getBoundingClientRect();
    return { cls: (k.className || "").toString().split(" ").slice(0, 2).join("."),
      y: Math.round(r.top + window.scrollY), h: Math.round(r.height),
      img: k.querySelectorAll("img").length,
      txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 44) };
  }).filter((r) => r.h > 10);
  const root = document.querySelector(".fl-root");
  const rr = root.getBoundingClientRect();
  const mosaic = [...document.querySelectorAll(".fl-mosaic > *")].map((k) => {
    const r = k.getBoundingClientRect();
    return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height),
      wide: k.className.toString().includes("--wide"),
      txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 30) };
  });
  const usp = document.querySelector(".fl-usp");
  const uspRow = document.querySelector(".fl-usp__row");
  const items = [...document.querySelectorAll(".fl-usp__item")].map((k) => {
    const r = k.getBoundingClientRect();
    const s = getComputedStyle(k);
    return { x: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), fs: s.fontSize, color: s.color, lh: s.lineHeight, ls: s.letterSpacing, tt: s.textTransform };
  });
  const sn = document.querySelector(".fl-sn");
  const snr = sn ? sn.getBoundingClientRect() : null;
  const halves = [...document.querySelectorAll(".fl-sn__half")].map((k) => {
    const r = k.getBoundingClientRect();
    const bg = k.querySelector("img");
    const br = bg ? bg.getBoundingClientRect() : null;
    return { w: Math.round(r.width), h: Math.round(r.height), bgW: br ? Math.round(br.width) : null, bgH: br ? Math.round(br.height) : null };
  });
  const title = document.querySelector(".fl-section__title");
  const ts = title ? getComputedStyle(title) : null;
  const head = document.querySelector(".fl-section__head");
  return {
    rootH: Math.round(rr.height), rows, mosaic, items,
    usp: usp ? { h: Math.round(usp.getBoundingClientRect().height), rowH: uspRow ? Math.round(uspRow.getBoundingClientRect().height) : null } : null,
    sn: snr ? { h: Math.round(snr.height), halves } : null,
    titleStyle: ts ? { fs: ts.fontSize, fw: ts.fontWeight, ls: ts.letterSpacing, tt: ts.textTransform, ta: ts.textAlign } : null,
    headH: head ? Math.round(head.getBoundingClientRect().height) : null,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 6000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight);1" });
  await new Promise((r) => setTimeout(r, 3000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1500));
  const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value;
  console.log(JSON.stringify(v, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
