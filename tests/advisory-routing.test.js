'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function advisoryPage(address, reply) {
  const fields = new Map(), calls = [], events = {};
  function element(tag) {
    return {tag, value:'', children:[], listeners:{},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      removeAttribute(key) { delete this[key]; },
      append(...items) { this.children.push(...items); },
      add(option) { this.children.push(option); },
      replaceChildren(...children) { this.children = children; },
      focus() {}, setCustomValidity() {}};
  }
  function field(id) {
    if (!fields.has(id)) fields.set(id,element('div'));
    return fields.get(id);
  }
  const ctx = vm.createContext({
    document:{getElementById:field,createElement:element,querySelector:()=>null},
    location:{search:''},
    URL, URLSearchParams, AbortController, DOMException, setTimeout, clearTimeout,
    addEventListener(name,handler){events[name]=handler;}, Option:class {constructor(label,value) {this.label=label;this.value=value;}}, Lab:{t:(_,en)=>en},
    fetch:async (url,options) => {
      calls.push({url, redirect:options.redirect, body:JSON.parse(options.body)});
      return {ok:true,status:200,json:async()=>reply};
    },
  });
  ctx.window=ctx;
  for (const script of ['vendor/semver.js','lock-graph.js','vendor/yarn-classic.js','vendor/js-yaml.min.js','yarn-lock.js','registry.js','severity.js','audit-model.js','advisories.js']) {
    let source=fs.readFileSync(path.join(__dirname,'../docs',script),'utf8');
    if (script==='registry.js' && address!=='https://registry.npmjs.org/') {
      const config='const configuredBase = defaultBase;';
      assert.ok(source.includes(config));
      source=source.replace(config,'const configuredBase = '+JSON.stringify(address)+';');
    }
    vm.runInContext(source,ctx,{filename:script});
  }
  async function submit(name,version) {
    field('package').value=name;
    field('version').value=version;
    await field('advisory-form').listeners.submit({preventDefault(){}});
  }
  return {calls,field,submit,registry:ctx.LabRegistry,load:detail=>events['lab-project']({detail})};
}

test('a scoped name is sent only to the selected mirror on submit; hostile result links stay text',async()=>{
  const base='https://packages.example.test/npm/',name='@private/widget';
  const page=advisoryPage(base,{[name]:[
    {id:71,vulnerable_versions:'<2.0.0',title:'Example',severity:'high',url:'https://github.com/advisories/?affects='+encodeURIComponent(name)},
    {id:72,vulnerable_versions:'<2.0.0',url:base+'advisories/72'},
  ]});
  assert.equal(page.calls.length,0);
  await page.submit(name,'1.0.0');
  assert.deepEqual(page.calls,[{url:base+'-/npm/v1/security/advisories/bulk',redirect:'error',body:{[name]:['1.0.0']}}]);
  assert.equal(page.field('github-link').href,undefined);
  const links=page.field('advisories').children.flatMap(item=>item.children.filter(x=>x?.tag==='a').map(a=>a.href));
  assert.deepEqual(links,[base+'advisories/72']);
  assert.match(page.field('query-status').textContent,/Advisories found.*2/);
  assert.equal(new URL(page.registry.url(name)).href,base+'@private%2Fwidget');
});

test('an incomplete or unavailable mirror never falls back to a public service',async()=>{
  const page=advisoryPage('https://packages.example.test/npm/',{bad:{error:'partial'}});
  await page.submit('bad','1.0.0');
  assert.match(page.field('query-status').textContent,/unknown/i);
  assert.equal(page.calls.length,1);
  assert.equal(page.field('github-link').href,undefined);
});

test('switching projects uses lock versions, leaves manifest ranges unselected, and stays offline',async()=>{
  const page=advisoryPage('https://packages.example.test/npm/',{});
  const file=data=>({size:200,text:async()=>JSON.stringify(data)});
  await page.load({name:'A',lock:file({lockfileVersion:3,packages:{'':{},
    'node_modules/pkg':{version:'1.0.0'},'node_modules/app/node_modules/pkg':{version:'1.2.0'}}})});
  const choice=page.field('project-choice');
  assert.deepEqual(choice.children.slice(1).map(x=>x.label),['pkg@1.0.0','pkg@1.2.0']);
  choice.value='1';choice.listeners.change();
  assert.equal(page.field('version').value,'1.2.0');
  let finish;
  const stale=page.load({name:'old',lock:{size:1,text:()=>new Promise(resolve=>{finish=resolve;})}});
  await page.load({name:'B',manifest:file({dependencies:{example:'^4.0.0'}})});
  finish('invalid');await stale;
  assert.match(page.field('project-note').textContent,/Names from package.json/);
  choice.value='0';choice.listeners.change();
  assert.equal(page.field('package').value,'example');assert.equal(page.field('version').value,'');
  await page.load(null);assert.equal(page.field('project-picker').hidden,true);
  assert.equal(page.field('package').value,'');assert.equal(page.calls.length,0);
});

test('an unscoped entry without public provenance also needs permission for OSV',async()=>{
  const page=advisoryPage('https://registry.npmjs.org/',{});
  await page.load({name:'C',manifest:{size:80,text:async()=>'{"dependencies":{"local-name":"^1"}}'}});
  await page.submit('local-name','1.0.0');
  assert.equal(page.calls.length,0);
  assert.equal(page.field('scope-confirmation').hidden,false);
});

test('public mode retains OSV and the optional GitHub link after scope confirmation',async()=>{
  const page=advisoryPage('https://registry.npmjs.org/',{vulns:[{id:'GHSA-example'}]});
  await page.submit('@public/widget','1.0.0');
  assert.equal(page.calls.length,0);
  page.field('public-scope').checked=true;
  await page.submit('@public/widget','1.0.0');
  assert.equal(page.calls[0].url,'https://api.osv.dev/v1/query');
  assert.equal(new URL(page.field('github-link').href).searchParams.get('affects'),'@public/widget@1.0.0');
});
