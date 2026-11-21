'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const compare = require('../docs/lock-diff');
function lock(entries) {
  return {lockfileVersion:3,packages:{'':{name:'test'},...entries}};
}
test('matches physical copies independently and ignores metadata key order',()=>{
  const top='node_modules/shared', nested='node_modules/legacy/node_modules/shared';
  const before=lock({[top]:{version:'1'},[nested]:{version:'1',dependencies:{x:'2',z:'1'}}});
  const after=lock({[top]:{version:'2'},[nested]:{dependencies:{z:'1',x:'2'},version:'1'}});
  assert.deepEqual(compare(before,after),[{type:'changed',path:top,fields:['version']}]);
});
test('reports moved copies, metadata-only edits and changes to a link target',()=>{
  const before=lock({'node_modules/gone':{version:'1'},'node_modules/lib':{version:'1',dev:true},'node_modules/local':{link:true,resolved:'packages/a'}});
  const after=lock({'node_modules/added':{version:'1'},'node_modules/lib':{version:'1'},'node_modules/local':{link:true,resolved:'packages/b'}});
  assert.deepEqual(compare(before,after),[
    {path:'node_modules/added',type:'added',fields:[]},
    {path:'node_modules/gone',type:'removed',fields:[]},
    {path:'node_modules/lib',type:'changed',fields:['dev']},
    {path:'node_modules/local',type:'changed',fields:['resolved']}]);
});
test('root metadata does not count as an installed-copy change',()=>{
  const old=lock({}), current=lock({});
  current.packages[''].name='renamed';
  assert.deepEqual(compare(old,current),[]);
});
test('validates the v3 root and every record',()=>{
  for(const wrong of [null,{lockfileVersion:2},{lockfileVersion:3,packages:[]},{lockfileVersion:3,packages:{}},lock({x:[]})])
    assert.throws(()=>compare(wrong,lock({})),TypeError);
});
