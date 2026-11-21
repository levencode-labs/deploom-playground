'use strict';
(() => {
  const lockGraph=typeof module==='object' && module.exports ? require('./lock-graph.js') : window.LabLockGraph;
  const compare=(a,b)=>a<b ? -1 : a>b ? 1 : 0;

  // Rules describe ecosystems by their published scopes, core package names and
  // conventional plugin prefixes. A mention of "react" in an unrelated name
  // does not classify it. An integration belongs to its plugin host.
  const families = [
    ['ESLint', /^(?:@(?:eslint|eslint-community|typescript-eslint)\/|(?:@[^/]+\/)?eslint-(?:plugin|config|import-resolver|formatter)(?:-|$)|(?:eslint|typescript-eslint|espree|eslint-scope|eslint-visitor-keys|@types\/eslint(?:-scope)?)$)/],
    ['Storybook', /^(?:@storybook\/|storybook(?:$|-(?:addon|builder|preset)-))/],
    ['Stylelint', /^(?:@stylelint\/|stylelint(?:$|-(?:config|plugin|order|scss)(?:-|$)))/],
    ['Babel', /^(?:@babel\/|babel-(?:core$|cli$|plugin-|preset-|runtime(?:-|$)))/],
    ['Vite', /^(?:@vitejs\/|vite$|vite-plugin-|(?:@[^/]+\/)vite-plugin-)/],
    ['Vitest', /^(?:@vitest\/|vitest$)/],
    ['webpack', /^(?:@(?:webpack-cli|webpack)\/|webpack(?:$|-cli$|-dev-server$|-merge$)|(?:css|style|sass|less|babel|ts|file|url|raw|source-map|coffee|worker|html)-loader$|(?:mini-css-extract|html-webpack|terser-webpack|fork-ts-checker-webpack|copy-webpack)-plugin$)/],
    ['Jest', /^(?:@jest\/|(?:jest|babel-jest|ts-jest|@types\/jest)$|jest-(?:(?:cli|circus|diff|config|runner|junit|mock|snapshot)$|environment-|watch-))/],
    ['Testing Library', /^@testing-library\//],
    ['React', /^(?:(?:react|react-dom|react-is|react-refresh|react-test-renderer|react-router|react-router-dom|scheduler)$|@types\/(?:react|react-dom|react-router|react-router-dom|react-test-renderer)$|@react-router\/)/],
    ['TypeScript', /^(?:@(?:typescript|tsconfig)\/|(?:typescript|tslib|ts-node|tsx|tsconfig-paths)$)/],
    ['Prettier', /^(?:@prettier\/|prettier$|prettier-plugin-)/],
    ['Rollup', /^(?:@rollup\/|rollup$|rollup-plugin-)/],
    ['Vue', /^(?:@vue\/|vue(?:$|-router$|-loader$|-tsc$))/],
    ['Angular', /^@angular(?:-devkit)?\//],
    ['Svelte', /^(?:@sveltejs\/|svelte(?:$|-check$|-preprocess$))/],
    ['PostCSS', /^(?:postcss$|postcss-(?:loader|import|nested|preset-env|modules)$|autoprefixer$)/],
    ['WebAssembly', /^@webassemblyjs\//],
  ];
  function familyFor(name,requirements) {
    const identities=new Set(requirements.map(({range})=>{
      if (!range.startsWith('npm:')) return name;
      const spec=range.slice(4), at=spec.indexOf('@',1);
      return at<0 ? spec : spec.slice(0,at);
    }));
    if (identities.size!==1) return null;
    const [identity]=identities;
    return families.find(([,pattern])=>pattern.test(identity))?.[0] || null;
  }

  function component(start,neighbors,visited,accept) {
    const queue=[start];
    visited.add(start);
    for (let i=0;i<queue.length;i++) {
      const current=queue[i];
      for (const next of neighbors.get(current).keys()) {
        if (!visited.has(next) && accept(current,next)) {visited.add(next);queue.push(next);}
      }
    }
    return queue.sort(compare);
  }

  // Louvain's local-moving phase at resolution 1. Weights include both
  // directions; an internal edge becomes a loop of weight two on contraction.
  function localMoving(links,volume,passes) {
    const ids=[...links.keys()].sort(compare), owner=new Map(), mass=new Map(), degrees=new Map();
    for (const id of ids) {
      let degree=0;
      for (const weight of links.get(id).values()) degree+=weight;
      owner.set(id,id);mass.set(id,degree);degrees.set(id,degree);
    }
    for (let pass=0;pass<passes;pass++) {
      let moved=false;
      for (const id of ids) {
        const old=owner.get(id), degree=degrees.get(id), toGroup=new Map();
        for (const [next,weight] of links.get(id)) {
          if (next===id) continue;
          const label=owner.get(next);
          toGroup.set(label,(toGroup.get(label)||0)+weight);
        }
        mass.set(old,mass.get(old)-degree);
        const score=label=>(toGroup.get(label)||0)*volume-degree*mass.get(label);
        const baseline=score(old);
        let best=old, bestScore=baseline;
        for (const candidate of toGroup.keys()) {
          const value=score(candidate);
          if (value>bestScore || (value===bestScore && value>baseline && compare(candidate,best)<0)) {
            best=candidate;bestScore=value;
          }
        }
        mass.set(best,mass.get(best)+degree);
        if (best!==old) {owner.set(id,best);moved=true;}
      }
      if (!moved) break;
    }
    return owner;
  }

  function clusterComponent(names,neighbors) {
    let links=new Map(names.map(name=>[name,neighbors.get(name)]));
    let members=new Map(names.map(name=>[name,[name]]));
    let volume=0;
    for (const linksForName of links.values()) volume+=linksForName.size;
    const passes=Math.max(1,Math.min(24,Math.floor(2_000_000/volume)));
    for (let level=0;level<20;level++) {
      const partition=localMoving(links,volume,passes);
      const merged=new Map();
      for (const [id,group] of partition) {
        if (!merged.has(group)) merged.set(group,[]);
        for (const name of members.get(id)) merged.get(group).push(name);
      }
      if (merged.size===members.size) break;
      members=merged;
      if (members.size===1) break;
      const coarser=new Map([...merged.keys()].map(id=>[id,new Map()]));
      for (const [from,adjacent] of links) {
        const row=coarser.get(partition.get(from));
        for (const [to,weight] of adjacent) {
          const group=partition.get(to);
          row.set(group,(row.get(group)||0)+weight);
        }
      }
      links=coarser;
    }
    return members.values();
  }

  function structuralGroups(neighbors) {
    const groups=[], visited=new Set(), assigned=new Set(), isolates=[];
    for (const [name,adjacent] of neighbors) {
      if (!adjacent.size) {isolates.push(name);continue;}
      if (visited.has(name)) continue;
      const part=component(name,neighbors,visited,()=>true);
      for (const community of clusterComponent(part,neighbors)) {
        const allowed=new Set(community);
        // A bridge node can leave a community during local moving. Split off
        // disconnected fragments rather than presenting a group with no path.
        for (const seed of community) if (!assigned.has(seed)) {
          const members=component(seed,neighbors,assigned,(_,next)=>allowed.has(next));
          groups.push({id:'cohort:'+members[0],kind:'community',members});
        }
      }
    }
    groups.sort((a,b)=>compare(a.id,b.id));
    if (isolates.length) groups.push({id:'unlinked',kind:'unlinked',members:isolates});
    return groups;
  }

  function nameCommunity(group,nodes,neighbors) {
    const families=new Map();
    let hub=group.members[0], maximum=-1;
    const membership=new Set(group.members);
    for (const name of group.members) {
      const family=nodes.get(name).family;
      if (family) families.set(family,(families.get(family)||0)+1);
      let degree=0;
      for (const next of neighbors.get(name).keys()) if (membership.has(next)) degree++;
      if (degree>maximum) {hub=name;maximum=degree;}
    }
    const ordered=[...families].sort((a,b)=>b[1]-a[1] || compare(a[0],b[0]));
    const dominant=ordered[0];
    return {label:dominant && dominant[1]*2>group.members.length ? dominant[0] : hub,hub};
  }

  function describe(groups,nodes,neighbors,key) {
    const byName=new Map(),names=new Map();
    for (const group of groups) {
      if (group.kind==='community') {
        const {label,hub}=nameCommunity(group,nodes,neighbors);
        group.label=label;
        if (!names.has(label)) names.set(label,[]);
        names.get(label).push({group,hub});
      }
      group.label??=null;group.internalLinks=0;group.externalLinks=0;
      for (const name of group.members) {nodes.get(name)[key]=group.id;byName.set(name,group);}
    }
    for (const list of names.values()) if (list.length>1) {
      for (const {group,hub} of list) if (group.label!==hub) group.label+=' · '+hub;
    }
    for (const [name,adjacent] of neighbors) {
      const from=byName.get(name);
      for (const next of adjacent.keys()) {
        if (compare(name,next)>=0) continue;
        const to=byName.get(next);
        if (from===to) from.internalLinks++;
        else {from.externalLinks++;to.externalLinks++;}
      }
    }
    for (const group of groups) {
      const n=group.members.length;
      group.linked=group.internalLinks>0;
      group.density=n>1 ? 2*group.internalLinks/(n*(n-1)) : 0;
    }
    return groups;
  }

  function projections(nodes,edges) {
    const neighbors=new Map([...nodes.keys()].map(name=>[name,new Map()]));
    for (const {from,to} of edges) if (from!==to) {
      neighbors.get(from).set(to,1);neighbors.get(to).set(from,1);
    }
    const groups=describe(structuralGroups(neighbors),nodes,neighbors,'groupId');
    const known=new Map(),dev=[],runtime=[];
    for (const node of nodes.values()) {
      if (!node.family) {
        const developmentOnly=node.requirements.every(req=>req.group==='devDependencies');
        (developmentOnly ? dev : runtime).push(node.name);
        continue;
      }
      if (!known.has(node.family)) known.set(node.family,{id:'family:'+node.family,kind:'family',label:node.family,members:[]});
      known.get(node.family).members.push(node.name);
    }
    const ecosystems=[...known.values()].sort((a,b)=>compare(a.id,b.id));
    if (dev.length) ecosystems.push({id:'other:dev',kind:'other',label:'Other dev tooling',members:dev});
    if (runtime.length) ecosystems.push({id:'other:runtime',kind:'other',label:'Other runtime',members:runtime});
    return {groups,ecosystems:describe(ecosystems,nodes,neighbors,'ecosystemId')};
  }

  function build(network,manifest) {
    const declarations=new Map();
    for (const group of lockGraph.groupKeys) {
      const map=manifest?.[group];
      if (!map || typeof map!=='object' || Array.isArray(map)) continue;
      for (const [name,range] of Object.entries(map)) {
        if (!lockGraph.usableName(name) || typeof range!=='string') continue;
        if (!declarations.has(name)) declarations.set(name,[]);
        declarations.get(name).push({group,range});
      }
    }
    const nodes=new Map();
    for (const name of [...declarations.keys()].sort(compare)) {
      const requirements=declarations.get(name);
      nodes.set(name,{name,key:null,keys:[],version:'',requirements,family:familyFor(name,requirements)});
    }
    const hasLock=Boolean(network?.hasLock), edges=[];
    if (hasLock && nodes.size) {
      const copies=new Set(network.copyKeys), owners=new Map();
      for (const edge of network.nodes.get(network.rootKey)?.outgoing || []) {
        if (!copies.has(edge.to) || owners.has(edge.to)) continue;
        const locked=network.nodes.get(edge.to), declared=nodes.get(locked.name);
        if (!declared) continue;
        declared.keys.push(edge.to);
        owners.set(edge.to,declared);
      }
      function directOwner(key) {
        if (owners.has(key)) return owners.get(key);
        if (!copies.has(key)) return null;
        const target=network.nodes.get(key), declared=nodes.get(target.name);
        if (!declared || !target.record || !key.startsWith(target.name+'@')) return null;
        // Yarn groups descriptors in one lock record. Berry can also provide a full
        // locator, including the virtual peer context. An equal version alone proves neither.
        const locator=target.record.resolution;
        const same=declared.keys.some(directKey=>{
          const direct=network.nodes.get(directKey).record;
          return direct===target.record || (typeof locator==='string' && locator.indexOf('@',1)>0 && direct?.resolution===locator);
        });
        return same ? declared : null;
      }
      for (const node of nodes.values()) {
        if (!node.keys.length) continue;
        node.keys.sort(compare);node.key=node.keys[0];node.version=network.nodes.get(node.key).version;
        for (const fromKey of node.keys) for (const edge of network.nodes.get(fromKey).outgoing) {
          const target=directOwner(edge.to);
          if (!target) continue;
          edges.push({from:node.name,to:target.name,fromKey,toKey:edge.to,group:edge.group,
            range:edge.range,state:edge.state,reason:edge.reason});
        }
      }
      edges.sort((a,b)=>compare(a.from,b.from) || compare(a.to,b.to) || compare(a.fromKey,b.fromKey) ||
        compare(a.toKey,b.toKey) || compare(a.group,b.group) || compare(a.range,b.range));
    }
    return {hasLock,nodes,edges,...projections(nodes,edges)};
  }

  const api={build};
  if (typeof module==='object' && module.exports) module.exports=api;
  else window.LabCohorts=api;
})();
