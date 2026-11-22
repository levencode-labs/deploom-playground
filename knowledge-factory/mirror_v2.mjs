// Exact-byte, read-only mirror for signed DepLoom migration knowledge.
// Node >=22, with no credentials or contributor-code execution.
import {createHash, createPublicKey, verify} from 'node:crypto';
import {readFile, writeFile, mkdir, mkdtemp, rename, rm, access} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const BASE = 'https://levencode-labs.github.io/deploom-npm/v2/';
const DOMAIN = Buffer.from('DepLoom public migration records v2\0');
const DEFAULT_PIN = fileURLToPath(new URL('./records-public.hex', import.meta.url));
const HEX = /^[a-f0-9]{64}$/;
const PREFIX = /^[a-f0-9]{2}$/;
const INDEX_MAX = 2_000_000;
const SHARD_MAX = 256_000;
const TOTAL_MAX = 32_000_000;

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function load(url, maxBytes, fetcher) {
  if (!url.startsWith(BASE)) throw Error('Unapproved mirror source');
  const response = await fetcher(url, {redirect: 'error', cache: 'no-store'});
  if (response.status !== 200 || !response.body) throw Error('Public cache fetch failed');
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > maxBytes) throw Error('Oversized mirror response');
      chunks.push(Buffer.from(item.value));
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}

function checkIndex(index, minimumRevision) {
  if (!index || typeof index !== 'object' || Array.isArray(index) ||
      Object.keys(index).sort().join(',') !== 'buckets,recordCount,revision,schema,sourceSha256' ||
      index.schema !== 2 || !Number.isSafeInteger(index.revision) ||
      index.revision < Math.max(25, minimumRevision) ||
      !Number.isSafeInteger(index.recordCount) || index.recordCount < 1 ||
      typeof index.sourceSha256 !== 'string' || !HEX.test(index.sourceSha256) ||
      !index.buckets || typeof index.buckets !== 'object' || Array.isArray(index.buckets)) {
    throw Error('Invalid or regressing signed index');
  }
  const groups = Object.entries(index.buckets);
  if (!groups.length || groups.length > 256) throw Error('Invalid bucket count');
  let bytes = 0, rows = 0, shards = 0;
  const paths = new Set();
  for (const [bucket, items] of groups) {
    if (!PREFIX.test(bucket) || !Array.isArray(items) || !items.length) throw Error('Invalid bucket');
    for (const d of items) {
      if (!d || typeof d !== 'object' || Array.isArray(d) ||
          Object.keys(d).sort().join(',') !== 'bytes,path,records,sha256' ||
          typeof d.sha256 !== 'string' || !HEX.test(d.sha256) ||
          d.path !== 'shards/' + bucket + '/' + d.sha256 + '.json' || paths.has(d.path) ||
          !Number.isSafeInteger(d.bytes) || d.bytes < 1 || d.bytes > SHARD_MAX ||
          !Number.isSafeInteger(d.records) || d.records < 1 || d.records > 50_000) {
        throw Error('Invalid shard descriptor');
      }
      paths.add(d.path);
      bytes += d.bytes;
      rows += d.records;
      ++shards;
      if (bytes > TOTAL_MAX || shards > 2048) throw Error('Mirror download cap exceeded');
    }
  }
  if (rows !== index.recordCount) throw Error('Incomplete signed index');
  return groups;
}

export async function mirror(destination, opts={}) {
  const fetcher = opts.fetcher || fetch;
  const publicPin = opts.publicPin || DEFAULT_PIN;
  const minimumRevision = opts.minimumRevision === undefined ? 25 : opts.minimumRevision;
  if (!Number.isSafeInteger(minimumRevision) || minimumRevision < 25)
    throw Error('Invalid minimum revision');
  const pinHex = (await readFile(publicPin, 'ascii')).trim();
  if (!HEX.test(pinHex)) throw Error('Invalid publisher public key');
  const pub = createPublicKey({key: {
    kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pinHex, 'hex').toString('base64url')
  }, format: 'jwk'});
  const raw = await load(BASE + 'index.json', INDEX_MAX, fetcher);
  const sig = await load(BASE + 'index.sig', 64, fetcher);
  const signed = Buffer.concat([DOMAIN, createHash('sha256').update(raw).digest()]);
  if (sig.length !== 64 || !verify(null, signed, pub, sig))
    throw Error('Publisher Ed25519 signature invalid');
  const index = JSON.parse(raw.toString('utf8'));
  const groups = checkIndex(index, minimumRevision);
  const output = resolve(destination);
  const parent = dirname(output);
  await mkdir(parent, {recursive:true});
  try {
    await access(output);
    throw Error('Refuse to overwrite an existing published mirror');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const stage = await mkdtemp(join(parent, '.deploom-staging-'));
  let installed = false;
  try {
    await writeFile(join(stage, 'index.json'), raw, {flag:'wx'});
    await writeFile(join(stage, 'index.sig'), sig, {flag:'wx'});
    let observed = 0, shardCount = 0;
    for (const [bucket, descriptors] of groups) {
      await mkdir(join(stage, 'shards', bucket), {recursive:true});
      for (const d of descriptors) {
        const blob = await load(BASE + d.path, d.bytes, fetcher);
        if (blob.length !== d.bytes || hash(blob) !== d.sha256)
          throw Error('Shard digest or size mismatch');
        const item = JSON.parse(blob.toString('utf8'));
        if (!item || Object.keys(item).sort().join(',') !== 'records,schema' ||
            item.schema !== 2 || !Array.isArray(item.records) || item.records.length !== d.records)
          throw Error('Shard schema/count mismatch');
        for (const entry of item.records) {
          const pkg = entry && entry.record && entry.record.package;
          if (!entry || !['history','knowledge'].includes(entry.kind) ||
              typeof pkg !== 'string' ||
              hash(Buffer.from(pkg, 'utf8')).substring(0, 2) !== bucket)
            throw Error('Shard package bucket mismatch');
        }
        await writeFile(join(stage, d.path), blob, {flag:'wx'});
        observed += item.records.length;
        ++shardCount;
      }
    }
    if (observed !== index.recordCount) throw Error('Incomplete v2 mirror');
    await rename(stage, output);
    installed = true;
    return {schema: 2, revision: index.revision, records: observed, shards: shardCount};
  } finally {
    if (!installed) await rm(stage, {recursive:true, force:true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = process.argv[2];
  const minimum = Number(process.env.DEPLOOM_MIRROR_MIN_REVISION || '25');
  if (!destination || process.argv.length !== 3)
    throw Error('Usage: node mirror_v2.mjs public/v2');
  mirror(destination, {minimumRevision: minimum}).then(
    result => console.log(JSON.stringify(result)),
    error => { console.error(error.message); process.exitCode = 1; }
  );
}
