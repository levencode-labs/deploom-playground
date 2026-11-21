'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function page() {
  const graphCalls=[];
  const element=tag=>({
    tag,textContent:'',children:[],listeners:{},open:false,
    get childElementCount(){return this.children.filter(child=>typeof child==='object').length;},
    append(...children){this.children.push(...children);},
    addEventListener(type,fn){this.listeners[type]=fn;}
  });
  const context=vm.createContext({document:{createElement:element},Lab:{t:(_,en)=>en},
    LabFindingPaths:{render(node,options){graphCalls.push(options);}}
  });
  context.window=context;
  for(const file of ['audit-model.js','severity.js','finding-cards.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs',file),'utf8'),context,{filename:file});
  }
  return {cards:context.LabFindingCards,graphCalls};
}
function text(node) {
  return typeof node==='string' ? node : [node.textContent,...node.children.map(text)].join(' ');
}
const item={id:'GHSA-test',summary:'Example advisory title',source:'OSV',level:'High',score:8.1,
  aliases:['CVE-2026-example'],published:'2025-06-05T23:03:00.746109Z',modified:'2026-11-13T12:00:00Z'};
const row={name:'fixture',key:'fixture@1.0.0',paths:['node_modules/fixture'],publicPaths:new Set(['node_modules/fixture']),state:'found'};

test('disclosed findings retain the exact date, aliases and source; graphs are lazy',()=>{
  const {cards,graphCalls}=page();
  const detail=cards.card(item,[row],{lock:{},manifest:{}},'osv').children[0];
  assert.match(text(detail),/High.*Example advisory title.*fixture@1.0.0.*Published in OSV.*5 Jun 2025/);
  assert.doesNotMatch(text(detail),/GHSA-test|CVE-2026|2026|8\.1/);
  assert.equal(graphCalls.length,0);
  detail.open=true;detail.listeners.toggle();detail.open=false;detail.listeners.toggle();detail.open=true;detail.listeners.toggle();
  assert.equal(graphCalls.length,1);assert.equal(graphCalls[0].row,row);
  assert.match(text(detail),/GHSA-test.*CVE-2026-example.*13 Nov 2026.*8\.1/);
  assert.equal(cards.filter(item,[row],'cve-2026','High'),true);
  assert.equal(cards.filter(item,[row],'fixture@1','Critical'),false);
});

test('old metadata does not use an identifier as a title or a different date as publication',()=>{
  const {cards}=page();
  const detail=cards.card({...item,summary:'',published:null},[row],{},'snapshot').children[0];
  assert.match(text(detail),/Advisory for fixture/);assert.match(text(detail),/Publication date unavailable/);
  assert.doesNotMatch(text(detail),/2026|GHSA-test/);
});
