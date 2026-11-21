'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const ctx=vm.createContext({URL});ctx.window=ctx;
for(const name of ['vendor/yarn-classic','vendor/js-yaml.min','vendor/semver','lock-graph','yarn-lock','plan-model','lock-diff']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',name+'.js'),'utf8'),ctx);
}
const classic='# yarn lockfile v1\n\n"@org/ui@^1":\n  version "1.1.0"\n  resolved "https://registry.yarnpkg.com/@org/ui/-/ui-1.1.0.tgz#abc"\n  dependencies:\n    foo "^1"\n\nfoo@^1, foo@~1.2.0:\n  version "1.2.3"\n  resolved "https://registry.yarnpkg.com/foo/-/foo-1.2.3.tgz#abc"\n';
const berry='__metadata:\n  version: 8\n\n"@org/ui@npm:^1":\n  version: 1.1.0\n  resolution: "@org/ui@npm:1.1.0"\n  dependencies:\n    foo: "npm:^1"\n\n"foo@npm:^1, foo@npm:~1.2.0":\n  version: 1.2.3\n  resolution: "foo@npm:1.2.3"\n\n"demo@workspace:.":\n  version: 0.0.0-use.local\n  resolution: "demo@workspace:."\n';
for(const [flavor,text] of [['Yarn Classic',classic],['Yarn Berry',berry]])test(flavor+' resolves logical paths, audits identities, compares grouped requests and plans supplied targets',()=>{
  const lock=ctx.LabYarn.read(text), man={dependencies:{'@org/ui':'^1',foo:'^1'}};
  assert.equal(ctx.LabYarn.format(lock.packages),flavor);
  const graph=ctx.LabLockGraph.build(lock.packages,{dependencies:{'@org/ui':'^1'}});
  const foo=ctx.LabYarn.resolve(lock.packages,{name:'foo',range:'^1'}).key;
  assert.deepEqual(Array.from(ctx.LabLockGraph.chain(graph,foo)),['',ctx.LabYarn.resolve(lock.packages,{name:'@org/ui',range:'^1'}).key,foo]);
  const inv=ctx.LabYarn.inventory(lock);assert.equal(inv.rows.length,2);assert.equal(inv.rows.find(row=>row.name==='foo').paths.length,2);
  if(flavor==='Yarn Berry')assert.equal(inv.skipped.length,1);
  const next=ctx.LabYarn.read(text.replaceAll('1.2.3','1.2.4'));assert.equal(ctx.comparePackageLocks(lock,next).length,2);
  const change=ctx.LabPlan.read(man,lock,{'@org/ui':'2.0.0'});
  const local=new Map([['@org/ui@2.0.0',{peerDependencies:{foo:'^2.0.0'}}]]);
  const result=ctx.LabPlan.assessYarn(man,lock,change,new Map(),local);assert.equal(result.issues[0].version,'1.2.3');
});
test('missing or conflicting lock data is not accepted as a valid Yarn lock',()=>{
 for(const value of ['not a lock','__metadata:\n  version: 8\n"pkg@npm:^1":\n  version: 1.3.0\n',berry+'\n<<<<<<< HEAD\n'])assert.throws(()=>ctx.LabYarn.read(value));
});
