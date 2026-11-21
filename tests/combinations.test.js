'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {versions,base,build,ui,conflicts}=require('../docs/combinations');
const semver=vm.runInNewContext(fs.readFileSync(require.resolve('../docs/vendor/semver'),'utf8')+';treeSemver');
test('the recorded pre-merge plan selects the companion and reproduces the npm lock result',()=>{
  const record=require('../docs/webpack-plan.json');
  assert.equal(record.heldPlugin.status,'UNSAT_IN_MODELED_DOMAIN');
  assert.equal(record.mutablePlugin.status,'SAT_IN_MODELED_DOMAIN');
  const chosen=Object.fromEntries(Object.entries(record.mutablePlugin.assignment).map(([key,value])=>[JSON.parse(key)[2],value]));
  assert.equal(chosen.webpack,record.goal.webpack);
  assert.equal(chosen['mini-css-extract-plugin'],'2.9.0');
  assert.equal(chosen['webpack-cli'],build['webpack-cli']);
  assert.equal(chosen['css-loader'],record.baseline['css-loader']);
  assert.deepEqual(chosen,record.npmLockCheck.versions);
  assert.equal(record.npmLockCheck.exitCode,0);
  assert.deepEqual(conflicts(chosen,semver),[]);
});
test('the browser planner checks both public webpack revisions from the UI branch lock',()=>{
  const lab=vm.createContext({URL});lab.window=lab;
  for(const name of ['vendor/semver','lock-graph','plan-model']){
    vm.runInContext(fs.readFileSync(require.resolve('../docs/'+name),'utf8'),lab);
  }
  const source=require('../docs/webpack-data');
  for(const [revision,issueCount] of [['merged',1],['fixed',0]]){
    const {manifest,lock,targets}=source.planner(revision);
    const changes=lab.LabPlan.read(manifest,lock,targets);
    const result=lab.LabPlan.assess(lock,changes,source.records);
    assert.equal(result.unknown.length,0);
    assert.equal(result.issues.length,issueCount);
    const plugin=[...result.issues,...result.checks].find(row=>row.path.endsWith('/mini-css-extract-plugin'));
    assert.equal(plugin.version,'5.91.0');
    assert.equal(plugin.range,revision==='merged'?'^4.4.0':'^5.0.0');
    assert.equal(targets['mini-css-extract-plugin'],revision==='merged'?'0.9.0':'2.9.0');
  }
});
test('the two branches fit their base but the merge breaks the CSS extractor peer',()=>{
  for(const state of [base, build, {...base,...ui}, {...build,'mini-css-extract-plugin':'2.9.0'}]) assert.deepEqual(conflicts(state,semver),[]);
  assert.deepEqual(conflicts({...build,...ui},semver),[['mini-css-extract-plugin','0.9.0']]);
  const fits=[];
  for(const loader of Object.keys(versions['css-loader']))for(const webpack of [base.webpack,build.webpack])
    for(const cli of Object.keys(versions['webpack-cli']))if(loader===build['css-loader'] && !conflicts({'css-loader':loader,webpack,'webpack-cli':cli},semver).length)fits.push([loader,webpack,cli]);
  assert.deepEqual(fits,[['6.11.0','5.91.0','4.10.0']]);
});
