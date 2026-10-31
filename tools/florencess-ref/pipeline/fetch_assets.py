import json, os, re, urllib.request
base = r'H:\Cansoria\frontend\public\florencess'
os.makedirs(os.path.join(base,'img'), exist_ok=True)
os.makedirs(os.path.join(base,'fonts'), exist_ok=True)
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'}
def get(url, timeout=45):
    req=urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()

prods=json.load(open(r'H:\Cansoria\frontend_ref\products.json',encoding='utf-8'))
ok=fail=0
for i,p in enumerate(prods,1):
    for slot,u in (('a',p['img']),('b',p['img2'])):
        if not u: continue
        fn=f"img/p{i:02d}{slot}.webp"
        fp=os.path.join(base,fn)
        if os.path.exists(fp) and os.path.getsize(fp)>0: continue
        try:
            d=get(u); open(fp,'wb').write(d); ok+=1
        except Exception as e:
            fail+=1; print('FAIL', u, e)

banners={
 'hero-1':'https://entntnt.com/image/cache/catalog/JPG/847-1858x806w.jpg.webp',
 'hero-2':'https://entntnt.com/image/cache/catalog/JPG/936-2080x600w.jpg.webp',
 'hero-3':'https://entntnt.com/image/cache/catalog/JPG/937-2080x600.jpg.webp',
 'wide-1':'https://entntnt.com/image/cache/catalog/JPG/924-1260x604.jpg.webp',
 'cat-1':'https://entntnt.com/image/cache/catalog/JPG/846-471x414w.jpg.webp',
 'cat-2':'https://entntnt.com/image/cache/catalog/JPG/848-954x414w.jpg.webp',
 'cat-3':'https://entntnt.com/image/cache/catalog/JPG/926-471x414.jpg.webp',
 'cat-4':'https://entntnt.com/image/cache/catalog/JPG/927-471x414.jpg.webp',
 'cat-5':'https://entntnt.com/image/cache/catalog/JPG/929-954x414.jpg.webp',
 'cat-6':'https://entntnt.com/image/cache/catalog/JPG/930-471x414.jpg.webp',
 'cat-7':'https://entntnt.com/image/cache/catalog/JPG/931-471x414.jpg.webp',
 'cat-8':'https://entntnt.com/image/cache/catalog/JPG/932-471x414.jpg.webp',
}
for n,u in banners.items():
    fp=os.path.join(base,'img',n+'.webp')
    if os.path.exists(fp) and os.path.getsize(fp)>0: continue
    try:
        open(fp,'wb').write(get(u)); ok+=1
    except Exception as e:
        fail+=1; print('FAIL',n,e)
print('IMAGES OK',ok,'FAIL',fail)

# fonts
css_urls = {
 'jost':'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&display=swap',
 'alata':'https://fonts.googleapis.com/css2?family=Alata&display=swap',
 'montserrat':'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
 'homemade':'https://fonts.googleapis.com/css2?family=Homemade+Apple&display=swap',
}
allcss=[]
for k,u in css_urls.items():
    try:
        c=get(u).decode('utf-8')
        allcss.append(f'/* {k} */\n'+c)
    except Exception as e:
        print('FONTCSS FAIL',k,e)
css='\n'.join(allcss)
open(os.path.join(base,'fonts','google.css'),'w',encoding='utf-8').write(css)
urls=sorted(set(re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css)))
print('FONT FILES', len(urls))
for u in urls:
    name=u.split('/')[-1].split('?')[0]
    fam=[s for s in u.split('/') if s.startswith(('jost','alata','montserrat','homemadeapple','l','P','J','Q'))]
    fn=f"{k if False else ''}{name}"
    try:
        open(os.path.join(base,'fonts',fn),'wb').write(get(u))
    except Exception as e:
        print('FONT FAIL',u,e)
print('FONTS DONE')
