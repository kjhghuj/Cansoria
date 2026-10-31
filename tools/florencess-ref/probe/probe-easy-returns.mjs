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

const FIND = `(() => {
  const hits = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.children.length > 2) continue;
    const t = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (!t || t.length > 120) continue;
    if (/easy\\s*return|return/i.test(t)) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const s = getComputedStyle(el);
      hits.push({
        t: el.tagName.toLowerCase() + "." + (el.className || "").toString().split(" ").filter(Boolean).slice(0, 2).join("."),
        txt: t, y: Math.round(r.top), h: Math.round(r.height),
        fs: s.fontSize, fw: s.fontWeight, ls: s.letterSpacing, tt: s.textTransform, color: s.color,
      });
    }
    if (hits.length > 24) break;
  }
  return hits;
})()`;

const HEADERBAR = `(() => {
  const bar = document.querySelector("header .top-bar") || document.querySelector(".top-bar");
  if (!bar) return { missing: true };
  const r = bar.getBoundingClientRect();
  return {
    h: Math.round(r.height), w: Math.round(r.width), x: Math.round(r.left),
    html: bar.innerHTML.replace(/\\s+/g, " ").slice(0, 1200),
    links: [...bar.querySelectorAll("a")].map((a) => ({
      txt: (a.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40),
      href: a.getAttribute("href"),
      fs: getComputedStyle(a).fontSize,
    })),
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

  console.log("HEADER TOP-BAR:\n" + JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: HEADERBAR, returnByValue: true })).result.value, null, 1));
  console.log("\nRETURN HITS:\n" + JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: FIND, returnByValue: true })).result.value, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
