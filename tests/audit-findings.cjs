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
    await page.locator('#sample').click();
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
    await page.locator('#finding-level').selectOption('Critical');
    assert.equal(await results.locator('details').count(),0);
    await page.locator('#finding-level').selectOption('');
    await page.locator('#finding-filter').fill('CVE-2021-3803');
    assert.equal(await results.locator('details').count(),1);
    const requestsBeforeSwitch=requestCount;
    await page.locator('#sample-choice').selectOption('vitest');
    assert.match(await summary.innerText(),/nth-check/,'Choosing an example waits for explicit launch');
    await page.locator('#sample').click();
    const critical=results.locator(':scope > li > details > summary');
    assert.equal(await critical.count(),2);
    const excerpts=await critical.allInnerTexts();
    assert.ok(excerpts.every(line=>line.includes('CRITICAL') && line.includes('tinypool@1.1.1')));
    assert.ok(excerpts.some(line=>line.includes('worker options')) && excerpts.some(line=>line.includes('run() options')));
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
    await page.locator('#sample-choice').selectOption('selector');
    await page.locator('#sample').click();
    assert.equal(await page.locator('#vitest-context').isVisible(),false);
    assert.equal(await page.locator('#run-audit').isVisible(),true);
    assert.equal(await results.locator('details').count(),1);
    assert.equal(requestCount,requestsBeforeSwitch,'Switching examples and opening the graph make no network requests');
    assert.deepEqual(external,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS',lang,prefix,width,'recorded advisories, publication dates, keyboard disclosure, dependency routes, filters, Vitest branch excerpt');
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
