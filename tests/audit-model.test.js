'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function model(fetch) {
  const ctx=vm.createContext({URL,fetch,AbortController,DOMException,setTimeout,clearTimeout,
    document:{createElement:()=>({}),querySelector:()=>null},Lab:{t:(_,en)=>en}});
  ctx.window=ctx;
  for(const file of ['vendor/semver.js','registry.js','severity.js','lock-graph.js','audit-model.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),ctx,{filename:file});
  }
  return ctx.window.LabAudit;
}
function saved(version='1.2.3') {
  return {version,resolved:'https://registry.npmjs.org/lib/-/lib-'+version+'.tgz'};
}
test('inventory deduplicates physical copies and retains the original name for an npm alias',()=>{
  const api=model(()=>assert.fail('Reading a lockfile must stay local'));
  const lock={lockfileVersion:3,packages:{
    '':{},'node_modules/lib':saved(), 'packages/app/node_modules/lib':saved(),
    'node_modules/lib-alias':{...saved(),name:'lib'},'node_modules/other':saved(),
    'node_modules/local':{version:'1.0.0',resolved:'file:../local'},
    'node_modules/local-link':{resolved:'packages/local',link:true},
    'node_modules/vcs':{version:'1.2.3',resolved:'git+https://example.org/project'},
    'node_modules/private':{...saved(),name:'lib',private:true},
    'node_modules/range':{...saved(),name:'lib',version:'^1.2.0'},
    'node_modules/spoof':{...saved(),name:'lib',resolved:'https://registry.npmjs.org.example/lib/-/lib-1.2.3.tgz'},
  }};
  const {rows,skipped}=api.inventory(lock);
  assert.equal(rows.length,1);assert.equal(rows[0].name,'lib');assert.equal(rows[0].paths.length,3);assert.equal(skipped.length,7);
  assert.throws(()=>api.inventory({lockfileVersion:2,packages:{}}),/format/);
});
test('custom registry audit filters each exact version and preserves an incomplete response',async()=>{
  const calls=[];
  const api=model(async(url,options)=>{
    calls.push([url,JSON.parse(options.body)]);
    return json({lib:[{id:42,url:'https://another.example/package/secret',vulnerable_versions:'<2',severity:'high',title:'Review package'}],bad:[{id:43}]});
  });
  const inputs=rows(['lib','lib','bad','empty']).map((r,i)=>({...r,version:i===1?'2.0.0':'1.0.0',state:'unknown'}));
  const findings=new Map();
  await api.registryAudit(inputs,findings,new AbortController().signal);
  assert.equal(calls.length,1);
  assert.equal(new URL(calls[0][0]).pathname,'/-/npm/v1/security/advisories/bulk');
  assert.deepEqual(inputs.map(r=>r.state),['found','empty','unknown','empty']);
  assert.equal(findings.get('42').level,'High');
  assert.equal(findings.get('42').href,'');
});

const json=(data,status=200)=>({ok:status===200,status,json:async()=>data});
const rows=names=>names.map(name=>({name,version:'1.0.0',state:'ready',ids:[]}));
test('only confirmed npm versions reach OSV, queries are paginated per package',async()=>{
  const seen=[];
  const fetch=async(url,options)=>{
    if(url.includes('registry.npmjs.org')) {
      const name=new URL(url).pathname.split('/')[1];
      return name==='removed' ? json({},404) : json({name,version:'1.0.0'});
    }
    const queries=JSON.parse(options.body).queries;
    seen.push(queries.map(q=>[q.package.name,q.page_token]));
    return json({results:queries.map(q=>q.package.name==='clear'?{}:
      q.page_token ? {vulns:[{id:'GHSA-one'},{id:'GHSA-two'}]} : {vulns:[{id:'GHSA-one'}],next_page_token:'next'})});
  };
  const packages=rows(['removed','affected','clear']);
  await model(fetch).check(packages,new AbortController().signal);
  assert.deepEqual(packages.map(r=>r.state),['unknown','found','empty']);
  assert.equal(packages[0].note,'missing');
  assert.deepEqual(Array.from(packages[1].ids),['GHSA-one','GHSA-two']);
  assert.equal(seen.length,2);assert.deepEqual(seen[1],[['affected','next']]);
  assert.ok(!JSON.stringify(seen).includes('removed'));
});
test('explicit public selections reach OSV when npm DNS is unavailable',async()=>{
  const calls=[];
  const api=model(async(url,options)=>{
    calls.push(url);
    if(!url.includes('api.osv.dev')) throw TypeError('DNS');
    return json({results:JSON.parse(options.body).queries.map(q=>q.package.name==='known'?{vulns:[{id:'GHSA-match'}]}:{})});
  });
  const checked=rows(['known','unverified','public']);
  checked[2].publicOrigin=true;
  await api.check(checked,new AbortController().signal,true);
  assert.equal(calls.length,1);
  assert.deepEqual(checked.map(r=>r.state),['found','unknown','empty']);
  assert.ok(checked.every(r=>r.lookedUp));
});
test('on a later-page error, retain previously received IDs and mark coverage incomplete',async()=>{
  const packages=rows(['lib']);
  const fetch=async(url,options)=>{
    if(url.includes('registry.npmjs.org')) return json({name:'lib',version:'1.0.0'});
    return JSON.parse(options.body).queries[0].page_token ? json({},503) :
      json({results:[{vulns:[{id:'GHSA-saved'}],next_page_token:'page-2'}]});
  };
  await model(fetch).check(packages,new AbortController().signal);
  assert.equal(packages[0].state,'unknown');assert.deepEqual(Array.from(packages[0].ids),['GHSA-saved']);
});
test('a missing result is not a clean result; network requests are bounded',async()=>{
  const api=model(async(url)=>url.includes('registry.npmjs.org') ? json({name:'lib',version:'1.0.0'}) : json({results:[]}));
  await assert.rejects(api.check(rows(Array(21).fill('lib')),new AbortController().signal),/size/);
  const packages=rows(['lib']);
  await api.check(packages,new AbortController().signal);assert.equal(packages[0].state,'unknown');
});

test('public origin belongs to each installation even when advisory queries share a key',()=>{
  const api=model(()=>assert.fail('inventory must stay local'));
  const lock={lockfileVersion:3,packages:{'':{},
    'node_modules/lib':saved(),
    'node_modules/a/node_modules/lib':{...saved(),resolved:'https://mirror.example/lib/-/lib-1.2.3.tgz'},
    'node_modules/b/node_modules/lib':{...saved(),resolved:'file:../private'},
  }};
  const {rows}=api.localInventory(lock);
  assert.equal(rows.length,2);
  const pair=rows.find(r=>!r.localOnly);
  assert.equal(pair.publicOrigin,true);
  assert.deepEqual([...pair.publicPaths],['node_modules/lib']);
  assert.equal(pair.paths.length,2);
  assert.equal(rows.find(r=>r.localOnly).publicPaths.size,0);
});

test('published, modified, and aliases keep their source meaning across adapters',()=>{
  const api=model(()=>assert.fail('metadata must stay local'));
  const info=api.advisoryMetadata({
    id:'GHSA-sample',summary:' Verified title ',published:'2025-09-01T01:00:00+03:00',
    modified:'2026-02-23T10:00:00.123456Z',aliases:['CVE-2025-99999','GHSA-sample',{},'CVE-2025-99999']
  },'OSV');
  assert.equal(info.summary,'Verified title');
  assert.equal(info.published,'2025-08-31T22:00:00.000Z');
  assert.equal(info.modified,'2026-02-23T10:00:00.123Z');
  assert.deepEqual([...info.aliases],['CVE-2025-99999']);
  assert.equal(api.advisoryMetadata({created:'2025-08-01',modified:'2025-08-01'},'npm registry').published,null);
  for(const invalid of ['2025-02-30','updated yesterday','2025-02-14T10:30:00',null,12]) assert.equal(api.advisoryDate(invalid),null);
});
