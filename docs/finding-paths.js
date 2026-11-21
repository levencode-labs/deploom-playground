'use strict';

(() => {
  const cache = new WeakMap();
  const edgeBudget = 150000;
  const routeLimit = 5;
  const depthLimit = 14;

  function indexFor(lock, manifest) {
    const cached = cache.get(lock);
    if (cached && cached.manifest === manifest) return cached;
    const packages = lock.packages;
    const yarn = window.LabYarn?.format(packages);
    const root = manifest || (!yarn && packages['']);
    const incoming = new Map();
    const outgoing = new Map();
    let edges = 0, clipped = false;
    for (const key of Object.keys(packages)) {
      const record = key === '' ? root : packages[key];
      if (!record || typeof record !== 'object' || record.link) continue;
      for (const declaration of LabLockGraph.declarations(record,key === '')) {
        if (++edges > edgeBudget) { clipped = true; break; }
        const match = LabLockGraph.lockedPackage(packages,key,declaration);
        if (!match?.record || match.record.link) continue;
        const edge = {from:key,to:match.key,...declaration};
        if (!incoming.has(edge.to)) incoming.set(edge.to,[]);
        if (!outgoing.has(key)) outgoing.set(key,[]);
        incoming.get(edge.to).push(edge);
        outgoing.get(key).push(edge);
      }
      if (clipped) break;
    }
    const first = new Map(), distance = new Map([['',0]]), queue = [''];
    for (let i = 0; i < queue.length; i++) {
      const owner = queue[i];
      for (const edge of outgoing.get(owner) || []) {
        if (distance.has(edge.to)) continue;
        first.set(edge.to,edge);
        distance.set(edge.to,distance.get(owner)+1);
        queue.push(edge.to);
      }
    }
    const index = {packages,root,yarn,incoming,first,distance,clipped,manifest};
    cache.set(lock,index);
    return index;
  }

  function routesTo(index,target) {
    const direct = index.incoming.get(target) || [];
    if (!index.first.has(target)) return {routes:[],direct,limited:index.clipped};
    // Preserve one complete shortest route even if alternative paths exceed the search budget.
    const shortest = [];
    for (let key = target; key !== ''; ) {
      const edge = index.first.get(key);
      shortest.push(edge);
      key = edge.from;
    }
    shortest.reverse();
    const routes = [shortest];
    let searched = 0, limited = index.clipped;
    if (shortest.length > depthLimit) return {routes,direct,limited:true};
    const tail = [], visiting = new Set([target]);
    function explore(key) {
      if (key === '') {
        if (tail.length !== shortest.length || tail.some((edge,i)=>edge !== shortest[shortest.length-i-1])) {
          if (routes.length === routeLimit) { limited = true; return false; }
          routes.push([...tail].reverse());
        }
        return true;
      }
      if (tail.length === depthLimit) { limited = true; return true; }
      for (const edge of index.incoming.get(key) || []) {
        if (++searched > 4000) { limited = true; return false; }
        if (!index.distance.has(edge.from) || visiting.has(edge.from)) continue;
        visiting.add(edge.from); tail.push(edge);
        if (!explore(edge.from)) return false;
        tail.pop(); visiting.delete(edge.from);
      }
      return true;
    }
    explore(target);
    return {routes,direct,limited};
  }

  function nodeLabel(index,key,t) {
    if (key === '') return t('Корень проекта','Project root');
    const record = index.packages[key];
    const name = record?.name || (index.yarn ? LabYarn.parts(key)?.name : key.split('node_modules/').at(-1));
    return name && record?.version ? name+'@'+record.version : key;
  }
  function el(tag,content) {
    const node = document.createElement(tag);
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function svgEl(tag,attributes,value) {
    const node = document.createElementNS('http://www.w3.org/2000/svg',tag);
    for (const [key,v] of Object.entries(attributes)) node.setAttribute(key,String(v));
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function layout(routes) {
    const levels = new Map([['',0]]), connections = new Set();
    for (const route of routes) {
      route.forEach((edge,i)=>{
        levels.set(edge.to,Math.min(i+1,levels.get(edge.to) ?? Infinity));
        connections.add(edge);
      });
    }
    return {levels,connections};
  }

  function diagram(index,target,routes,t) {
    const {levels,connections} = layout(routes);
    const layers = [];
    for (const [key,level] of levels) (layers[level] ||= []).push(key);
    const occupied = layers.filter(Boolean);
    const cell = 220, row = 60, width = Math.max(...occupied.map(layer=>layer.length))*cell;
    const height = occupied.length*row, centers = new Map();
    occupied.forEach((layer,rank) => layer.forEach((key,column)=>{
      centers.set(key,{x:(width-layer.length*cell)/2+(column+0.5)*cell,y:rank*row+24});
    }));
    const svg = svgEl('svg',{viewBox:'0 0 '+width+' '+height,width,height,role:'img','aria-label':t('Граф путей к пакету. Точные версии и диапазоны приведены ниже.','Paths to the package. Exact versions and ranges follow below.')});
    for (const edge of connections) {
      const a = centers.get(edge.from), b = centers.get(edge.to);
      const down = a.y < b.y, start = a.y + (down ? 15 : -15), end = b.y + (down ? -16 : 16);
      const bend = a.y === b.y ? start-24 : (start+end)/2;
      const path = svgEl('path',{d:'M '+a.x+' '+start+' C '+a.x+' '+bend+', '+b.x+' '+bend+', '+b.x+' '+end,class:'finding-edge'});
      path.append(svgEl('title',{},edge.name+' '+edge.range+' · '+edge.group));
      svg.append(path);
      const tip = down ? -4 : 4;
      svg.append(svgEl('path',{d:'M '+(b.x-3)+' '+(end+tip)+' L '+b.x+' '+end+' L '+(b.x+3)+' '+(end+tip),class:'finding-edge'}));
    }
    for (const [key,center] of centers) {
      const label = nodeLabel(index,key,t);
      const g = svgEl('g',{class:key===target?'finding-node is-target':'finding-node'});
      g.append(svgEl('title',{},label));
      g.append(svgEl('rect',{x:center.x-102,y:center.y-15,width:204,height:30,rx:7}));
      g.append(svgEl('text',{x:center.x,y:center.y+5,'text-anchor':'middle'},label.length>26 ? label.slice(0,23)+'…' : label));
      svg.append(g);
    }
    const viewport = el('div'); viewport.className='finding-diagram'; viewport.append(svg);
    return viewport;
  }

  function routeDetails(index,result,t,showDiagram) {
    const section = el('details');
    section.open = !showDiagram;
    section.append(el('summary',t('Цепочки и диапазоны','Paths and requested ranges')+' · '+result.routes.length));
    const list = el('ol'); list.className='finding-route-list';
    for (const route of result.routes) {
      const li = el('li');
      li.append(el('strong',nodeLabel(index,'',t)));
      for (const edge of route) {
        const step = el('span');
        step.append(el('small',edge.group+' · '+edge.name+' '+edge.range),el('span',' → '+nodeLabel(index,edge.to,t)));
        li.append(step);
      }
      list.append(li);
    }
    section.append(list); return section;
  }

  function render(parent,{lock,manifest,row,t}) {
    if (!lock?.packages || !row.paths?.length) {
      parent.append(el('p',t('Для этой записи нет графа lock-файла.','No lockfile graph is available for this entry.'))); return;
    }
    const index = indexFor(lock,manifest);
    const body = el('div');
    const paths = row.paths;
    function show(target) {
      body.replaceChildren();
      const physical = el('code',target);
      const where = el('p',index.yarn ? t('Дескриптор Yarn · ','Yarn descriptor · ') : t('Запись в lock-файле · ','Lockfile entry · '));
      where.append(physical); body.append(where);
      if (row.publicPaths && !row.publicPaths.has(target)) body.append(el('small',t('Для этой записи публичное происхождение не подтверждено.','This entry has unconfirmed public provenance.')));
      const result = routesTo(index,target);
      if (result.routes.length) {
        const showDiagram = result.routes.every(route=>route.length <= depthLimit);
        if (showDiagram) body.append(diagram(index,target,result.routes,t));
        body.append(routeDetails(index,result,t,showDiagram));
      } else {
        body.append(el('p',index.yarn && !index.root
          ? t('Добавьте корневой package.json, чтобы связать Yarn-дескрипторы с проектом.','Add the root package.json to connect Yarn descriptors to the project.')
          : t('Путь от корня не подтверждён по доступным записям lock-файла.','The available lockfile records do not establish a path from the root.')));
        if (result.direct.length) {
          const list = el('ul');
          for (const edge of result.direct.slice(0,8)) list.append(el('li',nodeLabel(index,edge.from,t)+' · '+edge.group+' · '+edge.name+' '+edge.range));
          body.append(el('strong',t('Кто запрашивает пакет','Declared by')+' · '+result.direct.length),list);
        }
      }
      if (result.limited) body.append(el('small',t('Достигнут предел подробности. Возможны дополнительные связи.','The display or search limit was reached. More connections may exist.')));
    }
    if (paths.length > 1) {
      const label = el('label',t('Вхождение в lock-файле','Lockfile entry')+' ('+paths.length+') ');
      const select = el('select');
      for (const path of paths) {const option = el('option',path); option.value=path; select.append(option);}
      label.append(select); parent.append(label);
      select.addEventListener('change',()=>show(select.value));
    }
    parent.append(body); show(paths[0]);
  }

  window.LabFindingPaths = {indexFor,routesTo,render,layout};
})();
