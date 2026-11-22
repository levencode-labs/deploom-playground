import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, createHash, sign} from 'node:crypto';
import {mkdtemp, readFile, writeFile, access, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mirror} from '../mirror_v2.mjs';

const BASE = 'https://levencode-labs.github.io/deploom-npm/v2/';
const hash = blob => createHash('sha256').update(blob).digest('hex');
const encode = obj => Buffer.from(JSON.stringify(obj) + '\n');

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'deploom-v2-mirror-'));
  const keys = generateKeyPairSync('ed25519');
  const publicHex = Buffer.from(keys.publicKey.export({format:'jwk'}).x, 'base64url').toString('hex');
  const publicPin = join(root, 'pin.hex');
  await writeFile(publicPin, publicHex);
  const row = {kind:'history', record:{
    schema:1, package:'react-dom', from:'18.2.0', to:'18.3.1',
    source:'https://github.com/levencode-labs/deploom-npm/blob/36216f29d52bacd92e0b64e87433c8ed3e84b5a4/fixtures/react-renderers/check.cjs',
    check:'install', outcome:'passed'
  }};
  const bucket = hash(Buffer.from('react-dom')).substring(0, 2);
  const blob = encode({schema:2, records:[row]});
  const digest = hash(blob);
  const relative = 'shards/' + bucket + '/' + digest + '.json';
  const index = encode({schema:2, revision:29, sourceSha256:'a'.repeat(64),
    recordCount:1, buckets:{[bucket]:[{path:relative, sha256:digest, bytes:blob.length, records:1}]}});
  const signature = sign(null, Buffer.concat([
    Buffer.from('DepLoom public migration records v2\0'),
    createHash('sha256').update(index).digest()
  ]), keys.privateKey);
  const resources = new Map([[BASE+'index.json',index],[BASE+'index.sig',signature],[BASE+relative,blob]]);
  const fetcher = async (url, opts) => {
    assert.equal(opts.redirect,'error');
    assert.ok(resources.has(url), 'Unexpected URL');
    return new Response(resources.get(url), {status:200});
  };
  return {root, publicPin, relative, resources, fetcher, output:join(root,'public','v2')};
}

test('signed mirror publishes byte-identical shards and refuses overwrite', async () => {
  const f = await fixture();
  try {
    const result = await mirror(f.output,{publicPin:f.publicPin, fetcher:f.fetcher, minimumRevision:29});
    assert.equal(result.records,1);
    assert.deepEqual(await readFile(join(f.output,'index.json')),f.resources.get(BASE+'index.json'));
    assert.deepEqual(await readFile(join(f.output,f.relative)),f.resources.get(BASE+f.relative));
    await assert.rejects(mirror(f.output,{publicPin:f.publicPin, fetcher:f.fetcher}),/overwrite/);
  } finally {await rm(f.root,{recursive:true,force:true});}
});

test('rejects signature tampering, partial shard and old revision without publishing', async () => {
  const a = await fixture();
  try {
    a.resources.set(BASE+'index.sig',Buffer.alloc(64));
    await assert.rejects(mirror(a.output,{publicPin:a.publicPin,fetcher:a.fetcher}),/signature/);
    await assert.rejects(access(a.output),{code:'ENOENT'});
  } finally {await rm(a.root,{recursive:true,force:true});}
  const b = await fixture();
  try {
    b.resources.set(BASE+b.relative,Buffer.from('truncated'));
    await assert.rejects(mirror(b.output,{publicPin:b.publicPin,fetcher:b.fetcher}),/digest/);
    await assert.rejects(access(b.output),{code:'ENOENT'});
    await assert.rejects(mirror(b.output,{publicPin:b.publicPin,fetcher:b.fetcher,minimumRevision:30}),/regressing/);
  } finally {await rm(b.root,{recursive:true,force:true});}
});
