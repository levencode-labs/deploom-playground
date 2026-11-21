'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {versions,base,build,ui,conflicts}=require('../docs/combinations');
const semver=vm.runInNewContext(fs.readFileSync(require.resolve('../docs/vendor/semver'),'utf8')+';treeSemver');
test('the two branches fit their base but the merge breaks the CSS extractor peer',()=>{
  for(const state of [base, build, {...base,...ui}, {...build,'mini-css-extract-plugin':'2.9.0'}]) assert.deepEqual(conflicts(state,semver),[]);
  assert.deepEqual(conflicts({...build,...ui},semver),[['mini-css-extract-plugin','0.9.0']]);
  const fits=[];
  for(const loader of Object.keys(versions['css-loader']))for(const webpack of [base.webpack,build.webpack])
    for(const cli of Object.keys(versions['webpack-cli']))if(loader===build['css-loader'] && !conflicts({'css-loader':loader,webpack,'webpack-cli':cli},semver).length)fits.push([loader,webpack,cli]);
  assert.deepEqual(fits,[['6.11.0','5.91.0','4.10.0']]);
});
