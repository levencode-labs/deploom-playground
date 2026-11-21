'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname, '../docs');
const origin = 'http://127.0.0.1:41427';

const manifest = {name:'fixture-app',dependencies:{'nth-check':'1.0.2','fixture-critical':'1.0.0',
  'fixture-moderate':'1.0.0','fixture-low':'1.0.0','internal-widget':'1.0.0'}};
const publicCopy = (name,version) => ({version,resolved:`https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`});
const packages = {'':manifest};
for (const [name,version] of Object.entries(manifest.dependencies)) packages['node_modules/'+name]=publicCopy(name,version);
packages['node_modules/internal-widget']={version:'1.0.0',resolved:'file:../widget'};
packages['node_modules/fixture-critical'].dependencies={'nth-check':'^3.0.0'};
packages['node_modules/fixture-critical/node_modules/nth-check']=publicCopy('nth-check','2.1.1');
const allFindings = [
  ['fixture-critical','CRITICAL','TEST-critical','Critical advisory example'],
  ['nth-check','HIGH','GHSA-rp65-9cf3-cjxr','Inefficient Regular Expression Complexity in nth-check'],
  ['fixture-moderate','MODERATE','TEST-moderate','Moderate advisory example'],
  ['fixture-low','LOW','TEST-low','Low advisory example'],
  ['internal-widget','CRITICAL','TEST-private','Public namesake advisory'],
];
function snapshot() {
  const now=Math.floor(Date.now()/1000);
  const result={schema:1,source:'OSV',coverage:'npm-ecosystem',ecosystem:'npm',published:now-60,expires:now+3600,
    rows:allFindings.length,packages:{},advisories:{}};
  for(const [name,severity,id,summary] of allFindings) {
    result.packages[name]=[{id,severity,versions:[manifest.dependencies[name]],ranges:[]}];
    result.advisories[id]={summary,published:'2021-09-20T18:15:00Z'};
  }
  return result;
}

async function exercise(browser) {
  const context = await browser.newContext({viewport:{width:1280,height:860}});
  let releaseSnapshot;
  const gate=new Promise(resolve=>{releaseSnapshot=resolve;});
  const external=[], snapshotRequests=[], errors=[];
  try {
    await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin) {external.push(url.href);return route.abort();}
      if(url.pathname==='/audit-data/osv-npm-v1.json') {
        snapshotRequests.push(route.request().method());
        await gate;
        return route.fulfill({json:snapshot()});
      }
      const target=path.resolve(docs,'.'+url.pathname);
      assert.ok(target.startsWith(docs+path.sep));
      return route.fulfill({path:target});
    });
    const page=await context.newPage();
    page.setDefaultTimeout(6000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/tree.html?lang=en');
    const file=(name,value)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});
    await page.locator('#shared-manifest').setInputFiles(file('package.json',manifest));
    await page.locator('#shared-lock').setInputFiles(file('package-lock.json',{lockfileVersion:3,packages}));
    const graph=page.locator('#network-map');
    const node=(name,version)=>graph.getByRole('button',{name:new RegExp('^'+name+' · '+version.replaceAll('.','\\.')+' · ')});
    const old=node('nth-check','1.0.2'), patched=node('nth-check','2.1.1');
    const low=node('fixture-low','1.0.0'), privateCopy=node('internal-widget','1.0.0');
    await patched.waitFor();
    await page.locator('#map-fit').click();
    await old.click();
    await patched.focus(); await patched.press('Enter');
    releaseSnapshot();

    const high=graph.locator('[data-severity="high"]');
    await high.waitFor();
    assert.equal(await high.count(),1);
    assert.equal(await old.getAttribute('data-severity'),'high');
    assert.equal(await node('fixture-critical','1.0.0').getAttribute('data-severity'),'critical');
    assert.equal(await node('fixture-moderate','1.0.0').getAttribute('data-severity'),'moderate');
    for (const neutral of [low,patched,privateCopy]) {
      assert.ok(!['critical','high','moderate','low'].includes(await neutral.getAttribute('data-severity')));
    }
    const details=page.locator('#network-info #map-advisories');
    await details.getByText(/no (?:known |matching )?(?:advisories|vulnerabilities)|no matches/i).waitFor();
    assert.equal(await page.locator('#network-info > strong').innerText(),'nth-check · 2.1.1');
    const conflict=page.locator('#network-info li.map-connection-conflict');
    assert.match(await conflict.innerText(),/fixture-critical → nth-check.*\^3\.0\.0.*Conflict/);
    assert.ok(await conflict.evaluate(item=>getComputedStyle(item).color!==getComputedStyle(item.parentElement).color),
      'The clean copy still visibly identifies its incoming version conflict');
    const title=allFindings[1][3];
    assert.doesNotMatch(await details.innerText(),/Inefficient Regular Expression/);
    await old.click();
    await details.getByText(title,{exact:false}).waitFor();
    assert.match(await details.innerText(),/high/i);
    assert.equal(await details.getByRole('link').getAttribute('href'),'https://osv.dev/vulnerability/GHSA-rp65-9cf3-cjxr');
    await low.focus(); await low.press('Space');
    await details.getByText('Low advisory example',{exact:false}).waitFor();
    await privateCopy.click();
    await details.getByText(/unverified|unconfirmed|not checked|could not|unknown|cannot|no identifiable/i).waitFor();
    assert.doesNotMatch(await details.innerText(),/Public namesake advisory/);
    assert.equal(await page.getByRole('dialog').count(),0);

    const back=page.locator('#map-back'), forward=page.locator('#map-forward'), start=page.locator('#map-start');
    const depth=page.locator('#map-depth'), layout=page.locator('#map-layout');
    const explore=page.locator('#network-info').getByRole('button',{name:'Explore from this node'});
    const initialStart=await start.inputValue();
    assert.equal(await back.isHidden(),true,'Selecting nodes to read their advisories does not change navigation history');
    assert.equal(await forward.isHidden(),true);
    await node('fixture-critical','1.0.0').click(); await explore.click();
    assert.equal(await start.inputValue(),'fixture-critical · 1.0.0');
    await depth.selectOption('1'); await layout.selectOption('vertical');
    await page.locator('#map-fit').click();
    await patched.click(); await explore.click();
    assert.equal(await start.inputValue(),'nth-check · 2.1.1');
    await depth.selectOption('all'); await layout.selectOption('horizontal');
    await back.click();
    assert.equal(await start.inputValue(),'fixture-critical · 1.0.0');
    assert.equal(await depth.inputValue(),'1');
    assert.equal(await layout.inputValue(),'vertical');
    await back.click();
    assert.equal(await start.inputValue(),initialStart);
    assert.equal(await depth.inputValue(),'2');
    assert.equal(await layout.inputValue(),'horizontal');
    assert.equal(await back.isHidden(),true);
    await old.click();
    await forward.click();
    assert.equal(await start.inputValue(),'fixture-critical · 1.0.0');
    assert.equal(await depth.inputValue(),'1');
    assert.equal(await layout.inputValue(),'vertical');
    await forward.click();
    assert.equal(await start.inputValue(),'nth-check · 2.1.1');
    assert.equal(await depth.inputValue(),'all');
    assert.equal(await forward.isHidden(),true);
    await back.click();
    await start.fill('fixture-low'); await start.press('Enter');
    assert.equal(await start.inputValue(),'fixture-low · 1.0.0');
    assert.equal(await forward.isHidden(),true,'A new root from the combobox replaces the forward branch');
    await back.click();
    assert.equal(await start.inputValue(),'fixture-critical · 1.0.0');
    await forward.click();
    assert.equal(await start.inputValue(),'fixture-low · 1.0.0');
    assert.deepEqual(snapshotRequests,['GET']);
    assert.deepEqual(external,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS graph severity by installed copy, inline advisory details, keyboard and mouse selection, navigation history, no third-party traffic');
  } finally {releaseSnapshot();await context.close();}
}

(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  try {await exercise(browser);} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
