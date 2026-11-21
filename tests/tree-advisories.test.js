'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const now = Math.floor(Date.now()/1000);
const events = [{introduced:'0'},{fixed:'2.0.1'}];
const advisory = (id,severity='HIGH') => ({id,severity,versions:[],ranges:[{type:'SEMVER',events}]});
const tarball = version => ({version,resolved:'https://registry.npmjs.org/nth-check/-/nth-check-'+version+'.tgz'});
const npm = (entries={}) => ({'':{},...entries});

function index(overrides={}) {
  return {schema:1,source:'OSV',ecosystem:'npm',coverage:'npm-ecosystem',rows:1,published:now-500,expires:now+500,
    packages:{'nth-check':[advisory('GHSA-example')]},...overrides};
}
function fixture(data) {
  const requests = [];
  const context = vm.createContext({Lab:{t:(_,en)=>en},URL,fetch:async (url,options) => {
    requests.push({url,options});
    if (!data) throw Error('unavailable');
    return {ok:true,json:async()=>data};
  }});
  context.window=context;
  const files=['vendor/semver.js','vendor/js-yaml.min.js','vendor/yarn-classic.js','yarn-lock.js','lock-graph.js',
    'severity.js','audit-model.js','hosted-audit.js','tree-advisories.js'];
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),context,{filename:file});
  return {requests,forLock:context.LabTreeAdvisories.forLock,read:context.LabYarn.read};
}

test('map checks exact installed copies, preserves provenance and only downloads one generic same-origin snapshot',async()=>{
  const f=fixture(index()), packages=npm({
    'node_modules/alias':{name:'nth-check',...tarball('1.0.2')},
    'node_modules/nth-check':tarball('2.0.1'),
    'node_modules/old/node_modules/nth-check':{version:'1.0.2'},
    'node_modules/workspace':{version:'1.0.2',link:true},
    'node_modules/private':{version:'1.0.2',private:true},
    'node_modules/git':{version:'1.0.2',resolved:'git+ssh://git.example/private/repo'}
  });
  Object.defineProperty(packages,'unrelated',{enumerable:true,get(){throw Error('enumerated an invisible copy');}});
  const map=f.forLock(packages);
  for(const path of ['', 'unlocked', 'node_modules/workspace', 'node_modules/private', 'node_modules/git']) {
    assert.equal((await map.lookup(path)).state,'unknown');
  }
  assert.equal((await f.forLock(null).lookup('nth-check@1.0.2')).state,'unknown');
  assert.equal(f.requests.length,0);
  const [affected,fixed,ambiguous]=await Promise.all(['node_modules/alias','node_modules/nth-check',
    'node_modules/old/node_modules/nth-check'].map(map.lookup));
  assert.equal(affected.state,'found');
  assert.equal(affected.entries[0].level,'High');
  assert.equal(fixed.state,'empty');
  assert.equal(ambiguous.state,'unknown');assert.equal(ambiguous.entries[0].id,'GHSA-example');
  assert.match(ambiguous.reason,/public origin is unconfirmed/);
  assert.equal(f.requests.length,1);
  assert.equal(f.requests[0].url,'audit-data/osv-npm-v1.json');
  assert.equal(f.requests[0].options.mode,'same-origin');assert.equal(f.requests[0].options.body,undefined);
});

test('deduplicates overlapping package ranges and advisory aliases, drops withdrawn records and keeps metadata',async()=>{
  const rows=[advisory('GHSA-one'),advisory('GHSA-one'),advisory('CVE-two','MEDIUM'),advisory('OUT-1'),{...advisory('OUT-2'),withdrawn:'2026-01-01'}];
  const f=fixture(index({rows:rows.length,packages:{'nth-check':rows},advisories:{
    'GHSA-one':{aliases:['CVE-two','CVE-two'],summary:'Advisory title',published:'2026-01-01T00:00:00Z'},
    'CVE-two':{aliases:['OSV-three']},
    'OUT-1':{withdrawn:'2026-01-01'}
  }}));
  const result=await f.forLock(npm({'node_modules/nth-check':tarball('1.0.2')})).lookup('node_modules/nth-check');
  assert.equal(result.entries.length,1);
  const entry=result.entries[0];
  assert.equal(entry.id,'GHSA-one');assert.equal(entry.level,'High');assert.equal(entry.summary,'Advisory title');
  assert.deepEqual(Array.from(entry.aliases),['CVE-two','OSV-three']);
  assert.equal(entry.published,'2026-01-01T00:00:00Z');
});

test('Yarn Classic tarballs and Berry descriptors keep distinct provenance',async()=>{
  const f=fixture(index());
  const classic=f.read('# yarn lockfile v1\n\nnth-check@^1.0.0:\n  version "1.0.2"\n  resolved "https://registry.yarnpkg.com/nth-check/-/nth-check-1.0.2.tgz"\n');
  const berry=f.read('__metadata:\n  version: 8\n"nth-check@npm:^1.0.0":\n  version: "1.0.2"\n  resolution: "nth-check@npm:1.0.2"\n');
  assert.equal((await f.forLock(classic.packages).lookup('nth-check@^1.0.0')).state,'found');
  const result=await f.forLock(berry.packages).lookup('nth-check@npm:^1.0.0');
  assert.equal(result.state,'unknown');assert.equal(result.publicOrigin,false);assert.equal(result.entries[0].level,'High');
  assert.equal(f.requests.length,1);
});

test('incomplete, unavailable and expired data never produce a clean verdict',async()=>{
  for(const data of [null,index({expires:now-30}),index({packages:{'nth-check':[{id:'unknown',versions:[],ranges:[{type:'GIT',events:[]}]}]}})]) {
    const f=fixture(data), key='node_modules/nth-check';
    const map=f.forLock(npm({[key]:tarball('1.0.2')}));
    const result=await map.lookup(key);
    assert.equal(result.state,'unknown');assert.ok(result.reason);
    await map.lookup(key);assert.equal(f.requests.length,1);
  }
});
