// Browser-level interactions are exercised by capture_browser_scenario; this
// helper checks only deterministic server-observable contracts without login.
const base=process.env.FL_LOCAL_ORIGIN||'http://127.0.0.1:3031';
const cases=[
 ['/bags-all?sort=price-asc&limit=25&page=2',/\bBags\b/i],
 ['/search?q=hobo&category=bags-all',/\bAccordo Hobo\b/i],
 ['/special?sort=price-desc&limit=100',/Special Offers/i],
 ['/brand-adidas',/no products/i],
 ['/account/login?returnTo=%2Faccount%3Ftab%3Dorders',/Account Login/i],
];
let problems=0;
for(const [path,pattern] of cases){const response=await fetch(base+path);const html=await response.text();const ok=response.status===200&&pattern.test(html);if(!ok)problems++;console.log(`${ok?'OK':'ERR'} ${response.status} ${path}`)}
if(problems)process.exitCode=1;
