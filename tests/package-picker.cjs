'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const docs = path.resolve(__dirname, '../docs');
const base = 'http://127.0.0.1:18745'; // All requests are fulfilled by the route below.
const names = Array.from({length:110}, (_, index) => (index < 100 ? '@fixture/ui-' : 'tool-') + String(index).padStart(3, '0'));
const manifest = {name:'local-fixture', dependencies:{}};
const lock = {lockfileVersion:3, packages:{'':manifest}};
for (const name of names) {
  manifest.dependencies[name] = '1.0.0';
  const record = {version:'1.0.0'};
  if (name === names[0]) record.resolved = 'https://registry.npmjs.org/@fixture/ui-000/-/ui-000-1.0.0.tgz';
  lock.packages['node_modules/'+name] = record;
}
const upload = (name, data) => ({name, mimeType:'application/json', buffer:Buffer.from(JSON.stringify(data))});
const catalog = name => ({name, versions:{'1.0.0':{},'2.0.0':{}},
  time:{'1.0.0':'2020-01-01T00:00:00Z','2.0.0':'2025-01-01T00:00:00Z'}});

async function open(browser, hosted, tool = 'plan') {
  const context = await browser.newContext({viewport:{width:375,height:820}});
  const calls = [], snapshots = [], osvPairs = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://registry.npmjs.org') {
      const [name,version] = url.pathname.slice(1).split('/').map(decodeURIComponent);
      calls.push(version ? name+'@'+version : name);
      return route.fulfill({headers:{'Access-Control-Allow-Origin':base},json:version ? {name,version} : catalog(name)});
    }
    if (url.origin === 'https://api.osv.dev' && url.pathname === '/v1/querybatch') {
      const queries=route.request().postDataJSON().queries;
      for(const q of queries) osvPairs.push(q.package.name+'@'+q.version);
      return route.fulfill({headers:{'Access-Control-Allow-Origin':base},json:{results:queries.map(()=>({}))}});
    }
    if (url.origin !== base) throw Error('Unexpected destination: '+url.origin);
    if (url.pathname === '/audit-data/osv-npm-v1.json') {
      snapshots.push(url.href);
      const now=Math.floor(Date.now()/1000);
      return route.fulfill({json:{schema:1,source:'OSV',coverage:'npm-ecosystem',ecosystem:'npm',
        published:now-60,expires:now+86400,rows:1,packages:{'example-only':[{id:'OSV-fixture',versions:['1.0.0'],ranges:[]}]}}});
    }
    if (url.pathname === '/audit-data/releases-v1.json') {
      snapshots.push(url.href);
      return route.fulfill({json:{schema:1,published:Math.floor(Date.now()/1000),packages:Object.fromEntries(names.map(n=>[n,catalog(n)]))}});
    }
    const filename = path.join(docs, url.pathname);
    let body;
    try { body = await fs.readFile(filename); }
    catch (error) { if (error.code === 'ENOENT') return route.fulfill({status:404,body:''}); throw error; }
    if (hosted && url.pathname === '/registry.js') body = body.toString().replace('const hostedAudit = false;', 'const hostedAudit = true;');
    const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'};
    return route.fulfill({body,contentType:types[path.extname(filename)] || 'application/octet-stream'});
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.goto(base+'/'+tool+'.html?lang=en');
  const fixture=structuredClone(lock);
  if(tool==='audit') {
    fixture.packages['node_modules/'+names[0]+'/node_modules/'+names[99]]={version:'2.0.0'};
    fixture.packages['node_modules/local-workspace']={private:true,version:'1.0.0'};
  }
  await page.locator('#shared-manifest').setInputFiles(upload('package.json',manifest));
  await page.locator('#shared-lock').setInputFiles(upload('package-lock.json',fixture));
  if(tool==='audit')await page.waitForFunction(()=>!document.getElementById('run-audit').disabled);
  else await page.locator('.package-picker summary').waitFor();
  return {context,page,calls,snapshots,osvPairs};
}

async function auditSelection(browser) {
  const {context,page,calls,osvPairs,snapshots}=await open(browser,false,'audit');
  assert.equal(await page.locator('#scope-options,#audit-filter').count(),0);
  assert.deepEqual([calls,osvPairs,snapshots],[[],[],[]]);
  await page.locator('#run-audit').click();
  await page.waitForFunction(()=>document.getElementById('audit-status').textContent.includes('Audit incomplete.'));
  assert.deepEqual(calls,[names[0]]);
  assert.deepEqual(osvPairs,[names[0]+'@1.0.0']);
  assert.match(await page.locator('#security-coverage').innerText(),/1 \/ 112/);
  await context.close();

  const snapshot=await open(browser,true,'audit');
  assert.equal(await snapshot.page.locator('#scope-options').count(),0);
  assert.equal(await snapshot.page.locator('.picker-consent').isHidden(),true);
  assert.deepEqual(snapshot.snapshots,[]);
  await snapshot.page.locator('#run-audit').click();
  await snapshot.page.waitForFunction(()=>document.getElementById('audit-status').textContent.includes('OSV snapshot dated'));
  assert.deepEqual(snapshot.snapshots.sort(),[base+'/audit-data/osv-npm-v1.json',base+'/audit-data/releases-v1.json']);
  assert.deepEqual([snapshot.calls,snapshot.osvPairs],[[],[]]);
  await snapshot.context.close();
}

// Switching between tools must not mix their bundled examples with the user's files.
async function compareForms(page) {
  const recorded = require('../docs/selector-data.js').cases;
  await page.goto(base+'/compare.html?lang=en');
  const before=page.locator('#before'), after=page.locator('#after'), button=page.locator('#compare-run');
  const report=page.locator('#report');
  await page.waitForFunction(()=>document.getElementById('after-source').textContent==='package-lock.json');
  assert.equal(await button.isDisabled(),true);
  assert.equal(await report.isVisible(),false);
  assert.doesNotMatch(await page.locator('main').innerText(),/css-select|override/i);
  await before.setInputFiles(upload('before.json',recorded.base.lock));
  await after.setInputFiles(upload('after.json',recorded.override.lock));
  await page.waitForFunction(()=>!document.getElementById('compare-run').disabled);
  assert.equal(await report.isVisible(),false);
  await button.click();
  assert.match(await report.innerText(),/nth-check/);
  await after.setInputFiles({name:'broken.lock',mimeType:'text/plain',buffer:Buffer.from('invalid lock')});
  await page.locator('#after-source').getByText(/could not read/).waitFor();
  assert.equal(await button.isDisabled(),true);
  assert.equal(await report.isVisible(),false);
  await after.setInputFiles({name:'yarn.lock',mimeType:'text/plain',
    buffer:Buffer.from('# yarn lockfile v1\n\nfoo@^1.0.0:\n  version "1.1.0"\n')});
  await page.getByText('Choose two revisions of the same lockfile format.').waitFor();
  assert.equal(await button.isDisabled(),true);
  await page.goto(base+'/compare.html?example=selector&rev=override&lang=en');
  await report.waitFor();
  assert.match(await report.innerText(),/nth-check/);
  await page.goto(base+'/plan.html?example=react&lang=en');
  await page.locator('#plan-output').waitFor();
  assert.match(await page.locator('#plan-output').innerText(),/react-dom/);
}

async function run() {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  try {
    const {context,page,calls} = await open(browser,false);
    const picker = page.locator('#plan-options .package-picker');
    const summary = picker.locator('summary');
    assert.equal(await page.locator('#plan-output').isVisible(),false);
    assert.equal(await page.getByRole('button',{name:'Open the example project'}).count(),0);
    assert.ok(await page.locator('#make-plan').evaluate(button=>Boolean(button.compareDocumentPosition(document.querySelector('#plan-options')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.match(await summary.textContent(), /1 \/ 110\b/);
    await summary.click();
    const search = picker.getByRole('searchbox',{name:'Find a package'});
    const origin = picker.getByRole('combobox',{name:'Show'});
    const clear = picker.getByRole('button',{name:'Clear selection'});
    const consent = picker.getByRole('checkbox',{name:/Allow the selected names/});
    const go = page.locator('#make-plan');
    const master = picker.getByRole('checkbox',{name:/Select all/});
    assert.equal(await picker.locator('.picker-list input').count(),10);
    assert.equal(await master.evaluate(el=>el.indeterminate),true);
    await master.check();
    assert.match(await summary.textContent(),/110 \/ 110\b/);
    assert.equal(await go.isDisabled(),true);
    await consent.check();
    assert.equal(await go.isEnabled(),true);
    await picker.getByRole('button',{name:'Next'}).click();
    await picker.getByRole('checkbox',{name:/@fixture\/ui-010/}).uncheck();
    assert.equal(await go.isDisabled(),true,'Changing the unconfirmed set invalidates consent');
    await search.fill('tool-');
    assert.equal(await picker.getByRole('checkbox',{name:'Select all matches (10)'}).isChecked(),true);
    await clear.click();
    await master.check();
    assert.match(await summary.textContent(),/10 \/ 110\b/);
    await search.fill('');
    await origin.selectOption('public');
    assert.equal(await picker.locator('.picker-list li').count(),1);
    assert.equal(await picker.locator('.picker-list input').isChecked(),false);
    await origin.selectOption('selected');
    assert.equal(await picker.locator('.picker-list li').count(),10);
    assert.deepEqual(calls,[]);
    await consent.check();
    await go.click();
    await page.waitForFunction(()=>[...document.querySelectorAll('#plan-status')].some(el=>el.textContent.includes('10/10')));
    assert.deepEqual([...calls].sort(),names.slice(100));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));

    await page.locator('#plan-mode').selectOption('manual');
    const target=page.locator('#goal-package');
    await target.fill('tool-109');
    await page.getByRole('option',{name:/tool-109/}).waitFor();
    await target.press('ArrowDown');await target.press('Enter');
    assert.equal(await target.inputValue(),'tool-109');
    await target.fill('not-in-package-json');
    assert.equal(await page.locator('.package-combo [role=option]').count(),0);
    await target.press('Escape');
    await page.locator('#batch-goals summary').click();
    await page.locator('#targets').fill(JSON.stringify({[names[0]]:'2.0.0',[names[100]]:'2.0.0'}));
    await page.locator('#make-plan').click();
    await page.locator('#network > summary').click();
    const manual = page.locator('#lookup-packages');
    assert.match(await manual.locator('summary').textContent(),/1 \/ 2\b/);
    await manual.locator('summary').click();
    await manual.getByRole('checkbox',{name:'Select all (2)'}).check();
    assert.equal(await page.locator('#lookup').isDisabled(),true);
    await manual.getByRole('checkbox',{name:/Allow the selected names/}).check();
    await page.locator('#lookup').click();
    await page.locator('#network').waitFor({state:'hidden'});
    assert.deepEqual(calls.slice(10).sort(),[names[0]+'@2.0.0',names[100]+'@2.0.0'].sort());
    await compareForms(page);
    await context.close();

    const snapshot = await open(browser,true);
    assert.match(await snapshot.page.locator('.package-picker summary').textContent(),/110 \/ 110\b/);
    assert.equal(await snapshot.page.getByRole('checkbox',{name:/Allow the selected names/}).count(),0);
    await snapshot.page.locator('#make-plan').click();
    await snapshot.page.waitForFunction(()=>[...document.querySelectorAll('#plan-status')].some(el=>el.textContent.includes('110/110')));
    assert.equal(snapshot.snapshots.length,1);
    assert.deepEqual(snapshot.calls,[]);
    await snapshot.context.close();
    await auditSelection(browser);
    console.log('PASS plan and project audit selection at 375px: 110 names, per-version choices across pages, explicit consent and recipients, exact outgoing requests, local-only snapshots');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
