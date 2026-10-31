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

const REF_ROWS = `(() => {
  const rows = [...document.querySelectorAll("footer .grid-rows > *")].filter((el) => el.getBoundingClientRect().height > 0);
  return rows.map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { cls: el.className.toString().split(" ").slice(0, 2).join("."), h: Math.round(r.height),
      pad: s.padding, mar: s.margin, cols: s.gridTemplateColumns,
      txt: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40) };
  });
})()`;

const LOC_ROWS = `(() => {
  const footer = document.querySelector("footer.fl-footer");
  const kids = [...footer.querySelector(".fl-container").children];
  return kids.map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { cls: el.className.toString().split(" ").slice(0, 2).join("."), h: Math.round(r.height),
      pad: s.padding, mar: s.margin, cols: s.gridTemplateColumns,
      txt: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 40) };
  });
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;

  for (const w of [1440, 390]) {
    await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 });
    await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/cookie-policy" });
    await new Promise((r) => setTimeout(r, 7000));
    const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF_ROWS, returnByValue: true })).result.value;

    await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/cookie-policy" });
    await new Promise((r) => setTimeout(r, 4500));
    const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC_ROWS, returnByValue: true })).result.value;

    console.log("=== @" + w + " REF rows ===");
    for (const r of ref) console.log(`  ${r.cls.padEnd(42)} h=${String(r.h).padStart(4)} pad=${r.pad} mar=${r.mar}`);
    console.log("=== @" + w + " LOC rows ===");
    for (const r of loc) console.log(`  ${r.cls.padEnd(42)} h=${String(r.h).padStart(4)} pad=${r.pad} mar=${r.mar}`);
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
