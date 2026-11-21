'use strict';
// Replay the four versions assigned by Core using an independent clean npm install.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const fixture = path.join(__dirname, 'fixtures', 'webpack-css');
const core = require('../docs/webpack-plan.json');
const versions = core.npmLockCheck.versions;
const lock = require('./fixtures/webpack-css/package-lock.core.json');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploom-core-css-'));

try {
  const project = path.join(root, 'tests', 'fixtures', 'webpack-css');
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(path.join(root, 'docs'));
  const manifest = { ...require('./fixtures/webpack-css/package.json'), devDependencies: versions };
  for (const [name, version] of Object.entries(versions)) {
    assert.equal(core.mutablePlugin.assignment[JSON.stringify(['.', 'devDependencies', name])], version);
    assert.equal(lock.packages['node_modules/' + name].version, version);
  }
  fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify(manifest));
  fs.copyFileSync(path.join(fixture, 'package-lock.core.json'), path.join(project, 'package-lock.json'));
  for (const name of ['entry.js', 'index.html', 'style.css', 'verify.cjs']) {
    fs.copyFileSync(path.join(fixture, name), path.join(project, name));
  }
  fs.copyFileSync(path.join(__dirname, '../docs/webpack-build.json'), path.join(root, 'docs/webpack-build.json'));
  const options = { cwd: project, stdio: 'inherit' };
  const npmArgs = ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--strict-peer-deps'];
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/c', 'npm', ...npmArgs], options);
  } else {
    execFileSync('npm', npmArgs, options);
  }
  execFileSync(process.execPath, ['verify.cjs'], options);
  console.log('Verified the CSS build with the recorded Core assignment.', versions);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
