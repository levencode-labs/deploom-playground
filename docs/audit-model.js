'use strict';

(() => {
  const limit = 20;
  const maxBytes = 8 * 1024 * 1024;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function inventory(lock) {
    if (lock?.lockfileVersion===1) lock=LabLockGraph.npmLock(lock);
    if (![1,2,3].includes(lock?.lockfileVersion) || !isObject(lock.packages) || !isObject(lock.packages[''])) throw Error('format');
    const entries = Object.entries(lock.packages);
    if (entries.length > 30001) throw Error('size');
    const rows = new Map();
    const skipped = [];
    for (const [path, item] of entries) {
      if (!path) continue;
      const match = path.match(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/);
      const name = isObject(item) ? item.name ?? match?.[1] : null;
      let reason = 'source';
      if (!match || item?.link || item?.private || item?.inBundle) reason = 'local';
      else if (typeof name !== 'string' || !window.LabLockGraph.usableName(name) || typeof item?.version !== 'string' ||
        !/^\d/.test(item.version) || !treeSemver.valid(item.version)) reason = 'version';
      else if (window.LabLockGraph.publicTarball(item,name)) {
        const key = name + '@' + item.version;
        if (!rows.has(key)) rows.set(key,{key,name,version:item.version,paths:[],state:'ready',ids:[]});
        rows.get(key).paths.push(path);
        continue;
      }
      skipped.push({path,reason});
    }
    return {rows:[...rows.values()].sort((a,b)=>a.key.localeCompare(b.key)),skipped};
  }

  function localInventory(lock) {
    if (lock?.lockfileVersion===1) lock=LabLockGraph.npmLock(lock);
    const yarn = window.LabYarn?.format(lock?.packages);
    const data = yarn ? window.LabYarn.inventory(lock) : inventory(lock);
    for (const row of data.rows) {
      row.publicPaths = new Set(row.paths.filter(p => {
        const record=lock.packages[p];
        if (!yarn) return LabLockGraph.publicTarball(record,row.name);
        try {return ['https://registry.npmjs.org','https://registry.yarnpkg.com'].includes(new URL(record.resolved).origin) && LabYarn.identity(lock.packages,p)===row.name;} catch {return false;}
      }));
      row.publicOrigin = row.publicPaths.size > 0;
    }
    const rows = new Map(data.rows.map(row => [row.key,row]));
    const skipped = [];
    for (const item of data.skipped) {
      const record = lock.packages[item.path];
      const descriptor = yarn && window.LabYarn.parts(item.path);
      const name = descriptor ? descriptor.name : record?.name || item.path.split('node_modules/').pop();
      if (!record || !name || !window.LabLockGraph.usableName(name) || !treeSemver.valid(record.version)) {
        skipped.push(item); continue;
      }
      const registryVersion = !record.private && !record.link && !record.inBundle && (yarn
        ? treeSemver.validRange(descriptor.range.replace(/^npm:/,'')) !== null
        : /(?:^|\/)node_modules\//.test(item.path)) &&
        (!record.resolved || /^https?:\/\//i.test(record.resolved)) && (!record.resolution || record.resolution === name+'@npm:'+record.version);
      const key = name+'@'+record.version;
      const id = (registryVersion ? '' : 'local:') + key;
      if (!rows.has(id)) rows.set(id,{id,key,name,version:record.version,paths:[],publicPaths:new Set(),localOnly:!registryVersion,state:'ready',ids:[]});
      rows.get(id).paths.push(item.path);
    }
    return {rows:[...rows.values()].sort((a,b)=>a.key.localeCompare(b.key)),skipped};
  }

  async function pool(items, concurrency, work, signal) {
    let next=0;
    async function worker() {
      while (next < items.length && !signal.aborted) await work(items[next++]);
    }
    await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));
  }

  async function check(selected, signal, trusted = false) {
    if (selected.length > limit) throw Error('size');
    for (const row of selected) {
      row.state = 'unknown'; row.note = 'registry'; row.ids = [];
    }
    const registered = [];
    await pool(selected,4,async row=>{
      try {
        if (!trusted) {
          const doc=await LabRegistry.manifest(row.name,row.version,signal);
          if (doc.private === true) {row.note='missing';return;}
        }
        registered.push(row); row.note='osv';
      } catch (e) {row.note=e.status===404?'missing':'registry'; row.reason=LabRegistry.message(e);}
    },signal);
    let requests = registered.map(row=>({row,token:null,seen:new Set(),ids:new Set()}));
    while(requests.length && !signal.aborted) {
      const current=requests; requests=[];
      try {
        const queries=current.map(({row,token})=>({package:{name:row.name,ecosystem:'npm'},version:row.version,...(token?{page_token:token}:{})}));
        const data=await LabRegistry.json('https://api.osv.dev/v1/querybatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries})},signal);
        if (!Array.isArray(data?.results) || data.results.length!==current.length) throw Error('METADATA');
        current.forEach(({row,seen,ids},i)=>{
          const page=data.results[i], vulns=page?.vulns ?? [];
          if(!isObject(page) || page.error || !Array.isArray(vulns) || vulns.some(entry=>typeof entry?.id!=='string' || !entry.id)) return;
          for(const entry of vulns) ids.add(entry.id);
          row.ids=[...ids];
          const token=page.next_page_token;
          if (token===undefined || token==='') {
            row.lookedUp=true;
            row.state=ids.size?'found':trusted && !row.publicOrigin?'unknown':'empty';
            if(row.state==='unknown')row.reason=Lab.t('Совпадений в OSV нет. Публичное происхождение версии не подтверждено.','No OSV matches. Public provenance of this version is unconfirmed.');
            delete row.note;return;
          }
          if(typeof token!=='string' || seen.has(token) || seen.size>=20) return;
          seen.add(token); requests.push({row,token,seen,ids});
        });
      } catch(e) {for(const {row} of current) row.reason=LabRegistry.message(e);return e;}
    }
  }

  // Only explicit advisory publication dates qualify. A capture, release, or modification date
  // can be present even when the upstream source has no publication date.
  function advisoryDate(raw) {
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/i.test(raw)) return null;
    const datePart = raw.slice(0,10);
    const midnight = Date.parse(datePart + 'T00:00:00Z');
    if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0,10) !== datePart) return null;
    const instant = Date.parse(raw);
    return Number.isFinite(instant) ? new Date(instant).toISOString() : null;
  }

  function advisoryMetadata(record, source) {
    const ids = Array.isArray(record.aliases) ? record.aliases : [];
    const cves = Array.isArray(record.cves) ? record.cves : [];
    const aliases = [...new Set([...ids,...cves].filter(value =>
      typeof value === 'string' && /^[a-z0-9][a-z0-9.:_-]{0,159}$/i.test(value) && value !== record.id))];
    const summary = [record.summary,record.title].find(value => typeof value === 'string' && value.trim());
    return {
      source,
      summary:summary ? summary.trim().slice(0,1200) : '',
      published:advisoryDate(record.published ?? record.published_at),
      modified:advisoryDate(record.modified ?? record.updated_at),
      aliases
    };
  }

  async function registryAudit(rows,findings,signal) {
    const payload=Object.create(null);
    for(const row of rows) (payload[row.name]??=[]).push(row.version);
    const endpoint=LabRegistry.base()+'-/npm/v1/security/advisories/bulk';
    const data=await LabRegistry.json(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},signal);
    if (!isObject(data) || data.error || Object.keys(data).some(name=>!Object.hasOwn(payload,name))) throw Error('METADATA');
    for(const row of rows) {
      const records=data[row.name] ?? [];
      if (!Array.isArray(records) || records.some(r=>!isObject(r) || !r.vulnerable_versions || !treeSemver.validRange(r.vulnerable_versions) || (!r.id && !r.url))) continue;
      for (const r of records) if (treeSemver.satisfies(row.version,r.vulnerable_versions,{includePrerelease:true})) {
        let href='', ghsa='';
        try {
          const url=new URL(r.url);
          ghsa=url.pathname.match(/GHSA-[\w-]+/i)?.[0] || '';
          if(url.origin===new URL(endpoint).origin && !url.username && !url.password) href=url.href;
        } catch {}
        const id=ghsa || String(r.id || r.url);
        findings.set(id,{...advisoryMetadata(r,'npm registry'),id,href,...LabSeverity.rating(r)});
        if(!row.ids.includes(id)) row.ids.push(id);
      }
      row.lookedUp=true;row.state=row.ids.length?'found':'empty';delete row.note;
    }
  }

  function directVersions(manifest,lock) {
    if (lock?.lockfileVersion===1) lock=LabLockGraph.npmLock(lock,manifest);
    const roots=new Map();
    for (const edge of LabLockGraph.declarations(manifest || {},true)) {
      if(edge.group==='peerDependencies' || roots.has(edge.name)) continue;
      const hit=LabLockGraph.lockedPackage(lock.packages,'',edge);
      roots.set(edge.name,{name:edge.name,range:edge.range,version:hit?.record.version || null,path:hit?.key});
    }
    return [...roots.values()];
  }
  // One advisory can cover several names or versions. Installed paths do not add findings.
  function summarize(rows,records) {
    const affected=new Map(), packages=new Set(), versions=new Set();
    for(const row of rows) {
      if (!row.ids.length) continue;
      packages.add(row.name);versions.add(row.key);
      for(const id of new Set(row.ids)) {
        if(!affected.has(id))affected.set(id,new Map());
        affected.get(id).set(row.key,row);
      }
    }
    const groups=new Map(), severities={}, packageSeverities={}, rankedPackages=new Set();
    const recordsInOrder=LabSeverity.sorted([...affected.keys()].map(id=>records.get(id)||{id,level:'Unknown'}));
    for(const item of recordsInOrder) {
      severities[item.level]=(severities[item.level]||0)+1;
      const affectedRows=[...affected.get(item.id).values()];
      const names=[...new Set(affectedRows.map(row=>row.name))].sort();
      for(const name of names) {
        if(rankedPackages.has(name))continue;
        rankedPackages.add(name);
        packageSeverities[item.level]=(packageSeverities[item.level]||0)+1;
      }
      const key=JSON.stringify(names);
      if(!groups.has(key))groups.set(key,{label:names.join(', '),entries:[]});
      groups.get(key).entries.push({item,rows:affectedRows});
    }
    return {total:affected.size,packages:packages.size,versions:versions.size,severities,packageSeverities,groups:[...groups.values()]};
  }
  window.LabAudit={summarize,advisoryDate,advisoryMetadata,inventory,localInventory,check,registryAudit,directVersions,pool,limit,maxBytes};
})();
