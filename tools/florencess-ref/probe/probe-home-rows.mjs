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
  const rows = [...document.querySelectorAll(".site-wrapper .grid-row")];
  return rows.map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className.replace(/grid-row\\s*/, "").split(" ")[0],
      y: Math.round(r.top + window.scrollY), h: Math.round(r.height),
      img: el.querySelectorAll("img").length,
      txt: (el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 60) };
  }).filter((r) => r.h > 10);
})()`;

const LOC_ROWS = `(() => {
  const main = document.querySelector("main.flex-grow") || document.querySelector("main");
  const first = document.querySelector(".fl-root");
  const chain = [];
  let el = first;
  while (el && el !== document.body) {
    const s = getComputedStyle(el);
    chain.push({ t: el.tagName.toLowerCase() + "." + (el.className || "").toString().split(" ")[0],
      pad: s.padding, mar: s.margin, y: Math.round(el.getBoundingClientRect().top) });
    el = el.parentElement;
  }
  const rows = [...document.querySelectorAll(".fl-root > *")].map((k) => {
    const r = k.getBoundingClientRect();
    return { cls: (k.className || "").toString().split(" ").slice(0, 2).join("."),
      y: Math.round(r.top + window.scrollY), h: Math.round(r.height),
      img: k.querySelectorAll("img").length,
      txt: (k.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 60) };
  }).filter((r) => r.h > 10);
  return { chain, rows };
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
  await new Promise((r) => setTimeout(r, 3000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1500));
  const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF_ROWS, returnByValue: true })).result.value;

  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 5000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight);1" });
  await new Promise((r) => setTimeout(r, 2500));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1200));
  const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC_ROWS, returnByValue: true })).result.value;

  console.log("=== REF ROWS (" + ref.length + ") ===");
  for (const r of ref) console.log(`  y=${String(r.y).padStart(5)} h=${String(r.h).padStart(4)} i=${String(r.img).padStart(2)} ${r.cls.slice(0, 22).padEnd(22)} ${r.txt.slice(0, 52)}`);
  console.log("\n=== LOC CHAIN ===");
  for (const c of loc.chain) console.log(`  ${c.t.padEnd(24)} y=${String(c.y).padStart(4)} pad=${c.pad} mar=${c.mar}`);
  console.log("\n=== LOC ROWS (" + loc.rows.length + ") ===");
  for (const r of loc.rows) console.log(`  y=${String(r.y).padStart(5)} h=${String(r.h).padStart(4)} i=${String(r.img).padStart(2)} ${r.cls.slice(0, 26).padEnd(26)} ${r.txt.slice(0, 52)}`);
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
