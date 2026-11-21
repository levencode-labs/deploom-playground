'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const graph=require('../docs/dep-map-model.js');
const lock=require('../docs/lock-graph.js');
const {build}=require('../docs/cohort-model.js');

const requirements=names=>Object.fromEntries(names.map(name=>[name,'^1.0.0']));
const packageRecord=names=>({version:'1.0.0',dependencies:requirements(names)});
const manifestFor=names=>({name:'app',dependencies:requirements(names)});
function npmGraph(manifest,records) {
  const packages={'':manifest,...records};
  const copies=Object.keys(records).map(path=>({path,name:path.split('node_modules/').pop()}));
  return graph.create({rootKey:'',manifest,packages,copies,declarations:lock.declarations,assess:(owner,edge)=>{
    const match=lock.lockedPackage(packages,owner,edge);
    if (!match) return {state:'unknown',reason:'Missing locked copy'};
    const bad=edge.range==='^2.0.0' && match.record.version==='1.0.0';
    return {...match,version:match.record.version,state:bad?'bad':'good',reason:bad?'Peer conflict':''};
  }});
}

test('direct packages form dense stable groups on either side of an observed bridge',()=>{
  const deps={a:['b','c'],b:['a','c'],c:['a','b','d'],d:['e','f'],e:['d','f'],f:['d','e']};
  function run(names) {
    const manifest=manifestFor(names);
    const records=Object.fromEntries(names.map(name=>['node_modules/'+name,packageRecord(deps[name])]));
    return build(npmGraph(manifest,records),manifest);
  }
  const first=run(Object.keys(deps)), reverse=run(Object.keys(deps).reverse());
  assert.deepEqual(first.groups.map(g=>g.members),[['a','b','c'],['d','e','f']]);
  assert.deepEqual(first,reverse);
  assert.equal(first.edges.length,13);
  const bridge=first.edges.filter(e=>first.nodes.get(e.from).groupId!==first.nodes.get(e.to).groupId);
  assert.deepEqual(bridge,[{from:'c',to:'d',fromKey:'node_modules/c',toKey:'node_modules/d',
    group:'dependencies',range:'^1.0.0',state:'good',reason:''}]);
});

test('shared transitives, nested copies, unresolved providers and package scopes do not create cohort edges',()=>{
  const manifest=manifestFor(['ui','react','@suite/left','@suite/right','missing']);
  const records={
    'node_modules/ui':packageRecord(['react','shared']),
    'node_modules/ui/node_modules/react':packageRecord([]),
    'node_modules/react':packageRecord(['shared']),
    'node_modules/shared':packageRecord(['@suite/left']),
    'node_modules/@suite/left':packageRecord([]),
    'node_modules/@suite/right':{...packageRecord([]),peerDependencies:{missing:'^1.0.0'}},
  };
  const result=build(npmGraph(manifest,records),manifest);
  assert.deepEqual(result.edges,[]);
  assert.equal(result.groups.length,1);
  assert.equal(result.groups[0].linked,false);
  assert.deepEqual(result.groups[0].members,['@suite/left','@suite/right','missing','react','ui']);
  assert.equal(result.nodes.get('react').key,'node_modules/react');
  assert.equal(result.nodes.get('missing').key,null);
  assert.ok(!result.nodes.has('shared'));
});

test('merges root declarations and preserves the direction, range and status of each actual direct peer',()=>{
  const manifest={dependencies:{react:'^1.0.0'},peerDependencies:{react:'^2.0.0'},
    devDependencies:{'test-runner':'^1.0.0'},optionalDependencies:{'optional-addon':'*'}};
  const records={
    'node_modules/react':packageRecord([]),
    'node_modules/test-runner':{version:'1.0.0',peerDependencies:{react:'^2.0.0'}},
  };
  const result=build(npmGraph(manifest,records),manifest);
  assert.deepEqual(result.nodes.get('react').requirements,[
    {group:'dependencies',range:'^1.0.0'},{group:'peerDependencies',range:'^2.0.0'}]);
  assert.deepEqual(result.nodes.get('react').keys,['node_modules/react']);
  assert.deepEqual(result.edges,[{from:'test-runner',to:'react',fromKey:'node_modules/test-runner',toKey:'node_modules/react',
    group:'peerDependencies',range:'^2.0.0',state:'bad',reason:'Peer conflict'}]);
  assert.equal(result.nodes.get('optional-addon').groupId,'unlinked');
});

test('manifest-only declarations are isolated even when local metadata suggests dependencies; lock alone supplies no manifest scope',()=>{
  const manifest=manifestFor(['react','react-dom']);
  const network=npmGraph(manifest,{'node_modules/react-dom':packageRecord(['react']),'node_modules/react':packageRecord([])});
  assert.equal(build(network,null).nodes.size,0);
  const result=build({...network,hasLock:false},manifest);
  assert.deepEqual(result.groups.map(g=>[g.kind,g.linked,g.members]),[['unlinked',false,['react','react-dom']]]);
  assert.deepEqual(result.ecosystems.map(g=>[g.label,g.internalLinks,g.members]),[['React',0,['react','react-dom']]]);
  assert.deepEqual(result.edges,[]);
  assert.equal(result.nodes.get('react-dom').key,null);
});

test('Yarn groups compatible descriptors by actual lock record or full Berry locator, including virtual identity',()=>{
  const vm=require('node:vm'), fs=require('node:fs'), path=require('node:path');
  const ctx=vm.createContext({});ctx.window=ctx;
  for (const source of ['vendor/yarn-classic','vendor/js-yaml.min','lock-graph','yarn-lock']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',source+'.js'),'utf8'),ctx);
  }
  const classic='# yarn lockfile v1\n\nhost@^1:\n  version "1.0.0"\n  dependencies:\n    shared "^1"\n\nother@^1:\n  version "1.0.0"\n  dependencies:\n    shared "1.x"\n\nshared@^1, shared@~1.2:\n  version "1.2.3"\n\nshared@1.x:\n  version "1.2.3"\n';
  const berry='__metadata:\n  version: 8\n"host@npm:^1":\n  version: 1.0.0\n  resolution: "host@npm:1.0.0"\n  dependencies:\n    shared: "npm:^1"\n"other@npm:^1":\n  version: 1.0.0\n  resolution: "other@npm:1.0.0"\n  dependencies:\n    shared: "npm:1.x"\n"shared@npm:~1.2":\n  version: 1.2.3\n  resolution: "shared@virtual:aaa#npm:1.2.3"\n"shared@npm:^1":\n  version: 1.2.3\n  resolution: "shared@virtual:aaa#npm:1.2.3"\n"shared@npm:1.x":\n  version: 1.2.3\n  resolution: "shared@virtual:bbb#npm:1.2.3"\n';
  for (const text of [classic,berry]) {
    const manifest={dependencies:{host:'^1',other:'^1',shared:'~1.2'}}, {packages}=ctx.LabYarn.read(text);
    const copies=Object.keys(packages).filter(Boolean).map(path=>({path,name:ctx.LabYarn.parts(path).name}));
    const network=graph.create({rootKey:'',manifest,packages,copies,declarations:lock.declarations,assess:(_,edge)=>{
      const match=ctx.LabYarn.resolve(packages,edge);
      return {...match,version:match?.record.version,state:'good'};
    }});
    const result=build(network,manifest);
    assert.deepEqual(result.edges.map(e=>[e.from,e.to]),[['host','shared']]);
    assert.notEqual(result.edges[0].toKey,result.nodes.get('shared').key);
    assert.equal(result.nodes.get('other').groupId,'unlinked');
  }
});


test('ecosystem labels follow scopes and plugin hosts independently of installed edges',()=>{
  const dependencies=requirements(['react','react-dom','@sentry/react','@private/webpack-notes','preact']);
  const devDependencies=requirements(['eslint','@typescript-eslint/parser','eslint-plugin-storybook',
    '@storybook/react-vite','storybook','@vitejs/plugin-react','@babel/preset-typescript','typescript',
    'webpack','css-loader','ts-loader','jest-cli-imitation','@private/reactivity','some-tool','@types/react']);
  devDependencies['compiler-for-tests']='npm:typescript@~5.7';
  dependencies['a-shared-tool']='1.0.0';devDependencies['a-shared-tool']='1.0.0';
  const result=build(null,{dependencies,devDependencies});
  const families=new Map(result.ecosystems.map(g=>[g.label,g]));
  assert.deepEqual(families.get('ESLint').members,['@typescript-eslint/parser','eslint','eslint-plugin-storybook']);
  assert.deepEqual(families.get('Storybook').members,['@storybook/react-vite','storybook']);
  assert.deepEqual(families.get('TypeScript').members,['compiler-for-tests','typescript']);
  assert.deepEqual(families.get('React').members,['@types/react','react','react-dom']);
  assert.deepEqual(families.get('webpack').members,['css-loader','ts-loader','webpack']);
  assert.deepEqual(families.get('Vite').members,['@vitejs/plugin-react']);
  assert.deepEqual(families.get('Babel').members,['@babel/preset-typescript']);
  assert.deepEqual(families.get('Other runtime').members,['@private/webpack-notes','@sentry/react','a-shared-tool','preact']);
  assert.deepEqual(families.get('Other dev tooling').members,['@private/reactivity','jest-cli-imitation','some-tool']);
  assert.equal(result.nodes.get('compiler-for-tests').family,'TypeScript');
  assert.equal(result.groups.filter(g=>g.linked).length,0);
  assert.equal(result.edges.length,0);
  for (const group of result.ecosystems) assert.equal(group.internalLinks+group.externalLinks,0);
});

test('Louvain contracts locally stable communities before the final partition',()=>{
  // Twelve triangles in a ring. Individual vertex moves stabilize at triangles,
  // but contracting each community reveals a modularity gain for adjacent pairs.
  const names=[], records={};
  const pkg=(i,j)=>'set-'+String(i).padStart(2,'0')+'-'+j;
  for (let i=0;i<12;i++) for (let j=0;j<3;j++) {
    const name=pkg(i,j), deps=[pkg(i,(j+1)%3)];
    if (j===2) deps.push(pkg((i+1)%12,0));
    names.push(name);records['node_modules/'+name]=packageRecord(deps);
  }
  const manifest=manifestFor(names);
  const result=build(npmGraph(manifest,records),manifest);
  assert.equal(result.groups.length,6);
  for (const g of result.groups) {
    assert.equal(g.members.length,6);assert.equal(g.internalLinks,7);
    assert.equal(g.externalLinks,2);assert.equal(g.density,7/15);
  }
  assert.equal(result.ecosystems.length,1);
  assert.equal(result.ecosystems[0].kind,'other');
});

test('real webpack lock provides different ecosystem and structural projections from exactly the same edges',()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const ctx=vm.createContext({});ctx.window=ctx;
  for (const source of ['vendor/yarn-classic','lock-graph','yarn-lock']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',source+'.js'),'utf8'),ctx);
  }
  const dir=path.join(__dirname,'../docs/examples/webpack-5.91.0');
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  const {packages}=ctx.LabYarn.read(fs.readFileSync(path.join(dir,'yarn.lock'),'utf8'));
  const copies=Object.keys(packages).filter(Boolean).map(key=>({path:key,name:ctx.LabYarn.parts(key).name}));
  const network=graph.create({rootKey:'',manifest,packages,copies,declarations:lock.declarations,
    assess:(_,edge)=>ctx.LabYarn.resolve(packages,edge) || {}});
  const result=build(network,manifest);
  assert.equal(result.nodes.size,98);
  assert.equal(result.edges.length,35);
  assert.ok(result.ecosystems.some(g=>g.label==='Babel' && g.members.includes('@babel/core')));
  assert.ok(result.ecosystems.some(g=>g.label==='ESLint' && g.members.includes('eslint')));
  const wasm=result.groups.find(g=>g.members.includes('@webassemblyjs/ast'));
  assert.deepEqual(wasm.members,['@webassemblyjs/ast','@webassemblyjs/wasm-edit','@webassemblyjs/wasm-parser']);
  assert.equal(wasm.internalLinks,3);assert.equal(wasm.density,1);
  const bridge=result.edges.find(e=>e.from==='enhanced-resolve' && e.to==='graceful-fs');
  assert.ok(bridge);
  assert.notEqual(result.nodes.get(bridge.from).groupId,result.nodes.get(bridge.to).groupId);
  const pair=result.nodes.get('react-dom');
  assert.ok(result.ecosystems.some(g=>g.id===pair.ecosystemId && g.label==='React'));
  for (const groups of [result.groups,result.ecosystems]) {
    // Unique undirected pairs counted once within, twice across the partition.
    const unique=new Set(result.edges.filter(e=>e.from!==e.to).map(e=>JSON.stringify([e.from,e.to].sort())));
    const count=groups.reduce((n,g)=>n+g.internalLinks+g.externalLinks/2,0);
    assert.equal(count,unique.size);
  }
});
