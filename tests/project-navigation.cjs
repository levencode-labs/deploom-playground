'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname,'../docs');
const pkg = 'local-project-widget';
const man = {name:'private-project-marker',dependencies:{[pkg]:'^1.0.0'}};
const lock = {lockfileVersion:3,packages:{'':man,['node_modules/'+pkg]:{version:'1.2.0'}}};

async function checkNpmFormats(browser,base) {
  const ctx=await browser.newContext();
  const page=await ctx.newPage();page.setDefaultTimeout(5000);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await ctx.route(/^https?:/,route=>new URL(route.request().url()).origin===base ? route.continue() : route.abort());
  const visit=tool=>page.goto(base+'/lab/'+tool+'.html?lang=en');
  const text=(id,part)=>page.waitForFunction(([id,part])=>document.getElementById(id).textContent.includes(part),[id,part]);
  const name='css-select', version='4.3.0';
  async function choose(id,detail) {
    const input=page.locator('#'+id);
    await input.fill(name);
    await input.click();
    await page.getByRole('listbox').getByRole('option').filter({hasText:name}).filter({hasText:detail}).click();
  }
  const fixture=path.join(__dirname,'fixtures/npm-lock-formats');
  try {
    for(const number of [1,2,3]) {
      await visit('audit');
      const buffer=await fs.readFile(path.join(fixture,'v'+number+'.json'));
      const file={name:'package-lock.json',mimeType:'application/json',buffer};
      await page.locator('#shared-lock').setInputFiles(file);
      if(number===1) {
        await text('parse-status','npm v1');
        await text('parse-status','direct dependencies 0');
        await page.locator('#shared-manifest').setInputFiles(path.join(fixture,'package.json'));
      }
      await text('parse-status','selector-check · npm v'+number+' · direct dependencies 2');
      await page.locator('#run-audit').click();
      await text('audit-status','Audit incomplete');
      await text('security-coverage','0 / 10');
      await text('age-coverage','0 / 2');
      await visit('advisories');
      await text('project-note','selector-check');
      await choose('package',version);
      assert.equal(await page.locator('#version').inputValue(),version);
      await visit('ranges');
      await text('manifest-status','package.json');
      await choose('range-pkg',version);
      assert.equal(await page.locator('[name=v]').inputValue(),version);
      await text('range-scale',version);
      await visit('plan');
      await page.locator('#plan-options').waitFor();
      await page.locator('#plan-mode').selectOption('manual');
      await choose('goal-package',version);
      await page.locator('#goal-version').fill('5.1.0');
      await page.locator('#make-plan').click();
      await text('plan-output',name+' '+version+' → 5.1.0');
      if(number===1)await text('plan-output','v1 omits');
      await visit('tree');
      await page.locator('#network-map [role=button]').first().waitFor();
      await choose('map-start',version);
      await text('network-info',name);
      await page.locator('#network-map [role=button]').filter({hasText:'nth-check'}).first().waitFor();
      await visit('compare');
      await page.locator('#before').setInputFiles(file);
      await page.locator('#compare-run').click();
      await text('empty','Installed copies match');
      assert.deepEqual(await page.locator('#counts b').allTextContents(),['0','0','0']);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS npm-generated v1/v2/v3 locks across all six tools with offline audit, nested copy and legacy manifest boundaries');
  } finally {await ctx.close();}
}

async function run() {
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/lab\//,'/');
    const file=path.resolve(docs,'.'+pathname);
    if(!file.startsWith(docs+path.sep))return res.writeHead(404).end();
    try {
      const content=await fs.readFile(file);
      res.writeHead(200,{'Content-Type':({'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream'}).end(content);
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args:['--no-proxy-server']});
  try {
    // One unreachable source should not stop the other source or start one DNS lookup per package.
    const auditContext=await browser.newContext();
    const auditPage=await auditContext.newPage();
    let npmCalls=0,osvCalls=0,osvDown=false;
    await auditContext.route('https://registry.npmjs.org/**',route=>{npmCalls++;return route.abort('namenotresolved');});
    await auditContext.route('https://api.osv.dev/**',route=>{
      osvCalls++;
      if(osvDown)return route.abort('namenotresolved');
      const queries=route.request().postDataJSON().queries;
      return route.fulfill({json:{results:queries.map(()=>({}))}});
    });
    const deps={},pkgs={'':{dependencies:deps}};
    for(let i=0;i<96;i++){
      const name='lab-network-fixture-'+i;deps[name]='1.0.0';
      pkgs['node_modules/'+name]={version:'1.0.0',resolved:'https://registry.npmjs.org/'+name+'/-/'+name+'-1.0.0.tgz'};
    }
    await auditPage.goto(base+'/lab/audit.html?lang=en');
    await auditPage.locator('#shared-manifest').setInputFiles({name:'package.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({dependencies:deps}))});
    await auditPage.locator('#shared-lock').setInputFiles({name:'package-lock.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({lockfileVersion:3,packages:pkgs}))});
    const runAudit=async()=>{
      await auditPage.locator('#run-audit').click();
      await auditPage.waitForFunction(()=>document.getElementById('audit-status').textContent.includes('Audit incomplete.'));
    };
    await runAudit();
    assert.match(await auditPage.locator('#security-coverage').textContent(),/96 \/ 96/);
    assert.match(await auditPage.locator('#age-coverage').textContent(),/0 \/ 96/);
    assert.ok(npmCalls>0 && npmCalls<=4);assert.equal(osvCalls,5);
    npmCalls=osvCalls=0;osvDown=true;
    await runAudit();
    assert.match(await auditPage.locator('#security-coverage').textContent(),/0 \/ 96/);
    assert.match(await auditPage.locator('#audit-status').textContent(),/OSV is unreachable/);
    assert.ok(npmCalls>0 && npmCalls<=4);assert.ok(osvCalls>0 && osvCalls<=3);
    await auditContext.close();
    console.log('PASS DNS outage with 96 versions: advisory checks continue independently, both failed sources stop early');
    await checkNpmFormats(browser,base);
    for(const [prefix,width] of [['/',1200],['/lab/',360]]) {
      const ctx=await browser.newContext({viewport:{width,height:800},hasTouch:width<400});
      const external=[], errors=[];
      await ctx.route(/^https?:/,route=>{
        const url=route.request().url();
        if(new URL(url).origin===base)return route.continue();
        external.push(url);return route.abort();
      });
      await ctx.addInitScript(()=>{
        window.showDirectoryPicker=()=>{throw Error('Unexpected directory picker');};
        window.slotEvents=[];
        window.addEventListener('lab-project',({detail})=>window.slotEvents.push(detail?.changedSlot));
      });
      const p=await ctx.newPage();p.setDefaultTimeout(6500);p.on('pageerror',e=>errors.push(e.message));
      const route=(page,lang='ru')=>base+prefix+page+'.html?lang='+lang;
      const go=page=>p.goto(route(page));
      const ready=(id,part)=>p.waitForFunction(([id,part])=>document.getElementById(id)?.textContent.includes(part),[id,part]);
      const filled=(manifest,lock,page=p)=>page.waitForFunction(([m,l])=>
        document.getElementById('shared-manifest-zone')?.dataset.filled===String(m) &&
        document.getElementById('shared-lock-zone')?.dataset.filled===String(l),[manifest,lock]);
      const selectDirect=async(page,id,detail)=>{
        const input=page.locator('#'+id);
        await input.fill('widget');
        await input.click();
        const entry=page.getByRole('listbox').getByRole('option').filter({hasText:pkg});
        await (detail ? entry.filter({hasText:detail}) : entry).click();
      };
      const verifyPackage=async(page,version,projectName=man.name)=>{
        await page.waitForFunction(name=>document.getElementById('project-note').textContent.includes(name)
          && !document.getElementById('query-button').disabled,projectName);
        await selectDirect(page,'package',version);
        assert.equal(await page.locator('#package').inputValue(),pkg);
        assert.equal(await page.locator('#version').inputValue(),version);
      };
      const verifyComparison=async()=>{
        await p.waitForFunction(()=>document.getElementById('after').files[0]?.name==='package-lock.json');
        assert.equal(await p.locator('#before').inputValue(),'');
        assert.ok(await p.locator('#compare-run').isDisabled());
        assert.equal(await p.locator('#report').isVisible(),false);
      };
      const drop=async(...files)=>{
        await p.evaluate(specs=>{for(const [slot,name,data,size] of specs) {
          const dt=new DataTransfer();dt.items.add(new File([size?'x'.repeat(size):data],name));
          document.getElementById('shared-'+slot+'-zone').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt}));
        }},files.map(([slot,name,data,size])=>[slot,name,typeof data==='string'?data:JSON.stringify(data),size]));
      };
      const stored=()=>p.evaluate(async key=>{
        const db=await new Promise((res,rej)=>{const r=indexedDB.open('deploom-lab-project',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
        const row=await new Promise(res=>{const r=db.transaction('selected').objectStore('selected').get(key);r.onsuccess=()=>res(r.result);});db.close();
        return row?{keys:Object.keys(row).sort(),man:await row.manifest?.text(),lock:await row.lock?.text()}:null;
      },prefix);
      await go('index');await filled(false,false);
      // Seed a previous release's handle and verify it is discarded without reading the selected directory.
      await p.evaluate(async key=>{
        const handle=await (await navigator.storage.getDirectory()).getDirectoryHandle('legacy',{create:true});
        const db=await new Promise(res=>{const r=indexedDB.open('deploom-lab-project',1);r.onsuccess=()=>res(r.result);});
        await new Promise(res=>{const tx=db.transaction('selected','readwrite');tx.objectStore('selected').put({name:'obsolete',handle},key);tx.oncomplete=res;});db.close();
      },prefix);
      await p.reload();await filled(false,false);assert.equal(await stored(),null);
      if(width>400) {
        await p.locator('#shared-manifest').focus();
        const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.keyboard.press('Enter')]);
        await chooser.setFiles({name:'package.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(man))});
        await filled(true,false);await drop(['lock','package-lock.json',lock]);
      } else {
        await drop(['lock','package-lock.json',lock]);await filled(false,true);
        await drop(['manifest','package.json',man]);
      }
      await filled(true,true);
      assert.deepEqual((await stored()).keys,['lock','manifest']);
      for(const older of [{lockfileVersion:1,dependencies:{[pkg]:{version:'1.2.0'}}},{...lock,lockfileVersion:2},lock]) {
        await drop(['lock','package-lock.json',older]);
        await p.waitForFunction(async ([key,n])=>{
          const db=await new Promise(res=>{const r=indexedDB.open('deploom-lab-project',1);r.onsuccess=()=>res(r.result);});
          const row=await new Promise(res=>{const r=db.transaction('selected').objectStore('selected').get(key);r.onsuccess=()=>res(r.result);});db.close();
          return JSON.parse(await row.lock.text()).lockfileVersion===n;
        },[prefix,older.lockfileVersion]);
      }
      await p.goto(route('advisories'));await verifyPackage(p,'1.2.0');
      const valid=await stored();
      for(const [slot,name,value,size] of [
        ['manifest','package-lock.json',lock],['manifest','package.json','{broken'],['lock','package-lock.json',{lockfileVersion:2}],
        ['lock','yarn.lock','not a lock'],['lock','package-lock.json','',8_000_001],
      ]) {
        await drop([slot,name,value,size]);
        await p.waitForFunction(slot=>Boolean(document.getElementById('shared-'+slot+'-error').textContent),slot);
        assert.deepEqual(await stored(),valid);
      }
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await p.reload();await filled(true,true);
      for(const page of ['ranges','advisories','audit','plan','tree','compare']) {
        await go(page);await filled(true,true);
        if(page==='ranges') {
          await ready('manifest-status','package.json');
          await selectDirect(p,'range-pkg',man.dependencies[pkg]);
          assert.equal(await p.locator('[name=range]').inputValue(),man.dependencies[pkg]);
          assert.equal(await p.locator('[name=v]').inputValue(),'1.2.0');
          await ready('range-scale','1.2.0');
        } else if(page==='advisories') {
          await verifyPackage(p,'1.2.0');
        } else if(page==='audit') {
          await ready('parse-status',man.name);
          assert.ok(await p.locator('#run-audit').isEnabled());
          assert.equal(await p.locator('#inventory').isVisible(),false);
        } else if(page==='plan') {
          await p.locator('#plan-options').waitFor();
          await p.locator('#plan-mode').selectOption('manual');
          await selectDirect(p,'goal-package',man.dependencies[pkg]);
          await p.locator('#goal-version').fill('1.3.0');
          await p.locator('#make-plan').click();
          await ready('plan-output',pkg);
          await ready('plan-output','1.3.0');
        } else if(page==='tree') {
          await p.locator('#network-map [role=button]').first().waitFor();
          await selectDirect(p,'map-start','1.2.0');
          await ready('network-info',pkg);
        } else {
          await verifyComparison();
        }
        assert.ok(!p.url().includes(pkg) && !p.url().includes(man.name));
      }
      await p.locator('a.language').click();await verifyComparison();assert.equal(await p.locator('html').getAttribute('lang'),'en');
      await p.goto(route('compare','en')+'&example=rollup');await ready('after-source','Rollup');await filled(true,true);
      await p.locator('.project-bar a').click();await verifyComparison();
      const second=await ctx.newPage();await second.goto(route('advisories','en'));
      await verifyPackage(second,'1.2.0');
      await go('advisories');await verifyPackage(p,'1.2.0');
      const yarn='# yarn lockfile v1\n\n"'+pkg+'@^1.0.0":\n  version "1.4.0"\n';
      await drop(['lock','yarn.lock',yarn]);
      await p.waitForFunction(()=>document.getElementById('version').value==='');
      await verifyPackage(p,'1.4.0');
      assert.equal((await stored()).man,valid.man);
      assert.equal(await p.evaluate(()=>window.slotEvents.at(-1)),'lock');
      await second.waitForFunction(()=>document.getElementById('version').value==='');
      await verifyPackage(second,'1.4.0');
      const alternate={...man,name:'another-local-project'};
      await drop(['manifest','package.json',alternate],['lock','package-lock.json',lock]);await verifyPackage(p,'1.2.0',alternate.name);
      assert.equal(JSON.parse((await stored()).man).name,alternate.name);
      const otherScope=prefix==='/'?'/lab/':'/';
      await p.goto(base+otherScope+'index.html?lang=en');await filled(false,false);
      await p.goBack();await filled(true,true);await verifyPackage(p,'1.2.0',alternate.name);
      await p.click('#shared-lock-clear');await filled(true,false);await filled(true,false,second);
      await ready('project-note',alternate.name);assert.equal(JSON.parse((await stored()).man).name,alternate.name);
      await p.click('#shared-manifest-clear');await filled(false,false);await filled(false,false,second);
      assert.equal(await stored(),null);
      await p.reload();await filled(false,false);
      assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
      console.log('PASS',prefix,width,'two independent file slots, validation, rapid drops, all six tools, deep link, no external traffic');
      await ctx.close();
    }
  } finally {await browser.close();server.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
