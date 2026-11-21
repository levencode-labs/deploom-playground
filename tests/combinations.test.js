'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const issues = require('../docs/combinations');

test('holding the adapter blocks every tuple, allowing it admits only the all-v2 plan',()=>{
  for (const allowed of [false,true]) {
    const fits = [];
    for (const p of [1,2]) for (const b of [1,2]) for (const a of [1,2]) {
      if (!issues(p,b,a,allowed).length) fits.push([p,b,a]);
    }
    assert.deepEqual(fits, allowed ? [[2,2,2]] : []);
  }
  assert.deepEqual(issues(2,2,1,false),['adapter']);
  assert.deepEqual(issues(2,1,2,false),['bundler','pinned']);
});
