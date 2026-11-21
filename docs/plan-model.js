'use strict';
(() => {
  const { usableName, lockedPackage } = LabLockGraph;
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const has = (map, name) => object(map) && Object.hasOwn(map, name);
  const prefix = 'node_modules/';
  const groupNames = ['dependencies','devDependencies','optionalDependencies'];
  function read(manifest, lock, targets) {
    const yarn = window.LabYarn?.format(lock?.packages);
    if (!object(manifest) || (!yarn && lock?.lockfileVersion !== 3) || !object(lock.packages) || !object(lock.packages[''])) throw Error('files');
    if (!object(targets) || !Object.keys(targets).length || Object.keys(targets).length > 20) throw Error('targets');
    return Object.entries(targets).map(([name, target]) => {
      const groups = groupNames.filter(group => has(manifest[group], name));
      const hit = yarn && groups.length && LabYarn.resolve(lock.packages,{name,range:manifest[groups[0]][name]});
      const record = yarn ? hit?.record : lock.packages['node_modules/' + name];
      if (!usableName(name) || !groups.length || typeof target !== 'string' || treeSemver.valid(target) !== target) throw Error('target: ' + name);
      if (groups.some(group => !treeSemver.validRange(manifest[group][name])) || !object(record) || record.link ||
          (record.name && record.name !== name) || !treeSemver.valid(record.version)) throw Error('source: ' + name);
      const publicRegistry = yarn ? LabYarn.identity(lock.packages,hit.key)===name : LabLockGraph.publicTarball(record, name);
      return {name, target, groups, record, publicRegistry};
    });
  }

  function assessYarn(manifest,lock,changes,metadata,local) {
    const checks=[],issues=[],unknown=[];
    const roots=new Map();
    for (const edge of LabLockGraph.declarations(manifest,true)) {
      const hit=LabYarn.resolve(lock.packages,edge);
      if(hit) roots.set(edge.name,hit);
    }
    const targets=new Map(changes.map(change=>[change.name,change]));
    for (const [name,hit] of roots) {
      const change=targets.get(name);
      const updating=change && change.target!==hit.record.version;
      const key=updating && name+'@'+change.target;
      const record=updating ? local.get(key) || (change.publicRegistry && metadata.get(key)) : hit.record;
      if (!record || (!updating && LabYarn.format(lock.packages)==='Yarn Classic' && !record.peerDependencies)) {
        unknown.push(hit.key); continue;
      }
      for(const edge of LabLockGraph.declarations(record,false)) {
        if(edge.group!=='peerDependencies' || (!updating && !targets.has(edge.name))) continue;
        const version=targets.get(edge.name)?.target || roots.get(edge.name)?.record.version;
        if(!version || !treeSemver.validRange(edge.range)) {
          if(!edge.optional) unknown.push(hit.key+' → '+edge.name);
          continue;
        }
        const item={path:hit.key,name:edge.name,range:edge.range,version};
        (treeSemver.satisfies(version,edge.range)?checks:issues).push(item);
      }
    }
    return {checks,issues,unknown};
  }
  function assess(lock, changes, metadata, local = new Map()) {
    const packages = lock.packages;
    const byName = new Map(changes.map(change => [change.name, change]));
    const issues = [], unknown = [], checks = [];
    for (const [path, current] of Object.entries(packages)) {
      const direct = path.startsWith(prefix) ? byName.get(path.slice(prefix.length)) : null;
      const updating = direct && current?.version !== direct.target;
      const key = updating ? direct.name + '@' + direct.target : null;
      const spec = updating ? local.get(key) || (direct.publicRegistry && metadata.get(key)) : current;
      if (!object(spec) || spec.link) {
        if (updating || current?.link) unknown.push(path);
        continue;
      }
      if (spec.peerDependencies !== undefined && !object(spec.peerDependencies)) { unknown.push(path); continue; }
      for (const [name, range] of Object.entries(spec.peerDependencies || {})) {
        const hit = lockedPackage(packages, path, {name, group:'peerDependencies'});
        const provider = hit?.key.startsWith(prefix) && byName.get(hit.key.slice(prefix.length));
        if (!updating && !(provider && provider.record.version !== provider.target)) continue;
        if (!usableName(name) || typeof range !== 'string' || !treeSemver.validRange(range) || hit?.record?.link) {
          unknown.push((path || '.') + ' → ' + name); continue;
        }
        if (!hit && spec.peerDependenciesMeta?.[name]?.optional) continue;
        const version = provider?.target || hit?.record?.version;
        const row = {path:path || '.', name, range, version};
        (version && treeSemver.satisfies(version,range) ? checks : issues).push(row);
      }
    }
    return {checks, issues, unknown};
  }
  window.LabPlan = {read, assess, assessYarn};
})();
