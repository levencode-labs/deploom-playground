'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {create, neighborhood} = require('../docs/dep-map-model.js');

function index(records, rootKey = '') {
  const copies = Object.entries(records).filter(([key]) => key).map(([path, row]) => ({path, name:row.name}));
  return create({
    rootKey, manifest: records[''] || {}, packages:records, copies,
    declarations: record => record.refs || [],
    assess: (key, edge) => ({key:edge.target, record:records[edge.target], version:'1.0.0', state:'good'})
  });
}
const edge = (target, name='shared') => ({target, name, range:'1', group:'dependencies'});

test('reverse traversal includes all consumers beyond the displayed page and a shared ancestor once', () => {
  const records = {'':{name:'project',refs:[]}, shared:{name:'shared'}};
  for (let i=0;i<300;i++) {
    const key='node_modules/consumer-'+i;
    records[''].refs.push(edge(key, 'consumer-'+i));
    records[key]={name:'consumer-'+i,refs:[edge('shared')]};
  }
  const graph = index(records);
  assert.equal(graph.nodes.size,302);
  assert.equal(neighborhood(graph, 'shared', true, 1).size,301);
  assert.equal(neighborhood(graph, 'shared', true, Infinity).get(''),2);
  assert.equal(neighborhood(graph, 'node_modules/consumer-299', false, 1).get('shared'),1);
});

test('physical copies have distinct consumers, cycles terminate and disconnected entries stay searchable', () => {
  const left='node_modules/a/node_modules/shared', right='node_modules/b/node_modules/shared';
  const records={'':{refs:[edge('a','a'),edge('b','b')]},a:{name:'a',refs:[edge(left)]},b:{name:'b',refs:[edge(right)]},
    [left]:{name:'shared',refs:[edge('a','a')]},[right]:{name:'shared'},orphan:{name:'other'}};
  const graph=index(records);
  assert.deepEqual([...neighborhood(graph,left,true,Infinity)],[ [left,0],['a',1],['',2] ]);
  assert.deepEqual([...neighborhood(graph,right,true,Infinity)],[ [right,0],['b',1],['',2] ]);
  assert.ok(graph.nodes.has('orphan'));
  assert.equal(neighborhood(graph,'',false,Infinity).has('orphan'),false);
});

test('a lockfile without a project root waits for an explicit starting entry', () => {
  const graph=index({a:{name:'a',refs:[edge('b','b')]},b:{name:'b'}},null);
  assert.equal(neighborhood(graph,null,false,2).size,0);
  assert.deepEqual([...neighborhood(graph,'b',true,2)],[['b',0],['a',1]]);
});
