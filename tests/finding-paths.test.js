'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ctx = vm.createContext({URL});
ctx.window = ctx;
for (const file of ['vendor/yarn-classic','vendor/js-yaml.min','vendor/semver','lock-graph','yarn-lock','finding-paths']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file+'.js'),'utf8'),ctx);
}
const paths = ctx.LabFindingPaths;
const loc = name => 'node_modules/'+name;

test('two declaring parents converge on the same hoisted copy even in a cycle',()=>{
  const lock={packages:{
    '':{dependencies:{app:'^4'},devDependencies:{vitest:'^3.2.0'}},
    [loc('app')]:{version:'4.0.0',optionalDependencies:{tinypool:'^1.0.0'}},
    [loc('vitest')]:{version:'3.2.6',dependencies:{tinypool:'^1.1.1'}},
    [loc('tinypool')]:{version:'1.1.1',dependencies:{vitest:'^3.2.0'}}
  }};
  const index=paths.indexFor(lock,null);
  assert.equal(paths.indexFor(lock,null),index);
  const result=paths.routesTo(index,loc('tinypool'));
  assert.equal(result.limited,false);
  assert.deepEqual(Array.from(result.routes,route=>Array.from(route,edge=>edge.group)),[
    ['dependencies','optionalDependencies'],['devDependencies','dependencies']
  ]);
  const graph=paths.layout(result.routes);
  assert.equal(graph.levels.size,4); assert.equal(graph.connections.size,4);
});

test('a nested copy, its hoisted sibling, and a disconnected link are distinct',()=>{
  const nested=loc('lib')+'/'+loc('foo');
  const packages={
    '':{dependencies:{lib:'2',foo:'1'}},[loc('lib')]:{version:'2.0.1',dependencies:{foo:'3'}},
    [loc('foo')]:{version:'1.0.3'},[nested]:{version:'3.0.2'},
    [loc('orphan')]:{version:'1.0.0'},[loc('local')]:{link:true,resolved:'packages/local'}
  };
  const index=paths.indexFor({packages},null);
  assert.equal(paths.routesTo(index,nested).routes[0][0].name,'lib');
  assert.equal(paths.routesTo(index,loc('foo')).routes[0].length,1);
  assert.equal(paths.routesTo(index,loc('orphan')).routes.length,0);
  assert.equal(paths.routesTo(index,loc('local')).routes.length,0);
});

const classic='# yarn lockfile v1\n\nvitest@^3.2.0:\n  version "3.2.6"\n  dependencies:\n    tinypool "^1.1.1"\n\ntinypool@^1.1.1:\n  version "1.1.1"\n';
const berry='__metadata:\n  version: 8\n\n"vitest@npm:^3.2.0":\n  version: 3.2.6\n  resolution: "vitest@npm:3.2.6"\n  dependencies:\n    tinypool: "npm:^1.1.1"\n\n"tinypool@npm:^1.1.1":\n  version: 1.1.1\n  resolution: "tinypool@npm:1.1.1"\n';
for (const [source,key] of [[classic,'tinypool@^1.1.1'],[berry,'tinypool@npm:^1.1.1']]) {
  test('Yarn keeps the recorded parent and needs a manifest to establish the root for '+key,()=>{
    const lock=ctx.LabYarn.read(source);
    const partial=paths.routesTo(paths.indexFor(lock,null),key);
    assert.equal(partial.routes.length,0);
    assert.equal(partial.direct[0].name,'tinypool');
    const manifest={devDependencies:{vitest:'^3.2.0'}};
    const full=paths.routesTo(paths.indexFor(lock,manifest),key);
    assert.deepEqual(Array.from(full.routes[0],e=>e.name),['vitest','tinypool']);
    assert.equal(full.routes[0][0].group,'devDependencies');
  });
}

test('route display is bounded without dropping the known shortest path',()=>{
  const packages={'':{dependencies:{}},[loc('shared')]:{version:'1.0.0'}};
  for(let n=0;n<12;n++){
    const name='branch-'+n;
    packages[''].dependencies[name]='1';
    packages[loc(name)]={version:'1.0.0',dependencies:{shared:'1'}};
  }
  const result=paths.routesTo(paths.indexFor({packages},null),loc('shared'));
  assert.equal(result.limited,true);
  assert.equal(result.routes.length,5);
  assert.ok(result.routes.every(route=>route.length===2));
});
