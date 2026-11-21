'use strict';
(() => {
  const { valid, validRange, satisfies } = treeSemver;
  const compare = (a,b) => satisfies(a,'>'+b) ? 1 : satisfies(a,'<'+b) ? -1 : 0;
  const stable = v => valid(v) === v && !v.split('+')[0].includes('-');
  function instant(value, now) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT.*(Z|[+-]\d\d:\d\d)$/i.test(value)) return null;
    const n = Date.parse(value);
    return Number.isFinite(n) && n <= now ? new Date(n).toISOString() : null;
  }
  function yearBefore(stamp) {
    const date = new Date(stamp);
    const month = date.getUTCMonth();
    date.setUTCFullYear(date.getUTCFullYear()-1);
    if (date.getUTCMonth() !== month) date.setUTCDate(0);
    return date.toISOString();
  }
  function freshness(doc, installedVersion, range = '*', now = Date.now()) {
    const entries = Object.keys(doc?.versions || {}).filter(stable).sort(compare);
    const latest = entries.at(-1) || null;
    const released = instant(doc?.time?.[installedVersion],now);
    const latestReleased = instant(doc?.time?.[latest],now);
    const cutoff = latestReleased && yearBefore(latestReleased);
    const info = {status:'unknown',latest,released,latestReleased,cutoff,target:null};
    if (!installedVersion || !valid(installedVersion) || !Object.hasOwn(doc?.versions || {},installedVersion) || !released || !cutoff) return info;
    if (released >= cutoff) return {...info,status:'fresh'};
    const choices = entries.filter(v => {
      const date = instant(doc.time?.[v],now);
      return compare(v,installedVersion)>0 && date && date >= cutoff && !doc.versions[v]?.deprecated;
    });
    const target = choices.find(v => validRange(range) && satisfies(v,range)) || choices[0] || null;
    return {...info,status:'stale',target};
  }

  function inventory(manifest, lock) {
    const yarn = LabYarn.format(lock?.packages);
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || (!yarn && lock?.lockfileVersion !== 3) || !lock?.packages?.['']) throw Error('files');
    const roots = new Map();
    for (const edge of LabLockGraph.declarations(manifest,true)) {
      if (edge.group==='peerDependencies' || roots.has(edge.name)) continue;
      const hit = LabLockGraph.lockedPackage(lock.packages,'',edge);
      const exact = hit?.record?.version;
      const registry = validRange(edge.range) && valid(exact) && !hit.record.link && (!hit.record.name || hit.record.name===edge.name);
      // Berry records a protocol and version, but no registry origin.
      const publicRegistry = Boolean(registry && (yarn
        ? yarn==='Yarn Classic' && LabYarn.identity(lock.packages,hit.key)===edge.name
        : LabLockGraph.publicTarball(hit.record,edge.name)));
      roots.set(edge.name,{...edge,version:registry ? exact : null,publicRegistry});
    }
    return [...roots.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }

  function project(rows, documents, level) {
    if (!['yellow','green'].includes(level)) throw Error('policy');
    const required = Math.ceil(rows.length * (level==='green' ? 1 : 0.8));
    const facts = rows.map(row=>({...row,...freshness(documents.get(row.name),row.version,row.range)}));
    const fresh = facts.filter(row=>row.status==='fresh').length;
    const unknown = facts.filter(row=>row.status==='unknown').length;
    const cost = row=>satisfies(row.target,row.range) ? 0 : row.version.split('.')[0]===row.target.split('.')[0] ? 1 : 2;
    const candidates = facts.filter(row=>row.target).sort((a,b)=>cost(a)-cost(b) || a.name.localeCompare(b.name));
    const targets = candidates.slice(0,Math.max(0,required-fresh));
    return {facts,total:rows.length,fresh,unknown,required,targets,projected:fresh+targets.length};
  }
  window.LabCriterion = {freshness,inventory,project};
})();
