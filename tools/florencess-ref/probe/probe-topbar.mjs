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

const TOP = `(() => {
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.top < 60 && r.height > 10 && r.height < 90 && r.width > 600) {
      const txt = (el.textContent || "").replace(/\\s+/g, " ").trim();
      if (!txt) continue;
      const key = el.tagName + "|" + (el.className || "").toString();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        t: el.tagName.toLowerCase() + "." + (el.className || "").toString().split(" ").filter(Boolean).slice(0, 3).join("."),
        y: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width),
        fs: getComputedStyle(el).fontSize,
        bg: getComputedStyle(el).backgroundColor,
        txt: txt.slice(0, 300),
        items: [...el.querySelectorAll("li,span,a")].map((k) => (k.textContent || "").replace(/\\s+/g, " ").trim()).filter((s) => s && s.length < 60).slice(0, 12),
      });
      if (out.length > 12) break;
    }
  }
  return out;
})()`;

const LOCAL_TOP = `(() => {
  const el = document.querySelector(".fl-topbar");
  if (!el) return { missing: true };
  const r = el.getBoundingClientRect();
  return {
    h: Math.round(r.height),
    bg: getComputedStyle(el).backgroundColor,
    fs: getComputedStyle(el).fontSize,
    txt: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 300),
    html: el.innerHTML.replace(/\\s+/g, " ").slice(0, 900),
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
  const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: TOP, returnByValue: true })).result.value;

  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 5000));
  const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOCAL_TOP, returnByValue: true })).result.value;

  console.log("REF TOP BARS:\n" + JSON.stringify(ref, null, 1));
  console.log("\nLOCAL TOPBAR:\n" + JSON.stringify(loc, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
