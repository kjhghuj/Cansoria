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

const CHK = `(() => {
  const doc = document.documentElement;
  const rows = [...document.querySelectorAll(".fl-root > *")].map((k) => {
    const r = k.getBoundingClientRect();
    if (r.height < 10) return null;
    return { cls: (k.className||"").toString().split(" ")[0], y: Math.round(r.top+window.scrollY), h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.left) };
  }).filter(Boolean);
  const sn = document.querySelector(".fl-sn");
  const snCols = sn ? getComputedStyle(sn).gridTemplateColumns : null;
  const halves = [...document.querySelectorAll(".fl-sn__half")].map((k) => Math.round(k.getBoundingClientRect().width) + "x" + Math.round(k.getBoundingClientRect().height));
  const tiles = [...document.querySelectorAll(".fl-tile")].slice(0, 4).map((k) => {
    const r = k.getBoundingClientRect();
    return Math.round(r.left) + "," + Math.round(r.width) + "x" + Math.round(r.height);
  });
  const uspItems = [...document.querySelectorAll(".fl-usp__item")].map((k) => Math.round(k.getBoundingClientRect().height));
  const cards = [...document.querySelectorAll(".fl-card")].slice(0, 3).map((k) => Math.round(k.getBoundingClientRect().width));
  return {
    scrollW: doc.scrollWidth, innerW: window.innerWidth,
    overflow: doc.scrollWidth - window.innerWidth,
    rows, snCols, halves, tiles, uspItems, cards,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 2, mobile: true });
  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 6000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight);1" });
  await new Promise((r) => setTimeout(r, 2500));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1200));
  const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: CHK, returnByValue: true })).result.value;
  console.log(JSON.stringify(v, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
