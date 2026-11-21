'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const docs = path.resolve(__dirname,'../docs');
const base = 'http://127.0.0.1:42420';

async function exercise(browser,lang,prefix,width) {
  const context = await browser.newContext({viewport:{width,height:800}});
  try {
    const external = [], errors = [];
    let requestCount=0;
    await context.route('**/*',async route=>{
      requestCount++;
      const url = new URL(route.request().url());
      if(url.origin !== base) {external.push(url.origin);return route.abort();}
      assert.ok(url.pathname.startsWith(prefix));
      const target = path.resolve(docs,url.pathname.slice(prefix.length));
      assert.ok(target.startsWith(docs+path.sep));
      return route.fulfill({path:target});
    });
    const page = await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+prefix+'audit.html?lang='+lang);
    assert.equal(await page.locator('#sample,#sample-choice,#scope-options,#version-details').count(),0);
    assert.equal(await page.locator('#run-audit').isDisabled(),true);
    await page.goto(base+prefix+'audit.html?lang='+lang+'&example=selector&rev=base');
    const results = page.locator('#findings');
    const summary = results.locator('details > summary').first();
    const closed = await summary.innerText();
    assert.match(closed,/HIGH/);
    assert.match(closed,/Inefficient Regular Expression Complexity/);
    assert.match(await summary.locator('time').getAttribute('datetime'),/^2021-09-20/);
    assert.doesNotMatch(closed,/GHSA-|CVE-/);
    assert.equal(await results.locator('svg').count(),0);
    await summary.focus();
    await page.keyboard.press('Enter');
    await results.locator('svg').waitFor();
    const open = await results.innerText();
    assert.match(open,/CVE-2021-3803/);
    assert.match(open,/GHSA-rp65-9cf3-cjxr/);
    assert.match(open,/postcss-selector-parser|css-select/);
    assert.match(open,/nth-check/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(base+prefix+'audit.html?lang='+lang+'&example=vitest');
    const critical=results.locator('ul > li > details > summary');
    await critical.first().waitFor();
    assert.equal(await critical.count(),2);
    assert.equal(await results.locator('h4').count(),1);
    assert.match(await results.locator('h4').innerText(),/tinypool · 2/);
    assert.equal(await page.locator('#vuln-count').innerText(),'2');
    assert.match(await page.locator('#severity-counts').innerText(),/C: 2/);
    assert.match(await page.locator('#affected-count').innerText(),/1.*1/);
    const excerpts=await critical.allInnerTexts();
    assert.ok(excerpts.every(line=>line.includes('CRITICAL') && !/GHSA-|CVE-/i.test(line)));
    assert.ok(excerpts.some(line=>line.includes('worker options')) && excerpts.some(line=>line.includes('run() options')));
    const requestsBeforeOpening=requestCount;
    const sourceTimes=await critical.locator('time').evaluateAll(nodes=>nodes.map(node=>node.dateTime).sort());
    assert.deepEqual(sourceTimes,['2026-10-05T22:49:52.000Z','2026-10-05T22:50:01.000Z']);
    assert.match(await page.locator('#security-coverage').innerText(),/1 \/ 2/);
    assert.match(await page.locator('#age-coverage').innerText(),/0 \/ 1/);
    assert.equal(await page.locator('#run-audit').isVisible(),false);
    assert.match(await page.locator('#vitest-context').innerText(),/2.1.1.*2.1.2/);
    for(const heading of await critical.all()) {
      await heading.click();
      const card=heading.locator('..');
      await card.locator('svg').waitFor();
      assert.match(await card.innerText(),/CVE-2026-10484[89]/);
      assert.match(await card.locator('svg').textContent(),/vitest@3.2.6/);
      await card.locator('.finding-package details > summary').click();
      assert.match(await card.innerText(),/\^1\.1\.1/);
    }
    assert.equal(requestCount,requestsBeforeOpening,'Opening findings reads only the recorded data');
    await page.goto(base+prefix+'advisories.html?lang='+lang);
    const manifest={name:'frontend',dependencies:{'react-dom':'^19.0.0'}};
    for(let i=0;i<100;i++)manifest.dependencies['@fixture/babel-'+i]='^1.0.0';
    const packages={'':manifest,'node_modules/react-dom':{version:'19.0.0'}};
    for(let i=0;i<2064;i++)packages['node_modules/transitive-'+i]={version:'1.0.0'};
    const file=(name,body)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(body))});
    await page.locator('#shared-manifest').setInputFiles(file('package.json',manifest));
    await page.locator('#shared-lock').setInputFiles(file('package-lock.json',{lockfileVersion:3,packages}));
    await page.waitForFunction(()=>/версии из lock|versions from lockfile/.test(document.getElementById('project-note').textContent));
    const input=page.locator('#package');
    await input.fill('babel-99');
    await page.getByRole('option',{name:/@fixture\/babel-99/}).waitFor();
    await input.fill('transitive-2063');
    assert.equal(await page.getByRole('option').count(),0);
    await input.fill('react-dom');
    await page.getByRole('option',{name:/react-dom.*19.0.0/}).waitFor();
    await input.press('ArrowDown');
    await input.press('Enter');
    assert.equal(await page.locator('#version').inputValue(),'19.0.0');
    await input.fill('package-outside-project');
    assert.equal(await input.inputValue(),'package-outside-project');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(external,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS',lang,prefix,width,'recorded advisories, publication dates, keyboard disclosure, dependency routes, distinct severity and package counts, Vitest branch excerpt');
  } finally {
    await context.close();
  }
}

(async()=>{
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-proxy-server']});
  try {
    await exercise(browser,'ru','/deploom-playground/',375);
    await exercise(browser,'en','/',1280);
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
