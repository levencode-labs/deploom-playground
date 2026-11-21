'use strict';

// Only root npm overrides affect installation. A lockfile can demonstrate a version
// mismatch; an override can explain that choice, but cannot establish peer compatibility.
(() => {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const t = (ru,en) => window.Lab.t(ru,en);

  function compile(overrides, manifest) {
    if (!object(overrides) || !Object.keys(overrides).length) return null;
    let nextId = 0;
    function scope(entries, path) {
      const result = {id:nextId++, rules:new Map()};
      for (const [key, value] of Object.entries(entries)) {
        if (key === '.') continue;
        // The @ starting a scope is part of the package name.
        const split = key.indexOf('@', 1);
        const name = split < 0 ? key : key.slice(0,split);
        if (!LabLockGraph.usableName(name)) continue;
        const selector = split < 0 ? '*' : key.slice(split+1) || '*';
        const label = [...path,key];
        const replacement = object(value) ? value['.'] : value;
        const nested = object(value) && Object.keys(value).some(k=>k!=='.') ? scope(value,label) : null;
        const rules = result.rules.get(name) || [];
        rules.push({selector, replacement, nested, label:label.join(' → ')});
        result.rules.set(name,rules);
      }
      return result;
    }
    const root = scope(overrides,[]);
    const pins = new Map([...LabLockGraph.declarations(manifest,true)].map(e=>[e.name,e.range]));

    // npm selects a version-qualified target using its incoming requested range.
    // For unsupported selectors, keep uncertainty confined to the same package.
    function mayIntersect(left,right) {
      if (left === '*') return true;
      const a = treeSemver.validRange(left), b = treeSemver.validRange(right);
      if (!a || !b) return true;
      if (treeSemver.valid(left)) return treeSemver.satisfies(left,right);
      if (treeSemver.valid(right)) return treeSemver.satisfies(right,left);
      return a.split('||').some(x => b.split('||').some(y =>
        LabRangeScale.intervals(x.trim()+' '+y.trim()).some(interval=>!interval.empty)));
    }

    function downstream(context, name, version, range) {
      const active = new Set(context);
      for (const parent of context) {
        for (const rule of parent.rules.get(name) || []) {
          if (!rule.nested) continue;
          const known = treeSemver.valid(version) && treeSemver.validRange(rule.selector);
          const matches = rule.selector === '*' || (known ? treeSemver.satisfies(version,rule.selector) : mayIntersect(rule.selector,range));
          if (matches) active.add(rule.nested);
        }
      }
      return active;
    }

    function check(result, name, range, context) {
      if (!['bad','good'].includes(result.state)) return result;
      const rules = [...context].flatMap(parent=>(parent.rules.get(name) || []).filter(rule=>
        rule.replacement !== undefined && mayIntersect(rule.selector,range)));
      if (!rules.length) return result;
      // A $ reference can use a direct dependency spec. Alias, file and git targets
      // require installer evidence; the graph alone cannot evaluate them.
      const decisions = rules.map(rule=>{
        const raw = rule.replacement;
        const spec = typeof raw === 'string' && raw.startsWith('$') ? pins.get(raw.slice(1)) : raw;
        const supported = typeof spec === 'string' && treeSemver.validRange(spec) && treeSemver.validRange(rule.selector);
        return {rule, compatible:supported ? treeSemver.satisfies(result.version,spec) : null};
      });
      if (result.state === 'good' && decisions.every(d=>d.compatible===true)) return result;
      const bad = result.state === 'bad' && decisions.every(d=>d.compatible===false);
      const evidence = decisions.map(({rule})=>rule.label+' = '+String(rule.replacement)).join(', ');
      const reason = t('Исходное требование ', 'Original requirement ') + range +
        t(', версия ', ', version ') + result.version + '. Override: ' + evidence + '. ' +
        (bad ? t('Версия также вне диапазона override.', 'The version is also outside the override range.') :
          t('Совместимость по этому правилу требует проверки в проекте.', 'Verify compatibility under this rule in the project.'));
      return {...result, state:bad ? 'bad' : 'unknown', reason};
    }

    function annotate(network) {
      // One hoisted copy can have multiple logical parents. Carry each reachable
      // scope once per node, including through cycles; the path tree checks each path separately.
      const contexts = new Map();
      const queue = [];
      function enqueue(key, active) {
        const seen = contexts.get(key) || new Set();
        if (seen.has(active)) return;
        seen.add(active); contexts.set(key,seen);
        queue.push([key,active]);
      }
      if (network.nodes.has(network.rootKey)) enqueue(network.rootKey,root);
      for (let pos=0; pos<queue.length; pos++) {
        const [key,active] = queue[pos];
        for (const edge of network.nodes.get(key).outgoing) {
          const child = network.nodes.get(edge.to);
          for (const next of downstream([active],child.name,child.version,edge.range)) {
            enqueue(edge.to,next);
          }
        }
      }
      for (const node of network.nodes.values()) {
        for (const edge of node.outgoing) {
          const child = network.nodes.get(edge.to);
          const result = check({...edge,version:child.version},child.name,edge.range,contexts.get(node.key) || [root]);
          edge.state=result.state; edge.reason=result.reason;
        }
      }
    }
    return {root, downstream, check, annotate};
  }
  window.TreeOverrides = {compile};
})();
