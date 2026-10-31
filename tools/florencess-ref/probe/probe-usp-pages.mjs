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

const CHECK = `(() => {
  const usp = document.querySelector(".grid-row-top-22");
  const bar = document.querySelector(".fl-usp__row, .fl-usp");
  const notice = document.querySelector(".notice-module");
  const nl = notice ? (notice.textContent || "").replace(/\\s+/g, " ").trim() : null;
  return {
    url: location.href,
    hasUsp: !!usp,
    uspText: usp ? (usp.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120) : null,
    uspY: usp ? Math.round(usp.getBoundingClientRect().top) : null,
    hasLocalUsp: !!bar,
    localUspText: bar ? (bar.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120) : null,
    hasNotice: !!notice,
    noticeSnippet: nl ? nl.slice(0, 60) : null,
    title: document.title.slice(0, 60),
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const refPages = [
    "https://entntnt.com/",
    "https://entntnt.com/shop",
    "https://entntnt.com/index.php?route=product/category&path=59",
    "https://entntnt.com/about-us",
  ];
  for (const u of refPages) {
    await rpc(ws, ++id, "Page.navigate", { url: u });
    await new Promise((r) => setTimeout(r, 7000));
    const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: CHECK, returnByValue: true })).result.value;
    console.log("REF ", JSON.stringify(v));
  }

  const locPages = [
    "http://localhost:3030/",
    "http://localhost:3030/shop",
    "http://localhost:3030/about-us",
  ];
  for (const u of locPages) {
    await rpc(ws, ++id, "Page.navigate", { url: u });
    await new Promise((r) => setTimeout(r, 4500));
    const v = (await rpc(ws, ++id, "Runtime.evaluate", { expression: CHECK, returnByValue: true })).result.value;
    console.log("LOC ", JSON.stringify(v));
  }
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
