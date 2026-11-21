'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const graph=require('../docs/lock-graph');
const compare=require('../docs/lock-diff');
const manifest=require('./fixtures/npm-lock-formats/package.json');
const locks=[1,2,3].map(version=>require('./fixtures/npm-lock-formats/v'+version+'.json'));

test('npm-written v1/v2/v3 locks resolve the same physical copies and declared ranges',()=>{
  const nested='node_modules/css-select/node_modules/css-what';
  const expected=Object.keys(locks[2].packages).sort();
  for(const [index,raw] of locks.entries()) {
    const lock=graph.npmLock(raw,manifest);
    assert.equal(lock.lockfileVersion,index+1);
    assert.deepEqual(Object.keys(lock.packages).sort(),expected);
    assert.equal(lock.packages[nested].version,'6.2.2');
    assert.equal(lock.packages['node_modules/css-what'].version,'3.4.2');
    assert.equal(lock.packages['node_modules/css-select'].dependencies['css-what'],'^6.0.1');
  }
  assert.deepEqual(compare(locks[0],locks[2]),[]);
  assert.deepEqual(compare(locks[1],locks[2]),[]);
  assert.deepEqual(compare.rootRequirements(locks[0],locks[2]),[]);
  const changed=structuredClone(locks[2]);
  changed.packages[nested].version='6.2.1';
  assert.deepEqual(compare(locks[0],changed),[{path:nested,type:'changed',fields:['version']}]);
});

test('v1 hoisting has no implicit root edges; bundling and npm aliases retain their provenance',()=>{
  const raw={lockfileVersion:1,dependencies:{
    alias:{version:'npm:@sample/original@1.2.3',resolved:'https://registry.npmjs.org/@sample/original/-/original-1.2.3.tgz'},
    bundled:{version:'1.0.0',bundled:true},
    link:{version:'file:../local-module'},
  }};
  const lock=graph.npmLock(raw);
  assert.deepEqual([...graph.declarations(lock.packages[''],true)],[]);
  assert.deepEqual(graph.chain(graph.build(lock.packages),'node_modules/alias'),null);
  const aliased=lock.packages['node_modules/alias'];
  assert.equal(aliased.name,'@sample/original');
  assert.equal(aliased.version,'1.2.3');
  assert.equal(graph.publicTarball(aliased,aliased.name),true);
  assert.equal(lock.packages['node_modules/bundled'].inBundle,true);
  assert.equal(lock.packages['node_modules/link'].version,'file:../local-module');
  assert.throws(()=>graph.npmLock({lockfileVersion:1,packages:{'':manifest}}));
  assert.throws(()=>graph.npmLock({lockfileVersion:1,dependencies:{p:{dependencies:{q:[]}}}}));
  const withRoot=graph.npmLock(locks[0],manifest);
  const chain=graph.chain(graph.build(withRoot.packages),'node_modules/css-select/node_modules/css-what');
  assert.deepEqual(chain,['','node_modules/css-select','node_modules/css-select/node_modules/css-what']);
});
