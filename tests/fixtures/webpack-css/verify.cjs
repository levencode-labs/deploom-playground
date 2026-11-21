'use strict';
// From this directory: npm ci --ignore-scripts --no-audit --no-fund && node verify.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const webpack = require('webpack');
const Extract = require('mini-css-extract-plugin');

const dir = fs.mkdtempSync(path.join(__dirname, 'deploom-review-css-'));
const compiler = webpack({
  context: __dirname,
  mode: 'production',
  entry: './entry.js',
  output: {path: dir, filename: 'page.js'},
  module: {rules: [
    {test: /\.css$/, use: [Extract.loader, require.resolve('css-loader')]},
    {test: /\.html$/, type: 'asset/resource', generator: {filename: 'index.html'}},
  ]},
  plugins: [new Extract({filename: 'page.css'})],
});

compiler.run((error, stats) => compiler.close(closeError => {
  try {
    if (error || closeError) throw error || closeError;
    assert.equal(stats.hasErrors(), false, stats.toString({all: false, errors: true}));
    const page = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.match(page, /<link rel="stylesheet" href="page\.css">/);
    assert.match(page, /class="review-status"/);
    const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8').trim();
    assert.equal(css, '.review-status { color: #1456a1; }');
    const recorded = require('../../../docs/webpack-build.json');
    assert.equal(css, recorded.check.emittedRule);
    assert.equal(webpack.version, recorded.versions.webpack);
    assert.equal(recorded.check.exitCode, 0);
    console.log(JSON.stringify({webpack: webpack.version, file: 'page.css', css}));
  } finally {
    if (path.dirname(dir) === __dirname && path.basename(dir).startsWith('deploom-review-css-'))
      fs.rmSync(dir, {recursive: true, force: true});
  }
}));
