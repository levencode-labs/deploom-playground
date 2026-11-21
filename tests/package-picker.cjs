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
  await page.locator('.package-picker summary').waitFor();
  return {context,page,calls,snapshots,osvPairs};
}

async function auditSelection(browser) {
  const {context,page,calls,osvPairs,snapshots}=await open(browser,false,'audit');
  const picker=page.locator('#scope-options'), go=page.locator('#run-audit');
  const summary=picker.locator('summary'), consent=picker.getByRole('checkbox',{name:/Allow the selected names and versions/});
  assert.match(await summary.textContent(),/1 \/ 111\b/);
  assert.match(await page.locator('#send-summary').textContent(),/https:\/\/registry\.npmjs\.org\/[\s\S]+https:\/\/api\.osv\.dev\//);
  await summary.click();
  await picker.getByRole('button',{name:'Clear selection'}).click();
  const search=picker.getByRole('searchbox',{name:'Find a package'});
  await search.fill('local-workspace');
  assert.equal(await picker.locator('.picker-list li').count(),0);
  await search.fill('ui-09');
  await picker.getByRole('checkbox',{name:'Select all matches (11)'}).check();
  assert.match(await summary.textContent(),/11 \/ 111\b/);
  assert.equal(await go.isDisabled(),true);
  assert.match(await picker.locator('.picker-consent').textContent(),/registry\.npmjs\.org\/[\s\S]+api\.osv\.dev\//);
  await consent.check();
  await picker.getByRole('button',{name:'Next'}).click();
  await picker.getByRole('checkbox',{name:/ui-099@2\.0\.0/}).uncheck();
  assert.equal(await go.isDisabled(),true);
  await consent.check();
  assert.deepEqual([calls,osvPairs,snapshots],[[],[],[]]);
  await go.click();
  await page.waitForFunction(()=>document.getElementById('audit-status').textContent.includes('Audit incomplete.'));
  const expected=names.slice(90,100);
  assert.deepEqual(calls.sort(),expected);
  assert.deepEqual(osvPairs.sort(),expected.map(n=>n+'@1.0.0'));
  await search.fill('tool-'); // Browsing the selection must preserve the completed report.
  assert.match(await page.locator('#audit-status').textContent(),/Audit incomplete/);
  await context.close();

  const snapshot=await open(browser,true,'audit');
  assert.match(await snapshot.page.locator('#scope-options summary').textContent(),/111 \/ 111\b/);
  assert.equal(await snapshot.page.locator('.picker-consent').isHidden(),true);
  assert.deepEqual(snapshot.snapshots,[]);
  await snapshot.page.locator('#run-audit').click();
  await snapshot.page.waitForFunction(()=>document.getElementById('audit-status').textContent.includes('OSV snapshot dated'));
  assert.deepEqual(snapshot.snapshots.sort(),[base+'/audit-data/osv-npm-v1.json',base+'/audit-data/releases-v1.json']);
  assert.deepEqual([snapshot.calls,snapshot.osvPairs],[[],[]]);
  await snapshot.context.close();
}

async function run() {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  try {
    const {context,page,calls} = await open(browser,false);
    const picker = page.locator('#plan-output .package-picker');
    const summary = picker.locator('summary');
    assert.match(await summary.textContent(), /1 \/ 110\b/);
    await summary.click();
    const search = picker.getByRole('searchbox',{name:'Find a package'});
    const origin = picker.getByRole('combobox',{name:'Show'});
    const clear = picker.getByRole('button',{name:'Clear selection'});
    const consent = picker.getByRole('checkbox',{name:/Allow the selected names/});
    const go = page.getByRole('button',{name:'Fetch release dates and calculate plan'});
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
    await page.waitForFunction(()=>[...document.querySelectorAll('#plan-output [role=status]')].some(el=>el.textContent.includes('10/10')));
    assert.deepEqual([...calls].sort(),names.slice(100));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));

    await page.locator('#plan-mode').selectOption('manual');
    await page.locator('#batch-goals summary').click();
    await page.locator('#targets').fill(JSON.stringify({[names[0]]:'2.0.0',[names[100]]:'2.0.0'}));
    await page.getByRole('button',{name:'Calculate locally'}).click();
    const manual = page.locator('#lookup-packages');
    assert.match(await manual.locator('summary').textContent(),/1 \/ 2\b/);
    await manual.locator('summary').click();
    await manual.getByRole('checkbox',{name:'Select all (2)'}).check();
    assert.equal(await page.locator('#lookup').isDisabled(),true);
    await manual.getByRole('checkbox',{name:/Allow the selected names/}).check();
    await page.locator('#lookup').click();
    await page.locator('#network').waitFor({state:'hidden'});
    assert.deepEqual(calls.slice(10).sort(),[names[0]+'@2.0.0',names[100]+'@2.0.0'].sort());
    await context.close();

    const snapshot = await open(browser,true);
    assert.match(await snapshot.page.locator('.package-picker summary').textContent(),/110 \/ 110\b/);
    assert.equal(await snapshot.page.getByRole('checkbox',{name:/Allow the selected names/}).count(),0);
    await snapshot.page.getByRole('button',{name:'Calculate from the Nexus snapshot'}).click();
    await snapshot.page.waitForFunction(()=>[...document.querySelectorAll('#plan-output [role=status]')].some(el=>el.textContent.includes('110/110')));
    assert.equal(snapshot.snapshots.length,1);
    assert.deepEqual(snapshot.calls,[]);
    await snapshot.context.close();
    await auditSelection(browser);
    console.log('PASS plan and project audit selection at 375px: 110 names, per-version choices across pages, explicit consent and recipients, exact outgoing requests, local-only snapshots');
  } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
