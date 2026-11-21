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
    return {nodes,rootKey,copyKeys:copies.map(copy=>copy.path),hasLock:Boolean(packages)};
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
  function startingNodes(data, hasManifest) {
    const root = data.nodes.get(data.rootKey);
    const starts = new Set(root ? [root.key] : []);
    if (!hasManifest) for (const key of data.copyKeys) starts.add(key);
    else if (root) for (const edge of root.outgoing) starts.add(edge.to);
    return [...starts].map(key=>data.nodes.get(key));
  }

  function layout(levels, limit, vertical) {
    const width = 178, height = 52;
    const positions = new Map(), rows = [];
    for (const [key,level] of levels) {
      if (positions.size >= limit) break;
      const row = rows[level] || 0;
      rows[level] = row + 1;
      positions.set(key,{level,row});
    }
    const longest = Math.max(1,...rows), depth = rows.length - 1;
    for (const pos of positions.values()) {
      const across = pos.row + (longest - rows[pos.level])/2;
      pos.x = 50 + (vertical ? across * 200 : pos.level * 255);
      pos.y = 30 + (vertical ? pos.level * 105 : across * 76);
    }
    const bounds = {
      width: 100 + width + (vertical ? (longest - 1)*200 : depth*255),
      height: 60 + height + (vertical ? depth*105 : (longest - 1)*76)
    };
    return {positions, bounds, width, height};
  }
  const api = {create, neighborhood, startingNodes, layout};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.DepMapModel = api;
})();
