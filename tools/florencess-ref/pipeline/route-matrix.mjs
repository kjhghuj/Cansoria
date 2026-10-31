#!/usr/bin/env node
/** Reproducible, read-only route inventory. Optional --origin probes an existing LOCAL production server. */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const load = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
const homeStatus = await load('tools/florencess-ref/data/ref-page-status.json');
const extras = await load('tools/florencess-ref/data/ref-extra-routes.json');
const homePaths = new Set(homeStatus.map(x => x.path));
const status = [...homeStatus, ...extras.filter(x => x.live && !homePaths.has(x.path)).map(x => ({ ...x, finalUrl: x.path }))];
const catalog = await load('frontend/src/data/florencess-catalog.json');
const content = await load('frontend/src/data/florencess-content.json');
const legacy = await load('frontend/src/data/florencess-legacy-map.json');
const proxy = await readFile(path.join(root, 'frontend/src/proxy.ts'), 'utf8');
const app = path.join(root, 'frontend/src/app');
const args = process.argv.slice(2);
const option = key => { const n = args.indexOf(key); return n === -1 ? null : args[n + 1] ?? null; };
const originArg = option('--origin');
const output = option('--output');
if (args.some(x => !['--origin', '--output'].includes(x) && x !== originArg && x !== output)) throw Error('Usage: node route-matrix.mjs [--origin http://127.0.0.1:3031] [--output report.md]');
if (status.length !== 83 || new Set(status.map(x => x.path)).size !== 83) throw Error('Reference inventory must contain exactly 83 distinct paths');
let origin;
if (originArg) {
  origin = new URL(originArg);
  if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) throw Error('--origin must be a plain HTTP loopback origin');
}
const categories = new Map(catalog.categories.map(x => [x.slug, x]));
const products = new Map(catalog.products.map(x => [x.slug, x]));
const staticPages = new Set((await readdir(app, { withFileTypes: true })).filter(x => x.isDirectory()).map(x => x.name).filter(x => !x.startsWith('[')));
const articleSlugs = new Set(Object.keys(content.articles));
const brandSlugs = new Set(content.brands.groups.flatMap(x => x.items.map(item => item.slug)));
const proxyRoutes = Object.fromEntries([...proxy.matchAll(/^\s*"([\w/]+)": "(\/[^\"]*)",?\s*$/gm)].map(x => [x[1], x[2]]));
const wishlistBranch = /if\s*\(route\s*===\s*["']account\/wishlist["']\)\s*\{([\s\S]*?)\n\s*\}/.exec(proxy)?.[1] ?? '';
const wishlistTarget = /target\.pathname\s*=\s*["'](\/[^"']+)["']/.exec(wishlistBranch)?.[1];
const wishlistReturnTo = /target\.searchParams\.set\(\s*["']returnTo["']\s*,\s*["']([^"']+)["']/.exec(wishlistBranch)?.[1];
const wishlistStatus = /NextResponse\.redirect\(target,\s*(\d+)\)/.exec(wishlistBranch)?.[1];
const accountTargets = new Map([['/login.html','/account/login'], ['/my-account.html','/account/login'], ['/address-book.html','/account/login'], ['/account-voucher.html','/account/login'], ['/order-history.html','/account/login'], ['/wishlist.html','/account/login']]);
function classify(ref) {
  const url = new URL(ref.path, 'http://ref.invalid');
  const slug = decodeURIComponent(url.pathname.slice(1));
  if (url.pathname === '/') return { kind: 'home', target: '/', source: 'app/page.tsx' };
  if (accountTargets.has(url.pathname)) return { kind: 'account-alias', target: accountTargets.get(url.pathname), source: 'proxy.ts', redirect: 302 };
  if (url.pathname === '/index.php' || url.pathname === '/index.html') {
    const route = url.searchParams.get('route');
    const target = route === 'product/category' ? legacy.categories[url.searchParams.get('path')] : route === 'product/product' ? legacy.products[url.searchParams.get('product_id')] : null;
    const specialWishlist = route === 'account/wishlist' && wishlistTarget && wishlistReturnTo === '/account?unsupported=wishlist' && wishlistStatus === '302';
    const destination = specialWishlist ? wishlistTarget : target ? '/' + target : proxyRoutes[route];
    return { kind: destination ? 'proxy' : 'unmapped-proxy', target: destination || null, source: 'proxy.ts', redirect: destination ? specialWishlist ? 302 : 308 : null };
  }
  if (staticPages.has(slug)) return { kind: 'static', target: url.pathname, source: `app/${slug}/page.tsx` };
  if (categories.has(slug)) return { kind: 'category', target: url.pathname, source: 'app/[slug]/page.tsx', captured: `${categories.get(slug).pagesCaptured}/${categories.get(slug).pageCount} pages` };
  if (products.has(slug)) return { kind: 'product', target: url.pathname, source: 'app/[slug]/page.tsx', captured: products.get(slug).pageCaptured ? 'detail captured' : 'detail missing' };
  if (articleSlugs.has(slug)) return { kind: 'article', target: url.pathname, source: 'app/[slug]/page.tsx' };
  if (brandSlugs.has(slug)) return { kind: 'brand', target: url.pathname, source: 'app/[slug]/page.tsx' };
  return { kind: 'unmapped', target: null, source: null };
}
const rows = status.map(ref => ({ reference: ref.path, referenceFinal: ref.finalUrl, referenceFollowedStatus: ref.status, ...classify(ref) }));
async function probe(row) {
  const hops = [];
  let url = new URL(row.reference, origin);
  for (let index = 0; index < 6; index++) {
    if (url.origin !== origin.origin) return { hops, error: 'cross-origin redirect blocked' };
    let response;
    try { response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { 'Accept': 'text/html' } }); }
    catch (error) { return { hops, error: String(error) }; }
    const location = response.headers.get('location');
    hops.push({ path: url.pathname + url.search, status: response.status, location });
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? '';
    const notFound = /404: This page could not be found|NEXT_NOT_FOUND/.test(html);
    return { hops, final: url.pathname + url.search, finalStatus: response.status, title, notFound };
  }
  return { hops, error: 'redirect hop limit exceeded' };
}
if (origin) {
  // Serial requests keep resource usage predictable and preserve inventory ordering.
  for (const row of rows) row.observed = await probe(row);
}
const countBy = key => Object.fromEntries([...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]));
const mismatches = rows.filter(row => row.kind.startsWith('unmapped') || row.observed && (row.observed.error || row.observed.hops[0]?.status !== (row.redirect ?? 200) || row.observed.finalStatus !== 200 || row.observed.notFound || new URL(row.observed.final, origin).pathname !== row.target || row.redirect === 302 && (!new URL(row.observed.final, origin).searchParams.has('returnTo') || row.reference.includes('account/wishlist') && new URL(row.observed.final, origin).searchParams.get('returnTo') !== '/account?unsupported=wishlist')));
const text = [
  '# FLORENCESS route matrix',
  '',
  `Inventory: ${rows.length} unique reference entries; route kinds: ${JSON.stringify(countBy('kind'))}.`,
  `Mode: ${origin ? `HTTP against pre-confirmed ${origin.origin}, redirects followed manually (max 6), no external redirects` : 'static only; no server requests'}.`,
  'Inputs: 75 rows from `ref-page-status.json` plus eight live nonduplicate rows from `ref-extra-routes.json`. Reference `status` is a *followed* historical result; first-hop reference HTTP code is not recorded in these inputs.',
  `Static/unmapped or runtime mismatches: ${mismatches.length}.`,
  '',
  '| Reference | Ref final | Kind | Target | Static evidence | Capture | Local first hop | Local final | Local title / issue |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map(row => {
    const obs = row.observed;
    const clean = value => String(value ?? '—').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
    return `| ${[row.reference, row.referenceFinal, row.kind, row.target, row.source, row.captured, obs?.hops[0] ? `${obs.hops[0].status}${obs.hops[0].location ? ` → ${obs.hops[0].location}` : ''}` : null, obs?.final ? `${obs.finalStatus} ${obs.final}` : null, obs?.error ?? (obs ? `${obs.notFound ? '404 content; ' : ''}${obs.title}` : null)].map(clean).join(' | ')} |`;
  }),
  '',
  '## Flagged rows',
  ...mismatches.map(row => `- ${row.reference}: ${row.kind}; target ${row.target ?? 'unmapped'}; observed ${JSON.stringify(row.observed ?? null)}`),
  ...(mismatches.length ? [] : ['- None under the chosen check; content, interactions and reference first-hop fidelity still require separate tests.']),
  '',
].join('\n');
if (output) { await writeFile(path.resolve(output), text, 'utf8'); console.log(`Wrote ${output}`); }
else console.log(text);
if (mismatches.length) { console.error(`${mismatches.length} flagged route(s); inspect the matrix.`); process.exitCode = 1; }
