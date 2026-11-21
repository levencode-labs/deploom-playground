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
