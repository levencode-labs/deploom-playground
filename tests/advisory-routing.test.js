'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');

function advisoryPage(address,reply) {
  const fields=new Map(),calls=[],events={};
  function element(tag) {
    return {tag,value:'',children:[],listeners:{},
      get childElementCount(){return this.children.filter(node=>typeof node==='object').length;},
      addEventListener(type,fn){this.listeners[type]=fn;},
      removeAttribute(key){delete this[key];}, append(...items){this.children.push(...items);},
      replaceChildren(...items){this.children=items;},focus(){}};
  }
  function field(id){if(!fields.has(id))fields.set(id,element('div'));return fields.get(id);}
  const combo={items:[],setItems(items){this.items=items;},setValue(value){field('package').value=value;}};
  const ctx=vm.createContext({
    document:{getElementById:field,createElement:element,querySelector:()=>null},
    location:{search:''},URL,URLSearchParams,AbortController,DOMException,setTimeout,clearTimeout,
    addEventListener(name,listener){events[name]=listener;}, Lab:{t:(_,en)=>en},
    LabPackageCombo:{direct(man){return [...ctx.LabLockGraph.declarations(man,true)];},attach(input,{onSelect}){combo.choose=onSelect;return combo;}},
    fetch:async (url,options)=>{
      calls.push({url,redirect:options.redirect,body:JSON.parse(options.body)});
      return {ok:true,status:200,json:async()=>reply};
    },
  });ctx.window=ctx;
  for(const name of ['vendor/semver','lock-graph','vendor/yarn-classic','vendor/js-yaml.min','yarn-lock','registry','severity','audit-model','finding-cards','advisories']) {
    let source=fs.readFileSync(path.join(__dirname,'../docs',name+'.js'),'utf8');
    if(name==='registry')source=source.replace('const configuredBase = defaultBase;','const configuredBase = '+JSON.stringify(address)+';');
    vm.runInContext(source,ctx,{filename:name});
  }
  async function submit(name,version) {
    field('package').value=name;field('version').value=version;
    await field('advisory-form').listeners.submit({preventDefault(){}});
  }
  return {calls,field,combo,submit,registry:ctx.LabRegistry,load:detail=>events['lab-project']({detail})};
}
function all(node){return [node,...(node.children||[]).flatMap(all)];}
function openCard(li){const d=li.children[0];d.open=true;d.listeners.toggle();}

test('mirror routing shows titles in summary, IDs inside, only same-registry source links',async()=>{
  const base='https://packages.example.test/npm/',name='@private/widget';
  const page=advisoryPage(base,{[name]:[
    {id:71,vulnerable_versions:'<2.0.0',title:'Example',severity:'high',url:'https://github.com/advisories/?affects='+encodeURIComponent(name)},
    {id:72,vulnerable_versions:'<2.0.0',url:base+'advisories/72'},
  ]});
  assert.equal(page.calls.length,0);
  await page.submit(name,'1.0.0');
  assert.deepEqual(page.calls,[{url:base+'-/npm/v1/security/advisories/bulk',redirect:'error',body:{[name]:['1.0.0']}}]);
  const cards=page.field('advisories');
  assert.ok(all(cards).some(node=>node.textContent==='Example'));
  assert.ok(!all(cards).some(node=>node.textContent==='71'));
  cards.children.forEach(openCard);
  assert.deepEqual(all(cards).filter(n=>n.tag==='a').map(n=>n.href),[base+'advisories/72']);
  assert.ok(all(cards).some(node=>node.textContent==='71'));
  assert.match(page.field('query-status').textContent,/Advisories found.*2/);
});
test('incomplete mirror data never falls back to a public service',async()=>{
  const page=advisoryPage('https://packages.example.test/npm/',{bad:{error:'partial'}});
  await page.submit('bad','1.0.0');assert.match(page.field('query-status').textContent,/unknown/i);
  assert.equal(page.calls.length,1);
});
test('uses only direct manifest names with their own installed root version; switching projects stays offline',async()=>{
  const p=advisoryPage('https://packages.example.test/npm/',{});
  const file=data=>({size:200,text:async()=>JSON.stringify(data)});
  const manifest={name:'A',dependencies:{pkg:'^1'}};
  const lock=file({lockfileVersion:3,packages:{'':manifest,
    'node_modules/pkg':{version:'1.0.0'},'node_modules/app/node_modules/pkg':{version:'1.2.0'},'node_modules/transitive':{version:'1.0.0'}}});
  await p.load({lock});assert.equal(p.combo.items.length,0);
  await p.load({manifest:file(manifest),lock});
  assert.deepEqual(Array.from(p.combo.items,x=>[x.name,x.version]),[['pkg','1.0.0']]);
  p.combo.choose(p.combo.items[0]);assert.equal(p.field('version').value,'1.0.0');
  let finish;
  const stale=p.load({lock:{size:1,text:()=>new Promise(resolve=>{finish=resolve;})}});
  await p.load({manifest:file({name:'B',dependencies:{example:'^4.0.0'}})});
  finish('invalid');await stale;
  assert.match(p.field('project-note').textContent,/B .*Suggestions from package.json/);
  p.combo.choose(p.combo.items[0]);assert.equal(p.field('package').value,'example');assert.equal(p.field('version').value,'');
  await p.load(null);assert.equal(p.combo.items.length,0);assert.equal(p.field('package').value,'');assert.equal(p.calls.length,0);
});
test('an unscoped entry without public provenance needs explicit permission for OSV',async()=>{
  const page=advisoryPage('https://registry.npmjs.org/',{});
  await page.load({manifest:{size:80,text:async()=>'{"dependencies":{"local-name":"^1"}}'}});
  await page.submit('local-name','1.0.0');assert.equal(page.calls.length,0);assert.equal(page.field('scope-confirmation').hidden,false);
});
test('known records are deduplicated and public queries wait for scope confirmation',async()=>{
  const p=advisoryPage('https://registry.npmjs.org/',{vulns:[{id:'GHSA-example'},{id:'GHSA-example'}]});
  await p.submit('@public/widget','1.0.0');assert.equal(p.calls.length,0);
  p.field('public-scope').checked=true;await p.submit('@public/widget','1.0.0');
  assert.equal(p.calls[0].url,'https://api.osv.dev/v1/query');assert.equal(p.field('advisories').children.length,1);
});
