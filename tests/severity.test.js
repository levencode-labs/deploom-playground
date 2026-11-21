'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rating,sorted}=require('../docs/severity.js');
test('advisory ranking uses published severity or CVSS base score and puts unknown last',()=>{
  const critical=rating({severity:[{score:'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H'}]});
  assert.deepEqual(critical,{level:'Critical',score:9.8});
  const medium=rating({database_specific:{severity:'MODERATE'}});
  const unknown=rating({severity:[{score:'CVSS:4.0/invalid'}]});
  assert.deepEqual(sorted([{id:'a',...medium},{id:'b',...unknown},{id:'c',...critical}]).map(r=>r.id),['c','a','b']);
});
