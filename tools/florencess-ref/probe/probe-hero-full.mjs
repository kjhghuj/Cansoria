const CDP="http://127.0.0.1:9225";
function conn(u){return new Promise((r,j)=>{const w=new WebSocket(u);w.onopen=()=>r(w);w.onerror=()=>j(new Error("ws"));});}
function rpc(ws,id,m,p={}){return new Promise((r,j)=>{const h=(e)=>{const x=JSON.parse(e.data);if(x.id===id){ws.removeEventListener('message',h);x.error?j(new Error(JSON.stringify(x.error))):r(x.result);}};ws.addEventListener('message',h);ws.send(JSON.stringify({id,method:m,params:p}));});}
const EXPR=`(()=>{
 const mod=document.querySelector('.module-master_slider');
 const R=(e)=>{if(!e)return null;const r=e.getBoundingClientRect();const s=getComputedStyle(e);
  return {tag:e.tagName,cls:(e.className||'').toString().slice(0,60),x:Math.round(r.left),y:Math.round(r.top),w:+r.width.toFixed(1),h:+r.height.toFixed(1),
   fs:s.fontSize,ff:s.fontFamily.split(',')[0],fw:s.fontWeight,ls:s.letterSpacing,lh:s.lineHeight,tt:s.textTransform,color:s.color,bg:s.backgroundColor,
   pos:s.position,ta:s.textAlign,pad:s.padding,disp:s.display,op:s.opacity,z:s.zIndex};
 };
 const slider=mod.querySelector('.ms-slider, .master-slider');
 const viewport=mod.querySelector('.ms-view, .ms-container');
 const slides=[...mod.querySelectorAll('.ms-slide')];
 const active=mod.querySelector('.ms-slide-active, .ms-slide.ms-slide-active');
 const img=active?active.querySelector('img'):null;
 const layers=[...mod.querySelectorAll('.ms-layer, .ms-parallax-layer > *')].filter(e=>e.textContent.trim()).map(e=>({txt:e.textContent.trim().slice(0,40),...R(e)}));
 const links=[...mod.querySelectorAll('a')].map(a=>({href:(a.getAttribute('href')||'').slice(0,40),txt:a.textContent.trim().slice(0,20),...R(a)}));
 const pag=[...mod.querySelectorAll('.swiper-pagination, .ms-nav, .ms-bullets, .swiper-button-next, .swiper-button-prev')].map(e=>({cls:e.className.slice(0,50),...R(e)}));
 return {mod:R(mod), slider:R(slider), viewport:R(viewport),
   slideCount:slides.length,
   slides:slides.map(s=>({cls:s.className.slice(0,60),...R(s)})),
   activeImg:img?{...R(img),src:(img.getAttribute('src')||'').split('/').pop().slice(0,30),nat:[img.naturalWidth,img.naturalHeight]}:null,
   layers:layers.slice(0,12), links:links.slice(0,8), pagination:pag};
})()`;
(async()=>{const t=await(await fetch(CDP+"/json/list")).json();const p=t.find(x=>x.type==="page");const ws=await conn(p.webSocketDebuggerUrl);
await rpc(ws,1,"Emulation.setDeviceMetricsOverride",{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await rpc(ws,2,"Page.navigate",{url:"https://entntnt.com/"});await new Promise(r=>setTimeout(r,9000));
const o=await rpc(ws,3,"Runtime.evaluate",{expression:EXPR,returnByValue:true});console.log(JSON.stringify(o.result.value,null,1));ws.close();})().catch(e=>{console.error("FAIL",e.message);process.exit(1);});
