'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const lab = vm.createContext({ URL });
lab.window = lab;
for (const file of ['vendor/semver.js','lock-graph.js','plan-model.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),lab);
}
const man = {dependencies:{ui:'1.0.0',core:'1.0.0'}};
const entry = name => ({version:'1.0.0',resolved:'https://registry.npmjs.org/'+name+'/-/'+name+'-1.0.0.tgz'});
const lock = {lockfileVersion:3,packages:{'':man,'node_modules/ui':entry('ui'),'node_modules/core':entry('core'),
  'node_modules/wrapper':{peerDependencies:{core:'^1.0.0'}},
  'node_modules/sub/node_modules/wrapper':{peerDependencies:{core:'^1.0.0'}},
  'node_modules/sub/node_modules/core':entry('core')}};
const metadata = new Map([['ui@2.0.0',{peerDependencies:{core:'^2.0.0'}}],['core@2.0.0',{}]]);
const plan = targets => lab.LabPlan.assess(lock,lab.LabPlan.read(man,lock,targets),metadata);
test('detects a required companion and a held reverse peer at its actual install path',()=>{
  const first = plan({ui:'2.0.0'}); assert.equal(first.issues[0].name,'core'); assert.equal(first.issues[0].version,'1.0.0');
  const both = plan({ui:'2.0.0',core:'2.0.0'}); assert.equal(both.checks.length,1);
  assert.equal(both.issues.length,1); assert.equal(both.issues[0].path,'node_modules/wrapper');
});
test('unsupported targets and private sources cannot imply known constraints',()=>{
  assert.throws(()=>plan({absent:'2.0.0'})); assert.throws(()=>plan({core:'latest'}));
  const privateLock = {lockfileVersion:3,packages:{...lock.packages,'node_modules/ui':{version:'1.0.0',resolved:'file:local'}}};
  const changes = lab.LabPlan.read(man,privateLock,{ui:'2.0.0'});
  assert.equal(changes[0].publicRegistry,false);
  assert.equal(lab.LabPlan.assess(privateLock,changes,metadata).unknown[0],'node_modules/ui');
  const local = new Map([['ui@2.0.0',{peerDependencies:{core:'^2.0.0'}}]]);
  assert.equal(lab.LabPlan.assess(privateLock,changes,metadata,local).issues[0].name,'core');
  assert.equal(plan({ui:'3.0.0'}).unknown[0],'node_modules/ui');
});
