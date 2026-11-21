'use strict';

const path=require('node:path');
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs=path.resolve(__dirname,'../docs'), origin='http://127.0.0.1:41411';

async function exercise(browser,width) {
  const ctx=await browser.newContext({viewport:{width,height:850}});
  try {
    const external=[], errors=[];
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin){external.push(url.origin);return route.abort();}
      const file=path.resolve(docs,url.pathname.slice(1));
      assert.ok(file.startsWith(docs+path.sep));
      return route.fulfill({path:file});
    });
    const page=await ctx.newPage(); page.on('pageerror',err=>errors.push(err.message));
    await page.goto(origin+'/tree.html?lang=en');
    const man={name:'fixture-project',dependencies:{},devDependencies:{'z-dev-tool':'^2.0.3'}};
    const packages={'':man};
    for(let i=0;i<100;i++) {
      const name='@fixture/build-'+String(i).padStart(3,'0');
      man.dependencies[name]='1.0.0';
      packages['node_modules/'+name]={version:'1.0.0'};
    }
    packages['node_modules/z-dev-tool']={version:'2.1.0',dependencies:{'nested-only':'1'}};
    packages['node_modules/nested-only']={version:'1.0.0'};
    const file=(name,data)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    await page.locator('#shared-manifest').setInputFiles(file('package.json',man));
    await page.locator('#tree-details > summary').click();
    await page.locator('#tree-netbox > summary').click();
    const metadata=page.locator('#tree-registry-package');
    await metadata.fill('019');
    await page.getByRole('option',{name:/build-019/}).click();
    assert.deepEqual(external,[]);
    const lookedUp=[];
    await ctx.route('https://registry.npmjs.org/**',route=>{
      lookedUp.push(route.request().url());
      return route.fulfill({json:{name:'@fixture/build-019',version:'1.0.0',dependencies:{next:'1'}}});
    });
    await page.locator('#tree-load-meta').click();
    await page.waitForFunction(()=>document.querySelector('#tree-network-result').textContent.includes('Loaded metadata'));
    assert.deepEqual(lookedUp,['https://registry.npmjs.org/@fixture%2Fbuild-019/1.0.0']);
    await page.locator('#shared-lock').setInputFiles(file('package-lock.json',{lockfileVersion:3,packages}));
    await page.waitForFunction(()=>document.querySelector('#map-limit')?.textContent.includes('103'));
    const start=page.locator('#map-start');
    await start.fill('nested-only');
    assert.equal(await page.locator('[role=listbox]:visible [role=option]').count(),0);
    await start.fill('z-dev-tool');
    await page.getByRole('option',{name:/z-dev-tool/}).waitFor();
    await start.press('ArrowDown'); await start.press('Enter');
    const positions=()=>page.locator('.map-node').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>{
      const {e,f}=n.transform.baseVal.getItem(0).matrix;
      return [n.querySelector('text').textContent,[e,f]];
    })));
    let nodes=await positions();
    assert.ok(nodes['z-dev-tool'][0]<nodes['nested-only'][0]);
    await page.locator('#map-layout').selectOption('vertical');
    nodes=await positions();
    assert.ok(nodes['z-dev-tool'][1]<nodes['nested-only'][1]);
    assert.equal(nodes['z-dev-tool'][0],nodes['nested-only'][0]);
    await page.goto(origin+'/ranges.html?lang=en');
    const pkg=page.locator('#range-pkg');
    await page.waitForFunction(()=>document.getElementById('manifest-status').textContent.includes('package.json'));
    assert.equal(await pkg.inputValue(),'');
    await pkg.fill('nested-only'); assert.equal(await page.locator('[role=listbox]:visible [role=option]').count(),0);
    await pkg.fill('z-dev-tool');await page.getByRole('option',{name:/z-dev-tool/}).click();
    assert.equal(await page.locator('[name=range]').inputValue(),'^2.0.3');
    assert.equal(await page.locator('[name=v]').inputValue(),'2.1.0');
    await page.locator('[name=v]').fill('2.0.0');
    assert.equal(await page.locator('.interval-expression').innerText(),'2.0.3 ≤ v < 3.0.0');
    assert.match(await page.locator('.range-verdict').innerText(),/2.0.0 is outside/);
    await page.locator('[name=v]').fill('');
    await page.locator('.interval-band').waitFor();
    await page.locator('[name=range]').fill('<1 || >=2');
    assert.equal(await page.locator('.interval-expression').count(),2);
    await page.locator('[name=range]').fill('workspace:*');
    assert.equal(await page.locator('.interval-band').count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(external,[]); assert.deepEqual(errors,[]);
    console.log('PASS map rotation, direct package combobox and offline semver intervals at '+width+'px');
  } finally {await ctx.close();}
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-proxy-server']});
  try {for(const width of [375,1280]) await exercise(browser,width);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
