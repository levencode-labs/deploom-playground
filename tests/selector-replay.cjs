// Run from the repository root: node tests/selector-replay.cjs
// Each revision starts in an empty folder and installs its own recorded npm lock.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

function observe(directory, selector) {
  const rootRequire = createRequire(path.join(directory, 'package.json'));
  const cssEntry = rootRequire.resolve('css-select');
  const nthEntry = createRequire(cssEntry).resolve('nth-check');
  function installed(entry, name) {
    let dir = path.dirname(entry);
    while (dir !== path.dirname(dir)) {
      const file = path.join(dir, 'package.json');
      if (fs.existsSync(file)) {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (pkg.name === name) return [pkg.version, path.relative(directory, dir).split(path.sep).join('/')];
      }
      dir = path.dirname(dir);
    }
    throw Error('Missing installed manifest for ' + name);
  }
  const [cssVersion, cssPath] = installed(cssEntry, 'css-select');
  const [nthVersion, nthPath] = installed(nthEntry, 'nth-check');
  const svg = { type: 'tag', name: 'svg', attribs: {}, parent: null, children: [] };
  const rects = [1, 2].map(() => ({ type: 'tag', name: 'rect', attribs: {}, parent: svg, children: [] }));
  svg.children = rects;
  rects[0].next = rects[1];
  rects[1].prev = rects[0];
  const css = rootRequire('css-select');
  let selected = [], error = null;
  try {
    selected = css.selectAll(selector, rects).map(node => rects.indexOf(node) + 1);
  } catch (e) { error = e.name + ': ' + e.message; }
  return { cssVersion, cssPath, nthVersion, nthPath, selected, error };
}

function replay() {
  const lab = require('../docs/selector-data.js');
  const parent = fs.realpathSync(os.tmpdir());
  const scratch = fs.mkdtempSync(path.join(parent, 'css-selector-review-'));
  try {
    for (const [id, record] of Object.entries(lab.cases)) {
      const dir = path.join(scratch, id);
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(record.manifest));
      fs.writeFileSync(path.join(dir, 'package-lock.json'), JSON.stringify(record.lock));
      const args = ['ci', '--ignore-scripts', '--no-audit', '--no-fund'];
      if (process.platform === 'win32') {
        execFileSync('cmd.exe', ['/d', '/c', 'npm.cmd', ...args], { cwd: dir, stdio: 'inherit', windowsHide: true });
      } else {
        execFileSync('npm', args, { cwd: dir, stdio: 'inherit' });
      }
      assert.equal(record.ciExit, 0, id);
      const actual = observe(dir, lab.selector);
      for (const key of Object.keys(actual)) assert.deepEqual(actual[key], record[key], id + ': ' + key);
      console.log(id, actual.cssVersion, actual.nthVersion, actual.error || 'selected rect ' + actual.selected);
    }
  } finally {
    const actual = fs.realpathSync(scratch);
    assert.equal(path.dirname(actual), parent);
    assert.ok(path.basename(actual).startsWith('css-selector-review-'));
    fs.rmSync(actual, { recursive: true });
  }
}

if (require.main === module) replay();
module.exports = { observe };
