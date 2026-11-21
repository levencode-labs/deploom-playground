'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx=vm.createContext({URL});ctx.window=ctx;
for(const file of ['vendor/semver.js','vendor/yarn-classic.js','vendor/js-yaml.min.js','yarn-lock.js','lock-graph.js','criterion.js','plan-model.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),ctx);
}
const {freshness,inventory,project}=ctx.LabCriterion;
const doc={versions:{'1.0.0':{},'1.1.0':{},'1.2.0':{},'2.0.0':{},'3.0.0-beta.1':{}},'dist-tags':{latest:'1.1.0'},
  time:{'1.0.0':'2021-10-01T12:00:00Z','1.1.0':'2023-02-28T12:00:00Z','1.2.0':'2023-04-01T12:00:00Z','2.0.0':'2024-02-29T12:00:00Z','3.0.0-beta.1':'2025-09-01T12:00:00Z'}};
test('freshness uses the highest stable release and calendar months, including leap day',()=>{
  const old=freshness(doc,'1.0.0');assert.equal(old.status,'stale');assert.equal(old.latest,'2.0.0');
  assert.equal(old.cutoff,'2023-02-28T12:00:00.000Z');assert.equal(old.target,'1.1.0');
  assert.equal(freshness(doc,'1.1.0').status,'fresh');assert.equal(freshness(doc,'2.0.0').status,'fresh');
  assert.equal(freshness({...doc,time:{...doc.time,'2.0.0':'bad'}},'1.0.0').status,'unknown');
  assert.equal(freshness({...doc,time:{...doc.time,'2.0.0':'2050-01-05T12:00:00Z'}},'1.0.0').status,'unknown');
  assert.equal(freshness(doc,'0.1.0').status,'unknown');
});
test('count unknowns in denominator and suggest only enough changes for the named threshold',()=>{
  const rows=['a','b','c','d','e'].map((name,i)=>({name,range:'^1',version:i<3?'1.1.0':'1.0.0'}));
  const docs=new Map(rows.map(r=>[r.name,doc]));
  assert.equal(project(rows,docs,'yellow').targets.length,1);
  assert.equal(project(rows,docs,'green').targets.length,2);
  docs.delete('a');
  const green=project(rows,docs,'green');assert.equal(green.required,5);assert.equal(green.projected,4);assert.equal(green.unknown,1);
});
test('read root targets from both Yarn formats; local and absent entries stay in scope',()=>{
  const man={dependencies:{core:'^1',local:'file:../local',absent:'^1'}};
  for(const source of ['# yarn lockfile v1\n\ncore@^1:\n  version "1.1.0"\n', '__metadata:\n  version: 8\n"core@npm:^1":\n  version: 1.1.0\n  resolution: "core@npm:1.1.0"\n']) {
    const rows=inventory(man,ctx.LabYarn.read(source));
    assert.equal(rows.length,3);assert.equal(rows.find(r=>r.name==='core').version,'1.1.0');
    assert.equal(rows.find(r=>r.name==='local').version,null);assert.equal(rows.find(r=>r.name==='absent').version,null);
  }
});
test('surface an independent known peer conflict when no fresh target can be computed',()=>{
  const lock={packages:{'':{},'node_modules/ui':{version:'1.0.0',peerDependencies:{renderer:'^1'}},'node_modules/renderer':{version:'2.0.0'}}};
  const r=ctx.LabPlan.assess(lock,[],new Map(),new Map(),true);
  assert.equal(r.issues.length,1);assert.equal(r.issues[0].version,'2.0.0');
});
