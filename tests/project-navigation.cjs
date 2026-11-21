'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname,'../docs');
const pkg = 'local-project-widget';
const man = {name:'private-project-marker',dependencies:{[pkg]:'^1.0.0'}};
const lock = {lockfileVersion:3,packages:{'':man,['node_modules/'+pkg]:{version:'1.2.0'}}};

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
  const fallback=await fs.mkdtemp(path.join(os.tmpdir(),'lab-folder-check-'));
  try {
    for(const [prefix,native] of [['/',true],['/lab/',false]]) {
      const ctx=await browser.newContext();
      const external=[], errors=[];
      await ctx.route(/^https:/,route=>{external.push(route.request().url());return route.abort();});
      await ctx.addInitScript(({native,man,lock})=>{
        if(!native){window.showDirectoryPicker=undefined;return;}
        // Return a real Chromium directory handle; only the operating-system dialog is substituted.
        window.showDirectoryPicker=async options=>{
          if(options?.mode!=='read')throw Error('Expected read-only picker');
          sessionStorage.setItem('picker-calls',String(Number(sessionStorage.getItem('picker-calls') || 0)+1));
          const root=await navigator.storage.getDirectory();
          const dir=await root.getDirectoryHandle('Shared folder',{create:true});
          for(const [name,data] of [['package.json',man],['package-lock.json',lock]]) {
            const file=await dir.getFileHandle(name,{create:true});const stream=await file.createWritable();
            await stream.write(JSON.stringify(data));await stream.close();
          }
          return dir;
        };
      },{native,man,lock});
      const p=await ctx.newPage();p.setDefaultTimeout(7000);
      p.on('pageerror',error=>errors.push(error.message));
      const route=(page,lang='ru')=>base+prefix+page+'.html?lang='+lang;
      const go=page=>p.goto(route(page));
      const ready=(id,part)=>p.waitForFunction(([id,part])=>document.getElementById(id)?.textContent.includes(part),[id,part]);
      const name=native?'Shared folder':path.basename(fallback);
      await go('index');
      if(native) await p.click('#shared-choose');
      else {
        for(const [filename,data] of [['package.json',man],['package-lock.json',lock]])await fs.writeFile(path.join(fallback,filename),JSON.stringify(data));
        const [chooser]=await Promise.all([p.waitForEvent('filechooser'),p.click('#shared-choose')]);await chooser.setFiles(fallback);
      }
      await ready('shared-name',name);
      for(const [page,id,part] of [['ranges','range-dep',pkg],['advisories','project-choice',pkg+'@1.2.0'],['audit','parse-status',man.name],['plan','goal-package',pkg],['tree','tree-mode','npm'],['compare','after-source','package-lock.json']]) {
        await go(page);await ready('shared-name',name);
        if(page==='tree')await p.waitForFunction(value=>document.getElementById('tree-manifest').value.includes(value),pkg);
        else await ready(id,part);
        if(page==='compare'){assert.equal(await p.locator('#before-source').textContent(),'');assert.equal(await p.locator('#report').isVisible(),false);}
        assert.ok(!p.url().includes(pkg) && !p.url().includes(encodeURIComponent(name)));
      }
      await p.locator('a.language').click();await ready('after-source','package-lock.json');assert.equal(await p.locator('html').getAttribute('lang'),'en');
      await p.goto(route('compare','en')+'&example=rollup');await ready('after-source','Rollup');await ready('shared-name',name);
      assert.equal(await p.locator('.project-bar a').isVisible(),true);
      await p.locator('.project-bar a').click();await ready('after-source','package-lock.json');
      const otherScope=prefix==='/'?'/lab/':'/';
      await p.goto(base+otherScope+'index.html?lang=en');await p.locator('#shared-choose').waitFor();assert.equal(await p.locator('#shared-name').isVisible(),false);
      await p.goBack();await ready('shared-name',name);await ready('after-source','package-lock.json');
      const second=await ctx.newPage();await second.goto(route('advisories','en'));await second.locator('#project-choice option').filter({hasText:pkg}).waitFor({state:'attached'});
      if(native)assert.equal(await p.evaluate(()=>sessionStorage.getItem('picker-calls')),'1');
      await p.click('#shared-close');await p.waitForFunction(()=>document.getElementById('shared-name')?.hidden);
      await second.waitForFunction(()=>document.getElementById('shared-name')?.hidden);
      await p.goBack();await p.goForward();await p.waitForFunction(()=>document.getElementById('shared-name')?.hidden);
      assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
      console.log('PASS',prefix,native?'directory handle':'folder input snapshots','six tools, locale, deep link, back/forward, close and other tab');
      await ctx.close();
    }
  } finally {
    await browser.close();server.close();
    for(const f of ['package.json','package-lock.json'])await fs.rm(path.join(fallback,f),{force:true});
    await fs.rmdir(fallback);
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
