// Reproduce both PR examples using real npm and an ephemeral, loopback-only registry.
// Requires Node, npm and tar on PATH. Every package is built from a local fixture.
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const run = promisify(execFile);

const tmpRoot = fs.realpathSync(os.tmpdir());
const work = fs.mkdtempSync(path.join(tmpRoot, 'npm-pr-examples-'));
const save = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const catalog = {
  'demo-lib': {'1.2.3': {}, '2.0.0': {}},
  'shared-utils': {'1.2.3': {}, '1.2.4': {}},
  'ui-kit': {'1.0.0': {'shared-utils': '1.2.3'}},
  'build-tool': {'1.0.0': {'shared-utils': '1.2.3'}},
};
const replies = new Map();
const server = http.createServer((req, res) => {
  const body = replies.get(req.url);
  if (!body) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', Buffer.isBuffer(body) ? 'application/octet-stream' : 'application/json');
  res.end(body);
});

async function main() {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const registry = 'http://127.0.0.1:' + server.address().port;
  for (const [name, variants] of Object.entries(catalog)) {
    const versions = {};
    for (const [version, dependencies] of Object.entries(variants)) {
      const dir = path.join(work, name + '-' + version);
      fs.mkdirSync(path.join(dir, 'package'), {recursive:true});
      const pkg = {name, version, dependencies};
      save(path.join(dir, 'package', 'package.json'), pkg);
      await run('tar', ['-czf', 'fixture.tgz', 'package'], {cwd:dir});
      const bytes = fs.readFileSync(path.join(dir, 'fixture.tgz'));
      const tarball = '/' + name + '/-/' + name + '-' + version + '.tgz';
      replies.set(tarball, bytes);
      const integrity = 'sha512-' + crypto.createHash('sha512').update(bytes).digest('base64');
      versions[version] = {...pkg, dist:{tarball: registry + tarball, integrity}};
    }
    replies.set('/' + name, JSON.stringify({name, versions, 'dist-tags': {latest: Object.keys(versions).at(-1)}}));
  }

  // Isolate the registry, cache and npm configuration from the developer's setup.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/i.test(key)));
  const emptyConfig = path.join(work, 'empty.npmrc');
  fs.writeFileSync(emptyConfig, '');
  Object.assign(env, {
    npm_config_registry: registry + '/', npm_config_cache: path.join(work, 'cache'),
    npm_config_userconfig: emptyConfig, npm_config_globalconfig: path.join(work, 'no-global.npmrc'),
    npm_config_audit: 'false', npm_config_fund: 'false', npm_config_ignore_scripts: 'true',
    npm_config_fetch_retries: '0', npm_config_update_notifier: 'false', NO_PROXY: '127.0.0.1,localhost',
  });
  async function npm(cwd, args) {
    const windows = process.platform === 'win32';
    const command = windows ? (env.ComSpec || 'cmd.exe') : 'npm';
    return run(command, windows ? ['/d', '/c', 'npm.cmd', ...args] : args, {cwd,env,encoding:'utf8',timeout:60000,windowsHide:true});
  }
  const ci = path.join(work, 'ci');
  fs.mkdirSync(ci);
  const manifest = {name:'pr-demo', version:'1.0.0', private:true, dependencies:{'demo-lib':'^1.2.0'}};
  const manifestPath = path.join(ci, 'package.json'), lockPath = path.join(ci, 'package-lock.json');
  const installed = () => read(path.join(ci,'node_modules/demo-lib/package.json')).version;
  save(manifestPath,manifest);
  await npm(ci,['install','--package-lock-only']);
  await npm(ci,['ci']);
  assert.equal(installed(),'1.2.3');
  console.log('Baseline npm ci: exit 0, demo-lib@1.2.3');
  const oldLock = fs.readFileSync(lockPath,'utf8');
  manifest.dependencies['demo-lib'] = '^2.0.0';
  save(manifestPath,manifest);
  await assert.rejects(npm(ci,['ci']), error => {
    assert.match(error.stderr, /EUSAGE/);
    assert.match(error.stderr, /Invalid: lock file's demo-lib@1\.2\.3 does not satisfy demo-lib@2\.0\.0/);
    console.log(error.stderr.split(/\r?\n/).filter(line => /EUSAGE|Invalid: lock file/.test(line)).join('\n'));
    return true;
  });
  assert.equal(fs.readFileSync(lockPath,'utf8'),oldLock);
  await npm(ci,['install','--package-lock-only']);
  await npm(ci,['ci']);
  assert.equal(installed(),'2.0.0');
  console.log('Updated lock npm ci: exit 0, demo-lib@2.0.0');

  global.window = {};
  require('../docs/lock-samples.js');
  for (const [stage, sample] of Object.entries(window.LabSamples)) {
    const dir = path.join(work, stage);
    fs.mkdirSync(dir);
    const root = {...sample.packages[''], private:true};
    if (stage === 'after') root.overrides = {'ui-kit':{'shared-utils':'1.2.4'}};
    save(path.join(dir,'package.json'),root);
    await npm(dir,['install','--package-lock-only','--install-strategy=nested']);
    await npm(dir,['ci','--install-strategy=nested']);
    const lock = read(path.join(dir,'package-lock.json'));
    assert.equal(lock.lockfileVersion,3);
    assert.deepEqual(Object.keys(lock.packages).sort(),Object.keys(sample.packages).sort());
    for (const [location, entry] of Object.entries(sample.packages)) {
      assert.equal(lock.packages[location].version, entry.version);
      assert.deepEqual(lock.packages[location].dependencies, entry.dependencies);
      assert.equal(read(path.join(dir,location,'package.json')).version,entry.version);
    }
    console.log(stage + ': ui-kit → ' + sample.packages['node_modules/ui-kit/node_modules/shared-utils'].version +
      ', build-tool → ' + sample.packages['node_modules/build-tool/node_modules/shared-utils'].version);
  }
  const {stdout} = await npm(work,['--version']);
  console.log('Node ' + process.version + ', npm ' + stdout.trim());
}

main().catch(error => {console.error(error); process.exitCode=1;}).finally(() => {
  server.close();
  if (path.dirname(fs.realpathSync(work)) !== tmpRoot) throw new Error('Unexpected temporary path');
  fs.rmSync(work,{recursive:true,force:true});
});
