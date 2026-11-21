'use strict';

(() => {
  function create({ manifest, packages, rootKey, copies, assess, declarations }) {
    const nodes = new Map();
    function add(key, name, version, record) {
      if (!nodes.has(key)) nodes.set(key, { key, name, version, record, incoming: [], outgoing: [] });
      return nodes.get(key);
    }
    if (rootKey === '') {
      const name = typeof manifest.name === 'string' ? manifest.name : 'package.json';
      add('', name, typeof manifest.mapSource === 'string' ? manifest.mapSource : 'package.json', manifest);
    }
    for (const copy of copies) {
      const record = packages[copy.path];
      add(copy.path, copy.name, typeof record.version === 'string' ? record.version : '', record);
    }
    // Iterating the map also visits packages discovered from manifest-only metadata.
    for (const owner of nodes.values()) {
      if (!owner.record) continue;
      for (const edge of declarations(owner.record, owner.key === rootKey)) {
        const result = assess(owner.key, edge);
        const key = result.key ?? JSON.stringify([owner.key, edge.name, edge.range]);
        const target = add(key, edge.name, result.version || edge.range, result.record);
        const connection = { from: owner.key, to: key, group: edge.group, range: edge.range, state: result.state, reason:result.reason };
        owner.outgoing.push(connection);
        target.incoming.push(connection);
      }
    }
    return { nodes, rootKey };
  }

  function neighborhood(data, anchor, reverse, maxDepth) {
    if (!data.nodes.has(anchor)) return new Map();
    const levels = new Map([[anchor, 0]]);
    const queue = [anchor];
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i], depth = levels.get(key);
      if (depth >= maxDepth) continue;
      const node = data.nodes.get(key);
      for (const edge of reverse ? node.incoming : node.outgoing) {
        const next = reverse ? edge.from : edge.to;
        if (!levels.has(next)) {
          levels.set(next, depth + 1);
          queue.push(next);
        }
      }
    }
    return levels;
  }
  const api = {create, neighborhood};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DepMapModel = api;
})();
