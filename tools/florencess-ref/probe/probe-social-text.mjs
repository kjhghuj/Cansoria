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

const TXT = `(() => {
  const row = document.querySelector(".grid-row-top-34");
  if (!row) return { missing: true };
  const out = [];
  for (const el of row.querySelectorAll("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    if (!own) continue;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    out.push({ t: el.tagName.toLowerCase(),
      txt: own.slice(0, 46), x: Math.round(r.left), y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height),
      fs: s.fontSize, fw: s.fontWeight, ls: s.letterSpacing, tt: s.textTransform,
      color: s.color, ta: s.textAlign, lh: s.lineHeight, ff: s.fontFamily.split(",")[0] });
  }
  // background of each half
  const halves = [...row.querySelectorAll(":scope .grid-col")].map((k) => {
    const s = getComputedStyle(k);
    const img = k.querySelector("img");
    return { w: Math.round(k.getBoundingClientRect().width), h: Math.round(k.getBoundingClientRect().height),
      bg: s.backgroundColor, bgImg: s.backgroundImage.slice(0, 80),
      imgTag: img ? { w: Math.round(img.getBoundingClientRect().width), h: Math.round(img.getBoundingClientRect().height), src: (img.currentSrc||img.src).split("/").pop() } : null };
  });
  return { texts: out, halves };
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
  const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: TXT, returnByValue: true })).result.value;
  console.log("HALVES:", JSON.stringify(v.halves, null, 1));
  console.log("\nTEXTS:");
  for (const t of v.texts) console.log(`  ${String(t.y).padStart(5)} x=${String(t.x).padStart(4)} ${t.txt.padEnd(44)} fs=${t.fs} fw=${t.fw} ls=${t.ls} tt=${t.tt} color=${t.color} ta=${t.ta} lh=${t.lh} ff=${t.ff}`);
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
