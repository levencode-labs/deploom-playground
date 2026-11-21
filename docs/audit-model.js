'use strict';

(() => {
  const limit = 20;
  const maxBytes = 8 * 1024 * 1024;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function inventory(lock) {
    if (lock?.lockfileVersion !== 3 || !isObject(lock.packages) || !isObject(lock.packages[''])) throw Error('format');
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

  async function jsonFrom(url, options, signal) {
    const response = await fetch(url, {...options,credentials:'omit',referrerPolicy:'no-referrer',signal});
    if (!response.ok) throw Error(response.status === 404 ? 'missing' : 'network');
    return response.json();
  }

  async function check(selected, signal) {
    if (selected.length > limit) throw Error('size');
    for (const row of selected) {
      row.state = 'unknown'; row.note = 'registry'; row.ids = [];
    }
    const registered = [];
    let cursor = 0;
    async function worker() {
      while (cursor < selected.length && !signal.aborted) {
        const row = selected[cursor++];
        try {
          const metadata = await jsonFrom('https://registry.npmjs.org/' + encodeURIComponent(row.name) + '/' + encodeURIComponent(row.version), {}, signal);
          if (metadata.name === row.name && metadata.version === row.version && metadata.private !== true) {
            registered.push(row); row.note = 'osv';
          } else row.note = 'missing';
        } catch (error) { if(error.message === 'missing') row.note = 'missing'; }
      }
    }
    await Promise.all(Array.from({length:Math.min(selected.length,4)},worker));

    let requests = registered.map(row=>({row,token:null,seen:new Set(),ids:new Set()}));
    // OSV may return a different token for each query. Keep its original row on every page.
    while(requests.length && !signal.aborted) {
      const current = requests;
      requests = [];
      try {
        const queries = current.map(({row,token}) => ({
          package:{name:row.name,ecosystem:'npm'}, version:row.version, ...(token ? {page_token:token} : {}),
        }));
        const data = await jsonFrom('https://api.osv.dev/v1/querybatch',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queries}),
        },signal);
        if(!Array.isArray(data.results) || data.results.length !== current.length) break;
        current.forEach((context,i) => {
          const {row,ids,seen}=context;
          const page = data.results[i];
          if(!isObject(page) || page.error || (page.vulns !== undefined && !Array.isArray(page.vulns)) ||
             (page.next_page_token !== undefined && typeof page.next_page_token !== 'string')) return;
          const findings = page.vulns ?? [];
          if(findings.some(entry=>typeof entry?.id !== 'string' || !entry.id)) return;
          for(const entry of findings) ids.add(entry.id);
          row.ids = [...ids];
          const token = page.next_page_token;
          if(!token) {row.state = ids.size ? 'found' : 'empty'; delete row.note; return;}
          if(seen.has(token) || seen.size >= 10) return;
          seen.add(token); context.token=token; requests.push(context);
        });
      } catch { break; }
    }
  }
  window.LabAudit={inventory,check,limit,maxBytes};
})();
