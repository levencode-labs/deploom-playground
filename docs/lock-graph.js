'use strict';

(() => {
  const groupKeys = ['dependencies', 'optionalDependencies', 'devDependencies', 'peerDependencies'];
  const packageName = /^(?:@[a-z\d~][a-z\d._~-]*\/)?[a-z\d~][a-z\d._~-]*$/i;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const usableName = name => name.length <= 214 && packageName.test(name);
  const has = (obj, key) => Object.hasOwn(obj, key);
  function publicTarball(record, name) {
    if (!object(record) || record.link || record.private || record.inBundle || typeof record.resolved !== 'string') return false;
    try {
      const url = new URL(record.resolved);
      const filename = name.split('/').at(-1) + '-' + record.version + '.tgz';
      return url.origin === 'https://registry.npmjs.org' && !url.username && !url.password && !url.search && !url.hash &&
        decodeURIComponent(url.pathname) === '/' + name + '/-/' + filename;
    } catch { return false; }
  }
  function* declarations(record, root) {
    for (const group of groupKeys) {
      if (group === 'devDependencies' && !root) continue;
      const map = record[group];
      if (!object(map)) continue;
      for (const [name, range] of Object.entries(map)) {
        if (!usableName(name) || typeof range !== 'string') continue;
        if (group === 'dependencies' && object(record.optionalDependencies) && has(record.optionalDependencies, name)) continue;
        yield { name, range, group, optional: group === 'optionalDependencies' ||
          (group === 'peerDependencies' && record.peerDependenciesMeta?.[name]?.optional === true) };
      }
    }
  }

  // A peer's provider must be placed beside or above its consumer.
  function lockedPackage(packages, owner, edge) {
    if (window.LabYarn?.format(packages)) return LabYarn.resolve(packages,edge);
    const dirs = owner ? owner.split('/') : [];
    if (edge.group === 'peerDependencies' && owner) {
      const lastModules = dirs.lastIndexOf('node_modules');
      if (lastModules >= 0) dirs.splice(lastModules);
    }
    while (true) {
      if (dirs[dirs.length - 1] !== 'node_modules') {
        const key = [...dirs, 'node_modules', edge.name].join('/');
        if (has(packages, key)) return { key, record: packages[key] };
      }
      if (!dirs.length) return null;
      dirs.pop();
    }
  }

  function build(packages, rootManifest = packages['']) {
    const parents = new Map();
    const queue = [''];
    let edges = 0;
    for (let i = 0; i < queue.length; i++) {
      const owner = queue[i];
      const record = owner ? packages[owner] : rootManifest;
      if (!object(record)) continue;
      for (const edge of declarations(record, owner === '')) {
        if (++edges > 20_000) return { parents, clipped: true };
        const match = lockedPackage(packages, owner, edge);
        if (!match || !object(match.record) || match.record.link || parents.has(match.key)) continue;
        parents.set(match.key, { owner, ...edge });
        queue.push(match.key);
      }
    }
    return { parents, clipped: false };
  }

  function chain(graph, target) {
    if (!graph.parents.has(target)) return null;
    const result = [];
    for (let path = target; path !== ''; path = graph.parents.get(path).owner) result.push(path);
    result.push('');
    return result.reverse();
  }

  window.LabLockGraph = { groupKeys, usableName, publicTarball, declarations, lockedPackage, build, chain };
})();
