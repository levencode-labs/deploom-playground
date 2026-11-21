'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname, '../docs');
const origin = 'http://127.0.0.1:41419';
const locks = [null,...[1,2,3].map(v=>require('./fixtures/npm-lock-formats/v'+v+'.json'))];
const manifest = require('./fixtures/npm-lock-formats/package.json');
const inputFile = (name,value)=>({name,mimeType:'text/plain',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});
const yarnClassic = '# yarn lockfile v1\n\n"color-convert@^2.0.1":\n  version "2.0.1"\n  dependencies:\n    color-name "~1.1.4"\n\n"color-name@~1.1.4":\n  version "1.1.4"\n';
const yarnBerry = '__metadata:\n  version: 8\n\n"colors-app@workspace:.":\n  version: 0.0.0-use.local\n  resolution: "colors-app@workspace:."\n  dependencies:\n    color-convert: "npm:^2.0.1"\n\n"color-convert@npm:^2.0.1":\n  version: 2.0.1\n  resolution: "color-convert@npm:2.0.1"\n  dependencies:\n    color-name: "npm:~1.1.4"\n\n"color-name@npm:~1.1.4":\n  version: 1.1.4\n  resolution: "color-name@npm:1.1.4"\n';

async function run() {
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const external=[], errors=[];
  try {
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url());
      if (url.origin!==origin) {external.push(url.href);return route.abort();}
      const file=path.resolve(docs,'.'+url.pathname);
      assert.ok(file.startsWith(docs+path.sep));
      return route.fulfill({path:file});
    });
    const page=await ctx.newPage();
    page.setDefaultTimeout(6000);
    await page.addInitScript(()=>{
      window.projectEvents=0;
      addEventListener('lab-project',()=>window.projectEvents++);
    });
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/tree.html?lang=en');
    const headerMan=page.locator('#shared-manifest'), headerLock=page.locator('#shared-lock');
    const local=page.locator('#tree-manifest');
    const assertFilled=async(slot,filled)=>page.locator('#shared-'+slot+'-zone[data-filled="'+filled+'"]').waitFor();
    const node=(name,version='')=>page.locator('#network-map [role=button]').filter({hasText:name}).filter({hasText:version});
    const waitText=(selector,value)=>page.waitForFunction(([sel,text])=>document.querySelector(sel)?.textContent.includes(text),[selector,value]);
    async function chooseCopy(name,version) {
      const field=page.locator('#map-start');
      await field.fill(name);
      await field.click();
      await page.getByRole('listbox').getByRole('option').filter({hasText:name}).filter({hasText:version}).first().click();
      await node(name,version).first().waitFor();
    }
    async function applyShared(action) {
      const before=await page.evaluate(()=>window.projectEvents);
      await action();
      await page.waitForFunction(previous=>window.projectEvents>previous,before);
    }
    async function clearSlot(slot) {
      await applyShared(()=>page.locator('#shared-'+slot+'-clear').click());
      await assertFilled(slot,false);
    }
    const loadLock=async(lock,name='package-lock.json')=>{
      await applyShared(()=>headerLock.setInputFiles(inputFile(name,lock)));
      await assertFilled('lock',true);
    };
    const loadManifest=async(value)=>{
      await applyShared(()=>headerMan.setInputFiles(inputFile('package.json',value)));
      await assertFilled('manifest',true);
    };
    await assertFilled('manifest',false);
    assert.equal(await page.locator('#network-panel').isVisible(),false);
    await page.locator('#manifest-editor > summary').click();

    const ranged={...manifest,dependencies:{'css-select':'^4.0.0','css-what':'~3.4.0'}};
    await loadManifest(ranged);
    await node('css-select').first().waitFor();
    await waitText('#tree-graph','^4.0.0');
    const labels=await page.locator('#tree-graph .tree-label').allTextContents();
    assert.deepEqual(labels.sort(),['css-select','css-what']);
    assert.equal(await page.locator('#tree-graph .tree-state.good').count(),0);
    assert.match(await page.locator('#tree-source').innerText(),/installation.{0,8}unconfirmed/i);
    assert.equal(await node('nth-check').count(),0);
    assert.equal(await local.inputValue(),'');

    await loadLock(locks[3]);
    await waitText('#tree-graph','css-select@4.3.0');
    await chooseCopy('css-select','4.3.0');
    await node('nth-check').first().waitFor();

    await local.fill('{}');
    await page.waitForFunction(()=>document.querySelectorAll('#tree-graph .tree-label').length===0
      && !document.getElementById('tree-error').textContent);
    assert.equal(await node('css-select').count(),0);
    assert.match(await page.locator('#tree-source').innerText(),/pasted|editor/i);
    await local.fill('   ');
    await waitText('#tree-graph','css-select@4.3.0');

    const draft={name:'separate-paste',dependencies:{'local-draft':'^8.2.0'}};
    await local.fill(JSON.stringify(draft));
    await node('local-draft').first().waitFor();
    assert.equal(await node('css-select').count(),0);
    await page.locator('#map-start').fill('nth-check');
    assert.equal(await page.getByRole('listbox').getByRole('option').count(),0);
    await page.locator('#map-start').press('Escape');
    const other=await ctx.newPage();
    await other.goto(origin+'/advisories.html?lang=en');
    await other.waitForFunction(name=>document.getElementById('project-note').textContent.includes(name),manifest.name);
    await other.locator('#package').fill('local-draft');
    assert.equal(await other.getByRole('listbox').getByRole('option').count(),0);
    await other.locator('#package').fill('css-select');
    await other.getByRole('option').filter({hasText:'css-select'}).click();
    assert.equal(await other.locator('#version').inputValue(),'4.3.0');
    const replacement={name:'header-now',dependencies:{'changed-header':'^2'}};
    await loadManifest(replacement);
    await other.waitForFunction(()=>document.getElementById('project-note').textContent.includes('header-now'));
    await clearSlot('lock');
    await other.locator('#shared-lock-zone[data-filled=false]').waitFor();
    assert.equal(JSON.parse(await local.inputValue()).name,draft.name);
    await node('local-draft').first().waitFor();
    await local.fill('{ invalid JSON');
    await page.locator('#tree-error').waitFor();
    assert.equal(await page.locator('#network-panel').isVisible(),false);
    await local.fill('');
    await node('changed-header').first().waitFor();
    await other.close();

    // A pasted lockfile uses its own declarations, even while the header holds an unrelated project.
    await local.fill(JSON.stringify(locks[2]));
    await waitText('#tree-graph','css-select@4.3.0');
    await chooseCopy('css-select','4.3.0');
    await node('nth-check').first().waitFor();
    await loadLock(yarnClassic,'yarn.lock');
    await node('css-select','4.3.0').first().waitFor();
    assert.equal(JSON.parse(await local.inputValue()).lockfileVersion,2);
    await local.fill(JSON.stringify({lockfileVersion:2,packages:[]}));
    await page.locator('#tree-error').waitFor();
    assert.equal(await page.locator('#network-panel').isVisible(),false);
    await clearSlot('lock');
    await local.fill('');
    await node('changed-header').first().waitFor();

    // Combining a matching local manifest with the shared lock restores exact copies.
    await loadManifest(manifest);
    await loadLock(locks[3]);
    await waitText('#tree-graph','css-select@4.3.0');
    await local.fill(JSON.stringify({...manifest,dependencies:{'css-select':'^4.2.0'}}));
    await waitText('#tree-graph','^4.2.0');
    await waitText('#tree-graph','css-select@4.3.0');
    await clearSlot('manifest');
    await waitText('#tree-graph','^4.2.0');
    assert.equal(JSON.parse(await local.inputValue()).dependencies['css-select'],'^4.2.0');
    await local.fill('');

    // A modern npm lock records root declarations. A v1 lock only records installed locations.
    for (const v of [2,3]) {
      await loadLock(locks[v]);
      await waitText('#tree-graph','css-select@4.3.0');
      await chooseCopy('nth-check','2.1.1');
    }
    await loadLock(locks[1]);
    await page.waitForFunction(()=>document.querySelectorAll('#network-map [role=button]').length===0);
    assert.equal(await page.locator('#tree-graph .tree-branches > li').count(),0);
    await chooseCopy('css-select','4.3.0');
    await node('nth-check').first().waitFor();

    await loadLock(yarnClassic,'yarn.lock');
    await page.waitForFunction(()=>document.querySelectorAll('#network-map [role=button]').length===0);
    await chooseCopy('color-convert','2.0.1');
    await node('color-name','1.1.4').first().waitFor();
    await loadLock(yarnBerry,'yarn.lock');
    await node('colors-app').first().waitFor();
    await chooseCopy('color-convert','2.0.1');
    await node('color-name','1.1.4').first().waitFor();

    await clearSlot('lock');
    await page.locator('#network-panel').waitFor({state:'hidden'});
    await local.fill(JSON.stringify(draft));
    await node('local-draft').first().waitFor();
    await loadManifest(manifest);
    await clearSlot('manifest');
    assert.equal(JSON.parse(await local.inputValue()).name,draft.name);
    await node('local-draft').first().waitFor();
    await page.reload();
    await assertFilled('manifest',false);
    assert.equal(await local.inputValue(),'');
    assert.equal(await page.locator('#network-panel').isVisible(),false);
    assert.deepEqual(external,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS tree source precedence, partial inputs, pasted JSON isolation, malformed inputs and lock-only npm v1/v2/v3 and Yarn Classic/Berry');
  } finally {await ctx.close();await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
