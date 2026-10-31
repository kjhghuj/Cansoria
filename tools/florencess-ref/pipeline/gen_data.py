import json, os, re, shutil
base = r'H:\Cansoria\frontend\public\florencess'
fonts = os.path.join(base,'fonts')
css = open(os.path.join(fonts,'google.css'), encoding='utf-8').read()
blocks = re.findall(r'@font-face\s*\{(.*?)\}', css, re.S)
out=[]
seen=set()
for b in blocks:
    fam = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    wt  = re.search(r'font-weight:\s*(\d+)', b).group(1)
    url = re.search(r'url\((https://[^)]+)\)', b).group(1)
    ur  = re.search(r'unicode-range:\s*([^;]+);', b)
    urange = ur.group(1).strip() if ur else ''
    if 'U+0000-00FF' not in urange:   # keep latin only
        continue
    fn = url.split('/')[-1]
    key=(fam,wt)
    if key in seen: continue
    seen.add(key)
    src=os.path.join(fonts,fn)
    if not os.path.exists(src) or os.path.getsize(src)<500:
        continue
    dst=os.path.join(fonts, f"{fam.lower().replace(' ','-')}-{wt}.woff2")
    if src!=dst: shutil.copyfile(src,dst)
    out.append((fam,wt,os.path.basename(dst)))

print('LATIN FACES', out)
lines=['/* FLORENCESS local fonts (self-hosted, latin subset) */']
for fam,wt,fn in out:
    w = '300 600' if fam=='Jost' else wt
    lines.append(f"""@font-face{{
  font-family:'{fam}';
  font-style:normal;
  font-weight:{w};
  font-display:swap;
  src:url('/florencess/fonts/{fn}') format('woff2');
}}""")
open(r'H:\Cansoria\frontend\src\app\florencess-fonts.css','w',encoding='utf-8').write('\n'.join(lines)+'\n')

# product data
prods=json.load(open(r'H:\Cansoria\frontend_ref\products.json',encoding='utf-8'))
items=[]
for i,p in enumerate(prods,1):
    cands=[f'p{i:02d}a.webp', f'p{i:02d}b.webp']
    img=None
    for c in cands:
        fp=os.path.join(base,'img',c)
        if os.path.exists(fp) and os.path.getsize(fp)>500:
            img=c; break
    items.append({
        'id': p['id'] or f'fp-{i}',
        'name': p['name'],
        'price': p['price'] or '$0.00',
        'oldPrice': p['old'] or '',
        'discount': p['discount'] or '',
        'image': f'/florencess/img/{img}' if img else '',
        'href': '/shop',
    })
# dedupe by name+price
uniq=[]; seenk=set()
for it in items:
    k=(it['name'],it['price'])
    if k in seenk: continue
    seenk.add(k); uniq.append(it)
print('PRODUCTS', len(uniq), 'with image', sum(1 for x in uniq if x['image']))
lines=['export interface FlorencessProduct {','  id: string;','  name: string;','  price: string;','  oldPrice: string;','  discount: string;','  image: string;','  href: string;','}','','export const FLORENCESS_PRODUCTS: FlorencessProduct[] = [']
for it in uniq:
    lines.append('  ' + json.dumps(it, ensure_ascii=False) + ',')
lines.append('];')
open(r'H:\Cansoria\frontend\src\lib\florencess-products.ts','w',encoding='utf-8').write('\n'.join(lines)+'\n')
print('wrote florencess-products.ts')
