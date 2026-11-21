'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const timestamp=Math.floor(Date.now()/1000);
const row=(name,version,publicOrigin=true)=>({name,version,publicOrigin});
const advisory=(id,events)=>({id,severity:'HIGH',versions:[],ranges:[{type:'SEMVER',events}]});
function snapshot(packages,extra={}) {
  return {schema:1,source:'OSV',ecosystem:'npm',coverage:'npm-ecosystem',published:timestamp-90,expires:timestamp+500,
    rows:Object.values(packages).reduce((total,records)=>total+records.length,0),packages,...extra};
}
function model(data) {
  const requests=[];
  const ctx=vm.createContext({Lab:{t:(_,en)=>en},fetch:async(path,opts)=>{
    requests.push([path,opts]);return {ok:true,json:async()=>structuredClone(data)};
  }});
  ctx.window=ctx;
  for(const script of ['vendor/semver.js','severity.js','hosted-audit.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',script),'utf8'),ctx,{filename:script});
  const api=ctx.LabHostedAudit;
  async function run(rows) {
    const signal=new AbortController().signal, index=await api.load(signal),records=new Map();
    api.check(index,rows,records,signal);return records;
  }
  return {api,requests,run};
}

test('the saved lodash and nth-check advisories match before the public fix, including prereleases',async()=>{
  // Published npm affected ranges in osv.dev/vulnerability/GHSA-35jh-r3h4-6jhm and GHSA-rp65-9cf3-cjxr.
  const db=model(snapshot({
    lodash:[advisory('GHSA-35jh-r3h4-6jhm',[{introduced:'0'},{fixed:'4.17.21'}])],
    'nth-check':[advisory('GHSA-rp65-9cf3-cjxr',[{introduced:'0'},{fixed:'2.0.1'}])],
  }));
  const inputs=[row('lodash','4.17.20'),row('lodash','4.17.21'),row('nth-check','2.0.1-rc.1'),row('nth-check','2.0.1')];
  const results=await db.run(inputs);
  assert.deepEqual(inputs.map(r=>r.state),['found','empty','found','empty']);
  assert.ok(inputs.every(r=>r.lookedUp));
  assert.equal(results.get('GHSA-35jh-r3h4-6jhm').level,'High');
  assert.equal(results.get('GHSA-rp65-9cf3-cjxr').href,'');
  await db.run([row('@private/internal-library','1.0.0',false)]);
  const [request]=db.requests;
  assert.equal(db.requests.length,1);
  assert.equal(request[0],'audit-data/osv-npm-v1.json');assert.equal(request[1].mode,'same-origin');assert.equal(request[1].body,undefined);
});

test('OSV unions exact versions, inclusive last_affected, disjoint intervals, and exclusive upper limits',async()=>{
  const one=advisory('G-1',[{fixed:'3.2.5'},{introduced:'1.0.0'},{introduced:'3.0.0'},{fixed:'1.1.0'}]);
  const two={id:'G-2',severity:null,versions:['0.1.0+build.1'],ranges:[{type:'ECOSYSTEM',events:[
    {last_affected:'2.0.0-beta.2'},{introduced:'2.0.0-beta.1'}]}]};
  const limit=advisory('G-3',[{introduced:'4.0.0'},{limit:'5.0.0'},{limit:'4.5.0'}]);
  const db=model(snapshot({pkg:[one,two,limit]}));
  const versions=['0.1.0+build.1','0.1.0+build.2','1.0.0','1.1.0','2.0.0-beta.1','2.0.0-beta.2','2.0.0','3.1.0','3.2.5','4.7.0','5.0.0'];
  const inputs=versions.map(v=>row('pkg',v));await db.run(inputs);
  assert.deepEqual(inputs.map(r=>r.ids.join()),['G-2','','G-1','','G-2','G-2','','G-1','','G-3','']);
});

test('unresolved or malformed records preserve known findings without a completeness claim',async()=>{
  const positive=advisory('MATCH',[{introduced:'0'}]);
  const unsupported={id:'UNRESOLVED',versions:[],ranges:[{type:'GIT',events:[{introduced:'0'}]}]};
  const db=model(snapshot({pkg:[positive,unsupported],patched:[{...unsupported,id:'MATCH'},positive],
    missing:[{id:'INCOMPLETE',versions:[],ranges:[]}],empty:[{id:'NOT-THIS',versions:['2.0.0'],ranges:[]}]}));
  const inputs=['pkg','patched','missing','empty','@internal/private','constructor'].map(name=>row(name,'1.0.0',name!=='@internal/private'));
  const results=await db.run(inputs);
  assert.deepEqual(inputs.map(r=>r.state),['unknown','found','unknown','empty','unknown','empty']);
  assert.deepEqual(Array.from(inputs[0].ids),['MATCH']);assert.equal(results.size,1);
  assert.ok(inputs.every(r=>r.lookedUp));
});

test('a stale index can retain historical findings but does not mark rows checked; invalid indices reject',async()=>{
  const packages={pkg:[advisory('A',[{introduced:'0'}])]};
  const stale=model(snapshot(packages,{published:timestamp-20,expires:timestamp-10}));
  const inputs=[row('pkg','1.0.0'),row('other','1.0.0')];await stale.run(inputs);
  assert.deepEqual(inputs.map(r=>r.state),['unknown','unknown']);assert.ok(inputs.every(r=>!r.lookedUp));
  assert.deepEqual(Array.from(inputs[0].ids),['A']);
  for(const override of [{rows:2},{coverage:'partial'},{schema:2},{published:timestamp+100},{expires:timestamp-300},{published:'yesterday'}]) {
    await assert.rejects(model(snapshot(packages,override)).api.load(),/HOSTED_SNAPSHOT/);
  }
  const bad=model(snapshot(packages));const signal=AbortSignal.abort();
  await assert.rejects(bad.api.load(signal),{name:'AbortError'});assert.equal(bad.requests.length,0);
});
