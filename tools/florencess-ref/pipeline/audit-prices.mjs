import fs from 'node:fs';
const catalog=JSON.parse(fs.readFileSync('H:/Cansoria/frontend/src/data/florencess-catalog.json','utf8'));
const bad=catalog.products.filter(p=>!/^\$\d+(?:,\d{3})*(?:\.\d{2})?$/.test(p.price));
console.log(JSON.stringify({total:catalog.products.length,bad:bad.slice(0,20).map(p=>({slug:p.slug,price:p.price})),badCount:bad.length},null,2));
