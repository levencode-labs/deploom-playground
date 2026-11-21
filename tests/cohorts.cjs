'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname,'../docs');
const base = 'http://127.0.0.1:41429/';
const names = ['ink','quill','paper','hue','tint','tone'];
const manifest = {name:'writing-app',dependencies:{ink:'1',quill:'1',paper:'1'},
  devDependencies:{hue:'1',tint:'1',tone:'1'}};
function fixtureLock() {
  const packages={'':manifest};
  const deps={ink:['quill','paper','transitive-only'],quill:['paper'],paper:['hue'],
    hue:['tint','tone'],tint:['tone'],tone:[], 'transitive-only':['tone']};
  for (const [name,targets] of Object.entries(deps)) {
    packages['node_modules/'+name]={version:'1.0.0',dependencies:Object.fromEntries(targets.map(n=>[n,'1']))};
  }
  return {lockfileVersion:3,packages};
}
const file=(name,data)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});

async function exercise(browser,width) {
  const ctx=await browser.newContext({viewport:{width,height:820}});
  const external=[], errors=[];
  try {
    await ctx.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==new URL(base).origin) {external.push(url.href); return route.abort();}
      if(url.pathname.startsWith('/audit-data/')) return route.fulfill({status:503,body:''});
      const target=path.resolve(docs,'.'+url.pathname);
      assert.ok(target.startsWith(docs+path.sep));
      return route.fulfill({path:target});
    });
    const page=await ctx.newPage();
    page.setDefaultTimeout(5000);page.on('pageerror',error=>errors.push(error.message));
    const treeTab=page.locator('#view-tree'), packagesTab=page.locator('#view-packages'), groupsTab=page.locator('#view-groups');
    const normal=page.locator('#tree-view'), cohort=page.locator('#cohort-view');
    await page.goto(base+'tree.html?lang=en');
    assert.equal(await page.locator('#network-panel').isVisible(),false);
    await page.locator('#shared-manifest').setInputFiles(file('package.json',manifest));
    await normal.waitFor();
    assert.equal(await treeTab.getAttribute('aria-selected'),'true');
    await packagesTab.click(); await cohort.waitFor();
    assert.equal(await packagesTab.getAttribute('aria-selected'),'true');
    assert.equal(await normal.isVisible(),false);
    const method=cohort.locator('#cohort-grouping');
    assert.equal(await method.inputValue(),'ecosystems');
    await method.selectOption('connections');
    const graph=cohort.locator('#cohort-map'), packages=graph.locator('.cohort-package[data-package]');
    const groups=graph.locator('.cohort-group[data-group]'), bridges=graph.locator('.cohort-bridge[role=button]');
    const details=cohort.locator('#cohort-info');
    async function members() {
      return (await packages.evaluateAll(nodes=>nodes.map(node=>node.dataset.package))).sort();
    }
    assert.deepEqual(await members(),[...names].sort());
    assert.equal(await bridges.count(),0,'A manifest alone does not provide evidence of a dependency between direct packages');
    assert.match(await cohort.innerText(),/lockfile|lock.file/i);
    await packagesTab.press('ArrowRight');
    assert.equal(await groupsTab.getAttribute('aria-selected'),'true');
    assert.equal(await groups.count(),0,'A missing lockfile does not turn unrelated declarations into a group');
    assert.equal(await packages.count(),0);
    await groupsTab.press('ArrowLeft');
    assert.equal(await packagesTab.getAttribute('aria-selected'),'true');
    await page.locator('#shared-lock').setInputFiles(file('package-lock.json',fixtureLock()));
    await bridges.first().waitFor();
    assert.deepEqual(await members(),[...names].sort());
    assert.equal(await groups.count(),2);
    assert.equal(await bridges.count(),1,'Do not add a second bridge by collapsing a path through transitive-only');
    const packageNode=name=>packages.and(graph.locator('[data-package="'+name+'"]'));
    await packageNode('quill').focus();await packageNode('quill').press('Enter');
    assert.match(await details.innerText(),/quill/);

    // Enter via a shareable navigation item, including a real page load with files restored.
    const menu=page.locator('header nav details').filter({has:page.locator('a[href*="view=groups"]')});
    await menu.locator('summary').click();
    await menu.locator('a[href*="view=groups"]').click();
    await groups.first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('view'),'groups');
    assert.equal(await groupsTab.getAttribute('aria-selected'),'true');
    assert.equal(await packages.count(),0,'The groups view contains group nodes only');
    assert.equal(await groups.count(),2);
    const summaries=[];
    for(const group of await groups.all()) {
      await group.focus(); await group.press('Enter');
      summaries.push(await details.locator('.cohort-members button').allTextContents());
    }
    assert.ok(summaries.some(text=>['ink','quill','paper'].every(name=>text.includes(name))));
    assert.ok(summaries.some(text=>['hue','tint','tone'].every(name=>text.includes(name))));
    await bridges.focus(); await bridges.press('Enter');
    const evidence=details.locator('.cohort-evidence li');
    assert.equal(await evidence.count(),1);
    assert.match(await evidence.innerText(),/paper → hue.*dependencies 1/);
    assert.doesNotMatch(await details.innerText(),/transitive-only/);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    await packagesTab.click();
    await packageNode('ink').click();
    await details.locator('[data-open-tree]').click();
    await normal.waitFor();
    assert.equal(await treeTab.getAttribute('aria-selected'),'true');
    assert.match(await page.locator('#map-start').inputValue(),/^ink · 1\.0\.0$/);
    assert.match(await page.locator('#network-info').innerText(),/transitive-only/);
    await packagesTab.click(); await treeTab.click(); await normal.waitFor();
    assert.match(await page.locator('#map-start').inputValue(),/^ink · /,'Switching views preserves the selected tree root');
    await page.locator('#map-back').click();
    assert.match(await page.locator('#map-start').inputValue(),/Project root/);
    await page.locator('#map-forward').click();
    assert.match(await page.locator('#map-start').inputValue(),/^ink · /);

    await groupsTab.click();
    await page.locator('#shared-manifest-clear').click();
    await page.locator('#shared-manifest-zone[data-filled=false]').waitFor();
    await normal.waitFor();
    assert.equal(await groupsTab.isDisabled(),true);assert.equal(await packagesTab.isDisabled(),true);
    assert.equal(await cohort.isVisible(),false);
    assert.match(await page.locator('#groups-require-manifest').innerText(),/package\.json/);
    await page.locator('#shared-lock-clear').click();
    await page.locator('#network-panel').waitFor({state:'hidden'});
    await page.locator('#shared-manifest').setInputFiles(file('package.json',{dependencies:{'replacement-only':'1'}}));
    await packagesTab.click();
    assert.deepEqual(await members(),['replacement-only']);
    assert.doesNotMatch(await details.innerText(),/transitive-only|\bpaper\b|\bink\b/);
    assert.equal(await bridges.count(),0);
    await page.locator('#shared-manifest').setInputFiles(file('package.json',{devDependencies:{eslint:'9',typescript:'5','@typescript-eslint/parser':'8','@storybook/react':'8',storybook:'8'}}));
    await method.selectOption('ecosystems');
    await groupsTab.click();
    await graph.getByRole('button',{name:/^ESLint ·/}).waitFor();
    const ecosystemLabels=await groups.allTextContents();
    for (const name of ['ESLint','TypeScript','Storybook']) assert.ok(ecosystemLabels.some(label=>label.includes(name)));
    assert.equal(await bridges.count(),0,'Ecosystem membership alone supplies no evidence for a bridge');
    await graph.getByRole('button',{name:/^Storybook ·/}).press('Enter');
    assert.deepEqual(await details.locator('.cohort-members button').allTextContents(),['@storybook/react','storybook']);
    await method.selectOption('connections');
    assert.equal(await groups.count(),0,'A topical family is not a lockfile cluster');
    await method.selectOption('ecosystems');
    await page.emulateMedia({reducedMotion:'reduce'});
    await packagesTab.click();
    assert.equal(await graph.evaluate(el=>el.getAnimations({subtree:true}).length),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    console.log('PASS dependency map views, direct membership, cohort bridge evidence and tree drill at '+width+'px');
  } finally {await ctx.close();}
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  try {for(const width of [375,1280]) await exercise(browser,width);} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
