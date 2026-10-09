/* Executes real React components/hooks in Chromium; only Turnstile and API calls are mocked. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const os = require('node:os');

const frontend = path.resolve(__dirname, '../..');
const swc = require(path.join(frontend, '../backend/node_modules/@swc/core'));
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);
const baseURL = process.env.FOOTER_TEST_URL || 'http://localhost:3032';
const report = { baseURL, mockOnly: true, checks: [], failures: [], screenshots: [] };

function bundle(configured = true, instances = 1, fullFooter = false) {
  const modules = {};
  for (const [id, file] of Object.entries({
    react: 'react/cjs/react.development.js',
    'react/jsx-runtime': 'react/cjs/react-jsx-runtime.development.js',
    'react-dom': 'react-dom/cjs/react-dom.development.js',
    'react-dom/client': 'react-dom/cjs/react-dom-client.development.js',
    scheduler: 'scheduler/cjs/scheduler.development.js',
  })) modules[id] = fs.readFileSync(path.join(frontend, 'node_modules', file), 'utf8');
  for (const [id, file] of Object.entries({
    '@/hooks/useNewsletter': 'src/hooks/useNewsletter.ts',
    newsletter: 'src/components/Newsletter.tsx',
    footer: 'src/components/Footer.tsx',
    './BrandLogo': 'src/components/BrandLogo.tsx',
    '@/lib/constants': 'src/lib/constants.ts',
    './studio-content': 'src/lib/studio-content.ts',
  })) modules[id] = swc.transformSync(fs.readFileSync(path.join(frontend, file), 'utf8'), {
    filename: file,
    jsc: { parser: { syntax: 'typescript', tsx: true }, target: 'es2020', transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  }).code;
  modules['next/link'] = `module.exports = function Link(props) { const {children,...rest}=props;return require('react').createElement('a',rest,children); };`;
  modules['./Newsletter'] = `module.exports=require('newsletter');`;
  modules['next/image'] = `module.exports = function Image(props) { const {priority,unoptimized,...rest}=props;return require('react').createElement('img',rest); };`;
  modules['@marsidev/react-turnstile'] = `
    const React = require('react');
    exports.Turnstile = React.forwardRef(function MockChallenge(props, ref) {
      React.useImperativeHandle(ref, () => ({ reset: () => { window.challengeResets++; } }));
      window.challenge = props;
      return React.createElement('div', {'data-testid':'mock-turnstile',style:{width:props.options.size==='compact'?150:'100%',minWidth:props.options.size==='compact'?150:300,height:props.options.size==='compact'?140:65}}, 'Mock security check');
    });`;
  return `(() => {
    const process={env:{NODE_ENV:'development',NEXT_PUBLIC_TURNSTILE_SITE_KEY:${JSON.stringify(configured ? 'test-site-key' : '')}}};
    const factories={${Object.entries(modules).map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`).join(',')}};
    const cache={};function require(id){if(cache[id])return cache[id].exports;if(!factories[id])throw Error('Missing module '+id);const module={exports:{}};cache[id]=module;factories[id](module,module.exports,require);return module.exports;}
    window.challengeResets=0;window.requests=[];window.responseStatus=200;window.responseMessage='Provider request rejected';
    window.fetch=(url,options)=>{window.requests.push({url,options});return new Promise((resolve,reject)=>{
      window.finishRequest=()=>window.networkFailure ? reject(new TypeError('Failed to fetch')) : resolve({ok:window.responseStatus===200,status:window.responseStatus,json:async()=>({message:window.responseMessage,discount_code:'DO_NOT_SHOW'})});
    });};
    const React=require('react');const Newsletter=require(${JSON.stringify(fullFooter ? 'footer' : 'newsletter')}).default;
    require('react-dom/client').createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,...Array.from({length:${instances}},(_,i)=>React.createElement(Newsletter,{key:i}))));
  })();`;
}

async function fixture(browser, configured = true, instances = 1, fullFooter = false) {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
  if(fullFooter) await page.addStyleTag({content:'*{box-sizing:border-box}body{margin:0}h2,p,ul{margin:0}ul{padding:0;list-style:none}a{color:inherit;text-decoration:none}'+fs.readFileSync(path.join(frontend,'src/app/footer.css'),'utf8')});
  await page.addScriptTag({ content: bundle(configured, instances, fullFooter) });
  await page.getByRole('heading', {name:'For the love of your pet.'}).first().waitFor();
  return page;
}

async function check(name, fn) {
  try { await fn(); report.checks.push(name); process.stdout.write(`PASS ${name}\n`); }
  catch (error) { report.failures.push({name,error:String(error)}); process.stdout.write(`FAIL ${name}: ${error}\n`); }
}

async function submit(page) { await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
async function token(page) { await page.evaluate(() => {window.challengeBefore=window.challenge;window.challenge.onSuccess('mock-valid-token');}); await page.waitForFunction(() => window.challenge!==window.challengeBefore); }

async function newsletterChecks(browser) {
  await check('unique instance IDs and accessible email fields', async () => {
    const page = await fixture(browser,true,2);
    const inputs = page.getByLabel('Email address'); assert.equal(await inputs.count(),2);
    const ids = await inputs.evaluateAll(elements => elements.map(e=>e.id)); assert.equal(new Set(ids).size,2);
    assert.equal(await inputs.first().getAttribute('maxlength'),'254');
    assert.equal(await inputs.first().getAttribute('autocomplete'),'email'); await page.close();
  });
  await check('missing configuration disables signup', async () => {
    const page = await fixture(browser,false);
    assert(await page.getByRole('button',{name:'Join the List'}).isDisabled());
    assert.match(await page.getByRole('alert').innerText(),/Email signup is temporarily unavailable/);
    await page.getByLabel('Email address').fill('test@example.com');await submit(page);
    assert.equal(await page.evaluate(()=>window.requests.length),0);await page.close();
  });
  await check('empty and malformed emails do not submit', async () => {
    const page = await fixture(browser);await token(page);
    await page.getByRole('button',{name:'Join the List'}).click();
    assert.equal(await page.getByLabel('Email address').evaluate(e=>e.validity.valueMissing),true);
    await page.getByLabel('Email address').fill('invalid');await submit(page);
    await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(()=>window.requests.length),0);await page.close();
  });
  for (const callback of [null,'onExpire','onError']) await check(`missing/revoked token: ${callback || 'not completed'}`,async()=>{
    const page = await fixture(browser);await page.getByLabel('Email address').fill('test@example.com');
    if(callback){await token(page);await page.evaluate(name=>window.challenge[name](),callback);await page.getByRole('alert').waitFor();}
    await submit(page);await page.getByRole('alert').first().waitFor();
    assert.equal(await page.evaluate(()=>window.requests.length),0);await page.close();
  });
  await check('same-tick duplicate submissions send one request; pending disables controls; confirmation excludes coupons',async()=>{
    const page=await fixture(browser);await page.getByLabel('Email address').fill('test@example.com');await token(page);
    await page.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
    await page.getByRole('button',{name:'Joining…'}).waitFor();assert(await page.getByLabel('Email address').isDisabled());
    assert.equal(await page.evaluate(()=>window.requests.length),1);
    const request=await page.evaluate(()=>window.requests[0]);assert.equal(request.url,'/api/medusa/store/newsletter');
    assert.deepEqual(JSON.parse(request.options.body),{email:'test@example.com',turnstile_token:'mock-valid-token'});
    await page.evaluate(()=>window.finishRequest());await page.getByRole('status').waitFor();
    assert.equal(await page.getByRole('status').innerText(),'Please check your email to confirm your subscription.');
    assert.equal(await page.locator('form').count(),0);assert(!await page.locator('body').innerText().then(t=>t.includes('DO_NOT_SHOW')));await page.close();
  });
  for (const status of [400,403,429,503,'network']) await check(`API failure ${status} preserves email, revokes token, allows retry`,async()=>{
    const page=await fixture(browser);await page.getByLabel('Email address').fill('test@example.com');await token(page);
    await page.evaluate(value=>{window.responseStatus=value;window.networkFailure=value==='network';},status);
    await submit(page);await page.waitForFunction(()=>window.requests.length===1);await page.evaluate(()=>window.finishRequest());
    await page.getByRole('alert').waitFor();assert.equal(await page.getByLabel('Email address').inputValue(),'test@example.com');
    assert(!await page.getByLabel('Email address').isDisabled());assert.equal(await page.evaluate(()=>window.challengeResets),1);
    if(status===503)assert.match(await page.getByRole('alert').innerText(),/temporarily unavailable/);
    if(status==='network')assert.match(await page.getByRole('alert').innerText(),/try again/i);
    const guidance=await page.getByRole('alert').innerText();
    await token(page);assert.equal(await page.getByRole('alert').innerText(),guidance);
    await page.evaluate(()=>window.challenge.onExpire());await page.getByRole('alert').first().waitFor();
    await submit(page);assert.equal(await page.evaluate(()=>window.requests.length),1);
    await token(page);await page.evaluate(()=>{window.responseStatus=200;window.networkFailure=false;});
    await submit(page);await page.waitForFunction(()=>window.requests.length===2);await page.evaluate(()=>window.finishRequest());
    await page.getByRole('status').waitFor();await page.close();
  });
  for(const width of [188,320,375,390,768,1024,1440])await check(`configured captcha footer fits ${width}px, unscaled and uncropped`,async()=>{
    const page=await fixture(browser,true,1,true);await page.setViewportSize({width,height:1200});
    await page.waitForFunction(expected=>window.challenge.options.size===expected,width<340?'compact':'flexible');
    const geometry=await page.locator('footer').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,documentOverflow:document.documentElement.scrollWidth>innerWidth,challengeWidth:document.querySelector('[data-testid="mock-turnstile"]').getBoundingClientRect().width,transform:getComputedStyle(document.querySelector('.cansoria-footer-captcha')).transform}));
    assert.equal(geometry.overflow,false);assert.equal(geometry.documentOverflow,false);assert.equal(geometry.transform,'none');assert(geometry.challengeWidth>=(width<340?150:300));await page.close();
  });
}

async function siteChecks(browser) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('https://challenges.cloudflare.com/**',route=>route.abort());
  const routes=['/','/shop','/product/pet-portrait-oil-painting','/contact','/privacy','/journal'];
  let referenceLinks;
  for(const route of routes) await check(`shared footer ${route}`,async()=>{
    const response=await page.goto(baseURL+route,{waitUntil:'domcontentloaded',timeout:120000});assert.equal(response.status(),200);
    const footer=page.locator('footer.cansoria-footer');await footer.waitFor();assert.equal(await footer.count(),1);
    const text=await footer.innerText();assert.match(text,/A home for pet portrait inspiration/);assert(!/Human Portraits|Painted with love|The Journal/.test(text));
    assert.equal(await page.getByRole('heading',{name:'For the love of your pet.'}).count(),1);
    const links=await footer.locator('a').evaluateAll(elements=>elements.map(e=>({text:e.textContent,href:e.getAttribute('href')})));
    if(!referenceLinks)referenceLinks=links;else assert.deepEqual(links,referenceLinks);
  });
  await page.goto(baseURL+'/',{waitUntil:'domcontentloaded',timeout:120000});
  for(const width of [320,375,390,768,1024,1440])await check(`footer layout ${width}px`,async()=>{
    await page.setViewportSize({width,height:1000});const footer=page.locator('footer.cansoria-footer');await footer.scrollIntoViewIfNeeded();
    const geometry=await footer.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,documentOverflow:document.documentElement.scrollWidth>window.innerWidth,
      overflowing:[...el.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).map(e=>e.tagName+'.'+e.className)}));
    assert.equal(geometry.overflow,false);assert.equal(geometry.documentOverflow,false);assert.deepEqual(geometry.overflowing,[]);
    // Load lazy footer images by actually revealing them before the full-page crop.
    for(const image of await footer.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(element=>element.decode());
    }
    // Capture in document coordinates from scrollTop 0 so fixed navigation stays
    // at the page top rather than being composited across the footer crop.
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
    await page.waitForFunction(()=>window.scrollY===0);
    const box=await footer.boundingBox();assert(box);
    const file=path.join(__dirname,`footer-${width}.png`);await page.screenshot({path:file,fullPage:true,clip:box});report.screenshots.push(file);
  });
  for(const href of [...new Set((referenceLinks||[]).map(link=>link.href).filter(href=>href.startsWith('/')))])await check(`footer destination ${href}`,async()=>{
    const response=await page.request.get(baseURL+href,{timeout:120000});assert.equal(response.status(),200);
  });
  await check('footer keyboard access and 200 percent text zoom',async()=>{
    await page.goto(baseURL+'/contact',{waitUntil:'domcontentloaded',timeout:120000});await page.setViewportSize({width:768,height:1000});
    await page.locator('footer').evaluate(el=>{el.style.zoom='2';});
    const field=page.locator('footer').getByLabel('Email address');await field.focus();assert(await field.evaluate(e=>e===document.activeElement));
    const geometry=await page.locator('footer').evaluate(el=>({overflow:el.scrollWidth>el.clientWidth,focus:getComputedStyle(el.querySelector('input')).outlineStyle}));
    assert.equal(geometry.overflow,false);assert.notEqual(geometry.focus,'none');
    await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement.tagName!=='BODY'));
  });
  await page.close();
}

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : {})});
  try {if(!process.argv.includes('--screenshots-only'))await newsletterChecks(browser);await siteChecks(browser);}finally{
    await browser.close();fs.writeFileSync(path.join(__dirname,process.argv.includes('--screenshots-only')?'verification-screenshot-results.json':'verification-results.json'),JSON.stringify(report,null,2));
  }
  process.stdout.write(`${report.checks.length} passed, ${report.failures.length} failed\n`);
  process.exitCode=report.failures.length ? 1 : 0;
})().catch(error=>{console.error(error);process.exitCode=1;});
