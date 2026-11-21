'use strict';

const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname,'../docs'), origin = 'http://127.0.0.1:41911';

(async()=>{
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-proxy-server']});
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      assert.equal(url.origin,origin);
      const file=path.resolve(docs,url.pathname.slice(1));
      assert.ok(file.startsWith(docs+path.sep));return route.fulfill({path:file});
    });
    await page.goto(origin+'/tree.html?lang=en');
    const input=page.locator('#tree-manifest');
    await page.locator('#manifest-editor > summary').click();
    const dependencies={react:'18.2.0','react-dom':'18.3.1'};
    for (const [overrides,bad,reason] of [[undefined,1],[{},1],[{whatwg:'2'},1],
      [{'other-parent':{react:'18.2.0'}},1],[{'react-dom@17':{react:'18.2.0'}},1],
      [{'react-dom@18.3.1':{react:'18.2.0'}},0,'react-dom@18.3.1 → react = 18.2.0'],
      [{react:'$react'},0,'react = $react'],[{react:'19'},1,'also outside the override range']]) {
      const man={name:'consumer',dependencies,overrides};
      // A new tree replaces the old DOM after the edit debounce.
      const old=await page.locator('#tree-graph > .tree-root').elementHandles();
      await input.fill(JSON.stringify(man));
      if(old.length) await page.waitForFunction(node=>!node.isConnected,old[0]);
      await page.waitForFunction(()=>document.getElementById('tree-count').textContent.includes('Edges 3'));
      assert.match(await page.locator('#tree-count').textContent(),new RegExp('conflicts '+bad+' ·'));
      assert.equal(await page.locator('.map-edge.peer.bad').count(),bad);
      if (reason) {
        const leaf=page.locator('#tree-graph li').filter({has:page.locator('.tree-note')}).last();
        assert.match(await leaf.textContent(),/peer \^18\.3\.1/);
        assert.ok((await leaf.textContent()).includes(reason));
        if (overrides.react) assert.ok((await leaf.textContent()).includes('expanded elsewhere'));
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS React peer mismatch with empty, unrelated, versioned, referenced and nested overrides');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
