'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const compare = require('../docs/lock-diff');

test('sample diff shows the changed copy under ui-kit and resolves each owner by declared dependency',()=>{
  const context = vm.createContext({window:{}});
  for (const file of ['lock-graph.js','lock-samples.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),context);
  }
  const {LabLockGraph:resolver, LabSamples:{before,after}} = context.window;
  const ui = 'node_modules/ui-kit';
  const build = 'node_modules/build-tool';
  const copy = '/node_modules/shared-utils';
  assert.deepEqual(compare(before,after),[{path:ui+copy,type:'changed',fields:['version']}]);
  for (const snapshot of [before,after]) {
    const graph = resolver.build(snapshot.packages);
    for (const owner of [ui,build])
      assert.deepEqual(Array.from(resolver.chain(graph,owner+copy)),['',owner,owner+copy]);
  }

  // A hoisted copy's physical path alone does not identify its declaring parent.
  const entries = {...before.packages};
  entries['node_modules/shared-utils'] = entries[ui+copy];
  delete entries[ui+copy];
  const graph = resolver.build(entries);
  assert.deepEqual(Array.from(resolver.chain(graph,'node_modules/shared-utils')),['',ui,'node_modules/shared-utils']);
  assert.equal(resolver.chain(graph,'node_modules/orphan'),null);
});
