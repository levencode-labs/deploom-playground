'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

test('the public registry ignores old session settings and keeps scoped names intact',()=>{
  const removed = [];
  const ctx = vm.createContext({URL,sessionStorage:{
    getItem(){throw Error('Historical registry values must never be read');},
    removeItem(key){removed.push(key);}
  }});
  ctx.window=ctx;
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs/registry.js'),'utf8'),ctx);
  assert.equal(ctx.LabRegistry.url('@example/ui'),'https://registry.npmjs.org/@example%2Fui');
  assert.deepEqual(removed,['deploom-lab-registry']);
});
