const CDP="http://127.0.0.1:9226";
function conn(u){return new Promise((r,j)=>{const w=new WebSocket(u);w.onopen=()=>r(w);w.onerror=()=>j(new Error("ws"));});}
function rpc(ws,id,m,p={}){return new Promise((r,j)=>{const h=(e)=>{const x=JSON.parse(e.data);if(x.id===id){ws.removeEventListener('message',h);x.error?j(new Error(JSON.stringify(x.error))):r(x.result);}};ws.addEventListener("message",h);ws.send(JSON.stringify({id,method:m,params:p}));});}
const EXPR=`(()=>{const mod=document.querySelector('.notice-module');const s=getComputedStyle(mod);
 const slider=mod.querySelector('.marquee-slider');const ss=getComputedStyle(slider);
 const items=mod.querySelector('.marquee-items');const it=getComputedStyle(items);
 const first=items.querySelector('span');const fs=getComputedStyle(first);const after=getComputedStyle(first,'::after');
 const before=getComputedStyle(first,'::before');
 return {mod:{h:getComputedStyle(mod).height,bb:s.borderBottomWidth+' '+s.borderBottomColor,
   bg:s.backgroundColor,pad:s.padding,margin:s.margin},
  slider:{h:ss.height,overflow:ss.overflow,bg:ss.backgroundColor},
  items:{h:it.height,gap:it.gap,display:it.display,colGap:it.columnGap},
  span:{fs:fs.fontSize,lh:fs.lineHeight,fw:fs.fontWeight,mr:fs.marginRight,ml:fs.marginLeft,pad:fs.padding,
   afterContent:after.content,afterW:after.width,afterMargin:after.marginLeft+' / '+after.marginRight,
   beforeContent:before.content}};})()`;
(async()=>{const t=await(await fetch(CDP+"/json/list")).json();const p=t.find(x=>x.type==="page");const ws=await conn(p.webSocketDebuggerUrl);
const o=(await rpc(ws,1,"Runtime.evaluate",{expression:EXPR,returnByValue:true})).result.value;console.log(JSON.stringify(o,null,1));
// measure speed
const g=await rpc(ws,2,"Runtime.evaluate",{expression:"(()=>{const e=document.querySelector('.marquee-slider');return new DOMMatrixReadOnly(getComputedStyle(e).transform).m41;})()",returnByValue:true});
await new Promise(r=>setTimeout(r,3000));
const h=await rpc(ws,3,"Runtime.evaluate",{expression:"(()=>{const e=document.querySelector('.marquee-slider');return new DOMMatrixReadOnly(getComputedStyle(e).transform).m41;})()",returnByValue:true});
console.log("speed px/s", Math.abs((h.result.value-g.result.value)/3).toFixed(2));
ws.close();})().catch(e=>{console.error("FAIL",e.message);process.exit(1);});
