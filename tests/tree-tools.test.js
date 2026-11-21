'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const lab = vm.createContext({window:{}});
const source = name => fs.readFileSync(path.join(__dirname, '..', 'docs', name), 'utf8');
vm.runInContext(source('lock-graph.js'), lab);
vm.runInContext(source('lock-samples.js'), lab);
vm.runInContext(source('vendor/semver.js'), lab);
const {LabLockGraph, LabSamples} = lab.window;

test('separate physical copies have distinct dependency chains', () => {
  const graph = LabLockGraph.build(LabSamples.before.packages);
  for (const owner of ['ui-kit', 'build-tool']) {
    const ownerPath = 'node_modules/' + owner;
    const copy = ownerPath + '/node_modules/shared-utils';
    assert.deepEqual([...LabLockGraph.chain(graph, copy)], ['', ownerPath, copy]);
  }
  assert.equal(LabLockGraph.chain(graph, 'node_modules/shared-utils'), null);
});

test('peers resolve from the consumer’s parent; cycles and symlinks do not invent paths', () => {
  const packages = {
    '': { dependencies: {wrap:'1', link:'*'} },
    'node_modules/wrap': {version:'1.0.0', dependencies:{consumer:'1', provider:'2'}},
    'node_modules/wrap/node_modules/consumer': {version:'1.0.0', peerDependencies:{provider:'2'}},
    'node_modules/wrap/node_modules/provider': {version:'2.0.0', dependencies:{wrap:'1'}},
    'node_modules/wrap/node_modules/consumer/node_modules/provider': {version:'1.0.0'},
    'node_modules/link': {link:true,resolved:'packages/app'},
  };
  const owner = 'node_modules/wrap/node_modules/consumer';
  const peer = LabLockGraph.lockedPackage(packages, owner, {group:'peerDependencies', name:'provider'});
  assert.equal(peer.key, 'node_modules/wrap/node_modules/provider');
  const graph = LabLockGraph.build(packages);
  assert.equal(graph.parents.size, 3);
  assert.equal(graph.clipped, false);
  assert.equal(LabLockGraph.chain(graph, 'node_modules/link'), null);
});

test('range examples respect stable boundaries and exclude prereleases by default', () => {
  const {satisfies} = lab.treeSemver;
  for (const range of ['^0.2.3','~0.2.3']) {
    assert.equal(satisfies('0.2.3', range), true);
    assert.equal(satisfies('0.3.0', range), false);
  }
  assert.equal(satisfies('1.3.0', '^1.2.3'), true);
  assert.equal(satisfies('1.3.0-beta.1', '^1.2.3'), false);
  assert.equal(satisfies('2.0.0', '^1.2.3'), false);
});

test('the scale includes real neighbours and range boundaries without inventing a release', () => {
  lab.window.Lab = {t:ru=>ru};
  vm.runInContext(source('range-scale.js'),lab);
  const {nearby,compare}=lab.window.LabRangeScale;
  const releases=['0.9.0','1.0.0','1.1.0','1.2.0','1.3.0','1.4.0','1.5.0','2.0.0','3.0.0'];
  const result=[...nearby(releases,'^1.0.0','1.2.1')];
  assert.ok(result.length<=6);
  for(const version of ['1.0.0','1.2.0','1.3.0','1.5.0','2.0.0']) assert.ok(result.includes(version));
  assert.ok(!result.includes('1.2.1'));
  assert.ok(compare('1.2.0-beta.1','1.2.0')<0);
  assert.deepEqual([...nearby([], '^1', '1.0.0')],[]);
});

test('offline interval boundaries come from npm comparator sets and keep disjoint, open and exact bounds',()=>{
  lab.window.Lab={t:ru=>ru};
  vm.runInContext(source('range-scale.js'),lab);
  const {intervals}=lab.window.LabRangeScale;
  const normalized=s=>JSON.parse(JSON.stringify(intervals(s))).map(({lower,upper,empty})=>[lower,upper,empty]);
  const bound=(version,inclusive)=>({version,inclusive});
  assert.deepEqual(normalized('^2.0.3'),[[bound('2.0.3',true),bound('3.0.0-0',false),false]]);
  assert.deepEqual(normalized('~0.2.3'),[[bound('0.2.3',true),bound('0.3.0-0',false),false]]);
  assert.deepEqual(normalized('<=1.0.0 || >2.0.0-beta.1'),[[null,bound('1.0.0',true),false],[bound('2.0.0-beta.1',false),null,false]]);
  assert.deepEqual(normalized('1.2.3'),[[bound('1.2.3',true),bound('1.2.3',true),false]]);
  assert.deepEqual(normalized('*'),[[null,null,false]]);
  assert.deepEqual(normalized('workspace:*'),[]);
  assert.equal(normalized('>=2 <1')[0][2],true);
});

test('npm override uncertainty is limited to the requested package and its logical ancestry',()=>{
  lab.window.Lab={t:(_,en)=>en}; lab.LabLockGraph=LabLockGraph;
  vm.runInContext(source('range-scale.js'),lab);lab.LabRangeScale=lab.window.LabRangeScale;
  vm.runInContext(source('tree-overrides.js'),lab);
  const packages={react:'18.2.0','react-dom':'18.3.1'}, raw='^18.3.1';
  function assess(overrides, ancestry=[['react-dom','18.3.1']], range=raw) {
    const base={state:'bad',version:'18.2.0',reason:''};
    const model=lab.window.TreeOverrides.compile(overrides,{dependencies:packages});
    if(!model)return base;
    let scopes=[model.root];
    for(const [name,version] of ancestry)scopes=model.downstream(scopes,name,version,version);
    return model.check(base,'react',range,scopes);
  }
  for(const rules of [undefined,{}, {lodash:'4.17.21'}, {other:{react:'18.2.0'}},
    {'react-dom@17':{react:'18.2.0'}},{'react@^17':'18.2.0'}, {react:{other:'1.0.0'}}]) {
    assert.equal(assess(rules).state,'bad');
  }
  for(const rules of [{react:'18.2.0'},{'react@18.3.1':{'.':'18.2.0'}},
    {'react-dom@^18':{react:'$react'}},{'react-dom':{react:'file:../local-react'}}]) {
    const outcome=assess(rules);
    assert.equal(outcome.state,'unknown');assert.match(outcome.reason,/\^18\.3\.1/);assert.match(outcome.reason,/18\.2\.0/);
  }
  assert.equal(assess({react:'19'}).state,'bad');
  const nested={'outer@1':{'react-dom@18.3.1':{react:'18.2.0'}}};
  assert.equal(assess(nested).state,'bad');
  assert.equal(assess(nested,[['outer','1.2.0'],['wrapper','2.0.0'],['react-dom','18.3.1']]).state,'unknown');
});

test('map annotations follow logical edges through a hoisted consumer and leave other branches red',()=>{
  lab.window.Lab={t:(_,en)=>en};lab.LabLockGraph=LabLockGraph;
  vm.runInContext(source('range-scale.js'),lab);lab.LabRangeScale=lab.window.LabRangeScale;
  vm.runInContext(source('tree-overrides.js'),lab);
  const model=lab.window.TreeOverrides.compile({outer:{consumer:{react:'18.2.0'}}},{});
  const {create}=require('../docs/dep-map-model');
  const edge=(name,target=name,range='1')=>({name,target,range,group:name==='react'?'peerDependencies':'dependencies'});
  const records={'':{name:'app',refs:[edge('outer'),edge('other')]},outer:{name:'outer',refs:[edge('consumer','hoisted')]},
    other:{name:'other',refs:[edge('consumer','nested')]},hoisted:{name:'consumer',refs:[edge('react','react','^18.3.1')]},
    nested:{name:'consumer',refs:[edge('react','react','^18.3.1')]},react:{name:'react',version:'18.2.0'}};
  const graph=create({manifest:records[''],rootKey:'',packages:records,
    copies:Object.keys(records).filter(Boolean).map(path=>({path,name:records[path].name})),
    declarations:r=>r.refs || [],assess:(_,e)=>({key:e.target,record:records[e.target],
      state:e.name==='react'?'bad':'good',version:records[e.target].version || '1.0.0'})});
  model.annotate(graph);
  assert.equal(graph.nodes.get('hoisted').outgoing[0].state,'unknown');
  assert.equal(graph.nodes.get('nested').outgoing[0].state,'bad');
});
