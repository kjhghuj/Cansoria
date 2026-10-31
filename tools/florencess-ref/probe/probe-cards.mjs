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
  const row = document.querySelector(".grid-row-top-26");
  if (!row) return { missing: true };
  const card = row.querySelector(".product-layout");
  const all = [...row.querySelectorAll(".product-layout")];
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + window.scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  const img = card.querySelector("img");
  const name = card.querySelector(".caption a, h4 a, .name a");
  const price = card.querySelector(".price");
  const cardStyle = getComputedStyle(card);
  const imgStyle = img ? getComputedStyle(img) : null;
  const nameStyle = name ? getComputedStyle(name) : null;
  const priceStyle = price ? getComputedStyle(price) : null;
  return {
    rowH: Math.round(row.getBoundingClientRect().height),
    cardBox: r(card),
    cards: all.length,
    gaps: all.length > 1 ? Math.round(all[1].getBoundingClientRect().left - all[0].getBoundingClientRect().right) : null,
    cardPad: cardStyle.padding,
    img: img ? { ...r(img), oh: imgStyle.objectFit } : null,
    name: name ? { ...r(name), fs: nameStyle.fontSize, lh: nameStyle.lineHeight, fw: nameStyle.fontWeight, mt: nameStyle.marginTop, mb: nameStyle.marginBottom } : null,
    price: price ? { ...r(price), fs: priceStyle.fontSize, lh: priceStyle.lineHeight, mt: priceStyle.marginTop } : null,
    nameText: name ? name.textContent.trim() : null,
    priceText: price ? price.innerText.replace(/\\s+/g, " ").trim() : null,
  };
})()`;

const LOC = `(() => {
  const card = document.querySelector(".fl-card");
  if (!card) return { missing: true };
  const all = [...document.querySelectorAll(".fl-card")];
  const r = (e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top + window.scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
  const media = card.querySelector(".fl-card__media");
  const img = card.querySelector(".fl-card__img");
  const name = card.querySelector(".fl-card__name");
  const price = card.querySelector(".fl-card__price");
  const rail = document.querySelector(".fl-rail");
  const head = document.querySelector(".fl-section__head");
  return {
    sectionH: Math.round(document.querySelector(".fl-section").getBoundingClientRect().height),
    headH: Math.round(head.getBoundingClientRect().height),
    railH: Math.round(rail.getBoundingClientRect().height),
    cardBox: r(card),
    gaps: all.length > 1 ? Math.round(all[1].getBoundingClientRect().left - all[0].getBoundingClientRect().right) : null,
    media: media ? r(media) : null,
    img: img ? r(img) : null,
    name: name ? { ...r(name), fs: getComputedStyle(name).fontSize, lh: getComputedStyle(name).lineHeight } : null,
    price: price ? { ...r(price), fs: getComputedStyle(price).fontSize } : null,
  };
})()`;

(async () => {
  const targets = await (await fetch(CDP + "/json/list")).json();
  const target = targets.find((x) => x.type === "page");
  const ws = await conn(target.webSocketDebuggerUrl);
  let id = 0;
  await rpc(ws, ++id, "Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });

  await rpc(ws, ++id, "Page.navigate", { url: "https://entntnt.com/" });
  await new Promise((r) => setTimeout(r, 9000));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0, 1000);1" });
  await new Promise((r) => setTimeout(r, 2500));
  await rpc(ws, ++id, "Runtime.evaluate", { expression: "window.scrollTo(0,0);1" });
  await new Promise((r) => setTimeout(r, 1200));
  console.log("REF:", JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: REF, returnByValue: true })).result.value, null, 1));

  await rpc(ws, ++id, "Page.navigate", { url: "http://localhost:3030/" });
  await new Promise((r) => setTimeout(r, 6000));
  console.log("LOC:", JSON.stringify((await rpc(ws, ++id, "Runtime.evaluate", { expression: LOC, returnByValue: true })).result.value, null, 1));
  ws.close();
})().catch((e) => { console.error("FAIL", e.message); process.exit(1); });
