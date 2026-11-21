'use strict';
(() => {
  const formats = new WeakMap();
  const plain = x => !!x && typeof x === 'object' && !Array.isArray(x);
  function parts(descriptor) {
    const at = descriptor.indexOf('@',1);
    const name = descriptor.slice(0,at);
    return at > 0 && LabLockGraph.usableName(name) ? {name,range:descriptor.slice(at+1)} : null;
  }
  function read(text,manifest) {
    const source = text.replace(/^\uFEFF/,'').trimStart();
    if (source.startsWith('{')) return LabLockGraph.npmLock(JSON.parse(source),manifest);
    const classic = /^# yarn lockfile v1\s*$/m.test(source);
    if (!classic && !/^__metadata:\s*$/m.test(source)) throw Error('FORMAT');
    const raw = classic ? LabClassic.parse(source+'\n') : jsyaml.load(source,{schema:jsyaml.FAILSAFE_SCHEMA,maxAliases:0});
    if (!plain(raw) || (!classic && !plain(raw.__metadata))) throw Error('FORMAT');
    const packages = Object.create(null);
    packages[''] = {};
    let count = 0;
    // A generated lock is a tree of plain records. Reject cycles and shared YAML aliases.
    const seen = new WeakSet();
    function validate(node,depth) {
      if (depth>30 || ++count>900000) throw Error('size');
      if (node===null || typeof node!=='object') return;
      if (seen.has(node)) throw Error('FORMAT');
      seen.add(node);
      for (const value of Object.values(node)) validate(value,depth+1);
    }
    const entries = Object.entries(raw);
    if (entries.length>60000) throw Error('size');
    for (const [group,record] of entries) {
      if (!classic && group==='__metadata') continue;
      if (!plain(record) || typeof record.version!=='string' || (!classic && typeof record.resolution!=='string')) throw Error('FORMAT');
      if (!seen.has(record)) validate(record,0);
      for (const descriptor of classic ? [group] : group.split(', ')) {
        if (!parts(descriptor) || Object.hasOwn(packages,descriptor)) throw Error('FORMAT');
        packages[descriptor]=record;
      }
    }
    const flavor=classic?'Yarn Classic':'Yarn Berry';
    formats.set(packages,flavor);
    return {packages};
  }
  function resolve(packages,edge) {
    if(edge.group==='peerDependencies') return null;
    for(const range of [edge.range,'npm:'+edge.range]) {
      const key=edge.name+'@'+range;
      if (Object.hasOwn(packages,key)) return {key,record:packages[key]};
    }
    return null;
  }
  function identity(packages,key) {
    const record=packages[key], descriptor=parts(key);
    if(!descriptor || !record || !treeSemver.valid(record.version)) return null;
    if(formats.get(packages)==='Yarn Berry') {
      const exact=parts(record.resolution);
      return exact?.range==='npm:'+record.version ? exact.name : null;
    }
    try {
      const url=new URL(record.resolved);
      if (!['https://registry.npmjs.org','https://registry.yarnpkg.com'].includes(url.origin) || url.username || url.password || url.search) return null;
      const name=decodeURIComponent(url.pathname.slice(1)).split('/-/')[0];
      return LabLockGraph.usableName(name) && decodeURIComponent(url.pathname)==='/'+name+'/-/'+name.split('/').at(-1)+'-'+record.version+'.tgz' ? name : null;
    } catch { return null; }
  }
  function inventory(lock) {
    const rows=new Map(),skipped=[];
    for(const [path,record] of Object.entries(lock.packages)) {
      if (!path) continue;
      const name=identity(lock.packages,path);
      if (!name) { skipped.push({path,reason:'source'}); continue; }
      const key=name+'@'+record.version;
      if (!rows.has(key)) rows.set(key,{key,name,version:record.version,paths:[],state:'ready',ids:[]});
      rows.get(key).paths.push(path);
    }
    return {rows:[...rows.values()].sort((a,b)=>a.key.localeCompare(b.key)),skipped};
  }
  window.LabYarn={read,withManifest:(lock,manifest)=>LabLockGraph.withManifest(lock,manifest),parts,resolve,identity,inventory,format:packages=>formats.get(packages)};
})();
