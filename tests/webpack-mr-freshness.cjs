'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const docs = path.resolve(__dirname,'../docs');
const base = 'http://127.0.0.1:18432';
const packages = {
  anniversary:['2023-03-01T12:00:00Z','2024-03-01T12:00:00Z'],
  'leap-cutoff':['2023-02-28T12:00:00Z','2024-02-29T12:00:00Z'],
  'before-cutoff':['2023-03-01T11:59:59.999Z','2024-03-01T12:00:00Z'],
  'no-date':[null,'2024-03-01T12:00:00Z'],
};
const file=(name,data)=>({name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});

async function run() {
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,args:['--no-proxy-server']});
  try {
    const page=await browser.newPage({viewport:{width:375,height:840}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin===base) return route.fulfill({path:path.join(docs,url.pathname)});
      if(url.origin==='https://registry.npmjs.org' && Object.hasOwn(packages,url.pathname.slice(1))) {
        const name=url.pathname.slice(1),[installed,latest]=packages[name];
        return route.fulfill({headers:{'Access-Control-Allow-Origin':base},json:{name,
          versions:{'1.0.0':{name,version:'1.0.0'},'2.0.0':{name,version:'2.0.0'}},time:{'1.0.0':installed,'2.0.0':latest}}});
      }
      if(url.href==='https://api.osv.dev/v1/querybatch') return route.fulfill({headers:{'Access-Control-Allow-Origin':base},
        json:{results:route.request().postDataJSON().queries.map(()=>({}))}});
      throw Error('Unexpected destination: '+url.href);
    });
    await page.goto(base+'/combinations.html?lang=ru#build-mr');
    const goal=page.locator('#mr-goal'), issues=page.locator('.mr-blocker');
    assert.match(await goal.textContent(),/Конфликтов: 2/);
    assert.deepEqual(await issues.allTextContents(),[
      'webpack-cli@3.3.12 → webpack 4.x.x · блокирует обновление',
      'mini-css-extract-plugin@0.9.0 → webpack ^4.4.0 · блокирует обновление',
    ]);
    await page.locator('#mr-webpack-cli').selectOption('4.10.0');
    assert.match(await goal.textContent(),/Конфликтов: 1/);
    assert.match(await issues.innerText(),/mini-css-extract-plugin@0.9.0/);
    await page.locator('#mr-mini-css-extract-plugin').selectOption('2.9.0');
    assert.match(await goal.innerText(),/согласован по peerDependencies/);
    assert.match(await page.locator('#mr-check').innerText(),/построил lock-файл[\s\S]+собрали страницу с css-loader 3\.6\.0[\s\S]+page\.css[\s\S]+\.review-status \{ color: #1456a1; \}/);
    const proof=page.locator('#mr-record');
    assert.equal(await proof.isVisible(),true);
    assert.deepEqual(await proof.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),
      ['webpack-plan.json','https://github.com/levencode-labs/deploom-playground/blob/main/tests/webpack-core-build.cjs']);
    await page.locator('#mr-webpack-cli').selectOption('3.3.12');
    assert.match(await issues.innerText(),/webpack-cli@3.3.12/);
    assert.equal(await proof.isVisible(),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const manifest={name:'calendar',dependencies:Object.fromEntries(Object.keys(packages).map(name=>[name,'1.0.0']))};
    const lock={lockfileVersion:3,packages:{'':manifest}};
    for(const name of Object.keys(packages))lock.packages['node_modules/'+name]={version:'1.0.0',
      resolved:'https://registry.npmjs.org/'+name+'/-/'+name+'-1.0.0.tgz'};
    await page.goto(base+'/audit.html?lang=en');
    await page.locator('#shared-manifest').setInputFiles(file('package.json',manifest));
    await page.locator('#shared-lock').setInputFiles(file('package-lock.json',lock));
    await page.locator('#run-audit').click();
    await page.locator('#age-count').waitFor();
    assert.equal(await page.locator('#age-count').innerText(),'33%');
    assert.match(await page.locator('#age-ratio').innerText(),/1 \/ 3/);
    assert.match(await page.locator('#age-coverage').innerText(),/3 \/ 4/);
    await page.locator('#age-heading').click();
    assert.match(await page.locator('#age-rows').innerText(),/^before-cutoff /);
    await page.goto(base+'/plan.html?lang=en');
    await page.locator('#make-plan').click();
    await page.locator('#plan-output').waitFor();
    const plan=await page.locator('#plan-output').innerText();
    assert.match(plan,/Fresh now: 2\/4/);
    assert.match(plan,/dates for 3\/4/);
    assert.match(plan,/before-cutoff 1.0.0 → 2.0.0/);
    assert.deepEqual(errors,[]);
    console.log('PASS webpack MR choices, independent build evidence, and calendar cutoffs in the audit and planner');
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
