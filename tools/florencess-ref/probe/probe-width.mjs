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
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { w: Math.round(r.width), x: Math.round(r.left), fs: s.fontSize, maxW: s.maxWidth, pad: s.padding };
  };
  const p = document.querySelector(".post-content p");
  const pr = p ? p.getBoundingClientRect() : null;
  return {
    viewport: window.innerWidth,
    container: pick("#content .container") || pick(".container"),
    postDetail: pick(".post-detail"),
    postContent: pick(".post-content"),
    bagersPad: pick(".post-content .bagers-pad"),
    paragraph: pr ? { w: Math.round(pr.width), x: Math.round(pr.left) } : null,
  };
})()`;

const LOC = `(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { w: Math.round(r.width), x: Math.round(r.left), fs: s.fontSize, maxW: s.maxWidth, pad: s.padding };
  };
  const p = document.querySelector(".fl-page__prose p");
  const pr = p ? p.getBoundingClientRect() : null;
  return {
    viewport: window.innerWidth,
    wrapper: pick(".fl-page"),
    pageCol: pick(".fl-page__col"),
    prose: pick(".fl-page__prose"),
    paragraph: pr ? { w: Math.round(pr.width), x: Math.round(pr.left) } : null,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;

  for (const w of [1440, 1920, 2560]) {
    await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
    await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/shipping-policy" });
    await new Promise((r) => setTimeout(r, 7000));
    const ref = (await rpc(ws, ++id, "Runtime.evaluate", { expression: REF, returnByValue: true })).result.value;

    await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/shipping-policy" });
    await new Promise((r) => setTimeout(r, 4000));
    const loc = (await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value;

    console.log(`\n### viewport ${w}`);
    console.log("REF", JSON.stringify(ref));
    console.log("LOC", JSON.stringify(loc));
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
