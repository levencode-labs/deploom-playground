'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx=vm.createContext({URL,document:{createElement:()=>({}),querySelector:()=>null},Lab:{t:(_,en)=>en}});
ctx.window=ctx;
vm.runInContext(fs.readFileSync(path.join(__dirname,'../docs/registry.js'),'utf8'),ctx);
const file=(path,body='')=>({name:path.split('/').pop(),webkitRelativePath:path,size:body.length,text:async()=>body});
test('folder import reads root project files and uses its selected package manager',async()=>{
  const man=file('project/package.json','{"packageManager":"yarn@4.5.0"}');
  const yarn=file('project/yarn.lock'),npm=file('project/package-lock.json');
  const result=await ctx.LabRegistry.projectFiles([file('project/node_modules/ui/package.json'),man,npm,yarn]);
  assert.equal(result.manifest,man);assert.equal(result.lock,yarn);
  await assert.rejects(ctx.LabRegistry.projectFiles([yarn,npm]),/Two lockfiles/);
  await assert.rejects(ctx.LabRegistry.projectFiles([file('project/src/package.json')]),/root/);
});
