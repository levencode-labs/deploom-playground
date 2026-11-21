'use strict';
(() => {
  const {t} = Lab;
  const host = document.getElementById('cohort-view');
  const ns = 'http://www.w3.org/2000/svg';
  const column = 232, box = 184, card = 48, row = 65;
  const batch = 16, edgeLimit = 240;
  let activeModel, searchTerm = '', zoom = 1, grouping = 'ecosystems';
  let lastLayout;
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const colors = ['#8bd4fa','#f0c17a','#b9a6f2','#78dfcb','#f0a2bc','#b7dc86'];

  function labelOf(group) {
    if (group.id === 'other:dev') return t('Другие инструменты','Other dev tooling');
    if (group.id === 'other:runtime') return t('Другие библиотеки','Other runtime');
    return group.label || t('Без наблюдаемых связей','No observed links');
  }
  function colorOf(group) {
    if (group.kind === 'unlinked') return '#91a7bd';
    let hash=0;
    for (const char of group.id) hash=(hash*31+char.charCodeAt(0))>>>0;
    return colors[hash%colors.length];
  }
  function detailText(group) {
    if (group.kind === 'family') return t('Пакеты объединены по экосистеме ','These packages belong to the ')+group.label+t('. Стрелки показывают зависимости из lock-файла.',' ecosystem. Arrows show dependencies observed in the lockfile.');
    if (group.kind === 'unlinked') return t('В lock-файле не видно связей этих пакетов с другими прямыми зависимостями.','The lockfile shows no links between these packages and other direct dependencies.');
    if (group.kind === 'other') return t('Пакеты этой колонки объединены по разделу package.json.','The packages in this group share a package.json dependency section.');
    return t('Алгоритм Лувена выделил эту когорту по связям между прямыми зависимостями. Каждая пара пакетов учитывается один раз.','Louvain grouped these direct dependencies by their observed connections. Each pair of packages contributes once.');
  }

  function html(tag, value = '') {
    const el = document.createElement(tag); el.textContent = value; return el;
  }
  function svg(tag, attrs, text) {
    const el = document.createElementNS(ns,tag);
    for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function button(label, click) {
    const el = html('button',label); el.type='button'; el.onclick=click; return el;
  }
  function activate(el,label,callback) {
    el.setAttribute('role','button'); el.setAttribute('tabindex','0');
    el.setAttribute('aria-label',label); el.setAttribute('aria-pressed','false');
    el.append(svg('title',{},label));
    el.addEventListener('click',callback);
    el.addEventListener('keydown',e=>{
      if (e.key==='Enter' || e.key===' ') {e.preventDefault(); callback();}
    });
  }
  const truncate = (text, n) => text.length>n ? text.slice(0,n-1)+'…' : text;
  function curve(a,b) {
    const y=a.y+a.h/2, endY=b.y+b.h/2;
    if (a.x===b.x) {
      const x=a.x+box, bend=x+Math.min(38,14+Math.abs(endY-y)/30);
      return `M${x},${y} C${bend},${y} ${bend},${endY} ${x+2},${endY}`;
    }
    const right=a.x<b.x, x=a.x+(right?box:0), endX=b.x+(right?0:box), middle=(x+endX)/2;
    return `M${x},${y} C${middle},${y} ${middle},${endY} ${endX+(right?-2:2)},${endY}`;
  }

  function render(model,network,advisories,mode='packages') {
    host.replaceChildren();
    if (model!==activeModel) {activeModel=model;searchTerm='';zoom=1;lastLayout=null;}
    if (!model) return;
    if (!model.nodes.size) {
      host.append(html('p',t('Добавьте package.json с прямыми зависимостями.','Add a package.json that declares direct dependencies.')));return;
    }
    const groupsOnly=mode==='groups', structural=grouping==='connections';
    const projection=structural ? model.groups : model.ecosystems;
    const groupByName=new Map(), labels=new Map(), bridges=new Map();
    for (const group of projection) {
      labels.set(group.id,labelOf(group));
      for (const name of group.members) groupByName.set(name,group);
    }
    for (const edge of model.edges) {
      const from=groupByName.get(edge.from),to=groupByName.get(edge.to);
      if (from===to) continue;
      const pair=JSON.stringify([from.id,to.id]);
      if (!bridges.has(pair)) bridges.set(pair,{from:from.id,to:to.id,edges:[]});
      bridges.get(pair).edges.push(edge);
    }
    const available=projection.filter(group=>!groupsOnly || group.kind!=='unlinked' || group.externalLinks>0).sort((a,b)=>
      Number(b.kind==='family')-Number(a.kind==='family') || Number(a.kind==='unlinked')-Number(b.kind==='unlinked') ||
      b.externalLinks-a.externalLinks || b.members.length-a.members.length);
    const unlinked=projection.filter(group=>group.kind==='unlinked' && !group.externalLinks).reduce((n,group)=>n+group.members.length,0);
    const tools=html('div');tools.className='cohort-tools';
    const groupingLabel=html('label',t('Группировка','Group by'));
    const selector=html('select');selector.id='cohort-grouping';
    for (const [value,caption] of [['ecosystems',t('Экосистемы','Ecosystems')],['connections',t('Когорты по связям','Connection-based cohorts')]]) {
      const option=html('option',caption);option.value=value;selector.append(option);
    }
    selector.value=grouping;
    selector.onchange=()=>{
      grouping=selector.value;render(model,network,advisories,mode);
      document.getElementById('cohort-grouping').focus({preventScroll:true});
    };
    groupingLabel.append(selector);tools.append(groupingLabel);
    const label=html('label',t('Найти пакет или группу','Find a package or group'));
    const search=html('input');search.id='cohort-search';search.type='search';search.autocomplete='off';search.spellcheck=false;search.value=searchTerm;label.append(search);
    const zoomOut=button('−',()=>resize(zoom-.2)),zoomIn=button('+',()=>resize(zoom+.2)),scale=html('output');
    zoomOut.setAttribute('aria-label',t('Уменьшить группы','Zoom out of groups'));zoomIn.setAttribute('aria-label',t('Увеличить группы','Zoom into groups'));
    const zoomBar=html('div');zoomBar.className='cohort-zoom';zoomBar.append(zoomOut,scale,zoomIn);
    tools.append(label,zoomBar);host.append(tools);
    const note=html('p');note.className='hint cohort-caption';
    if (!model.hasLock) {
      note.textContent=structural ? t('Добавьте lock-файл, чтобы построить когорты по установленным связям.','Add a lockfile to identify cohorts from observed dependency links.') :
        t('Экосистемы видны по именам пакетов. Добавьте lock-файл, чтобы увидеть связи.','Package names identify ecosystems. Add a lockfile to see the connections.');
    } else {
      note.textContent=structural ? t('Лувен группирует пакеты с плотными внутренними связями. Выберите когорту, чтобы увидеть её плотность и состав.','Louvain groups packages with dense internal connections. Select a cohort to see its density and members.') :
        t('Имена пакетов определяют экосистемы. Пунктир соединяет их там, где в lock-файле есть зависимость.','Package names identify ecosystems. Dashed lines show where a lockfile dependency connects them.');
    }
    host.append(note);
    if (!available.length) {
      search.disabled=true;zoomOut.disabled=true;zoomIn.disabled=true;scale.value='100%';
      if (model.hasLock) host.append(html('p',t('Среди прямых зависимостей не найдено связных групп.','No connected groups were found among the direct dependencies.')));
      lastLayout=null;
      return;
    }
    const scroller=html('div');scroller.className='cohort-scroll';scroller.tabIndex=0;scroller.setAttribute('role','region');
    const graphLabel=groupsOnly ? t('Группы пакетов','Package groups') : t('Пакеты по группам','Packages by group');
    scroller.setAttribute('aria-label',graphLabel);
    const graph=svg('svg',{id:'cohort-map',role:'group','aria-label':graphLabel});scroller.append(graph);
    const counts=html('p');counts.className='hint cohort-counts';counts.setAttribute('role','status');
    const more=button(t('Показать ещё','Show more'),()=>{groupBudget+=batch;memberBudget+=batch;draw();});
    const info=html('section');info.id='cohort-info';info.setAttribute('aria-live','polite');
    host.append(scroller,counts,more,info);
    let groupBudget=batch,memberBudget=batch,canvasWidth=0,canvasHeight=0;
    function resize(value) {
      zoom=Math.max(.6,Math.min(1.6,Math.round(value*10)/10));
      graph.style.width=canvasWidth*zoom+'px';graph.style.height=canvasHeight*zoom+'px';
      scale.value=Math.round(zoom*100)+'%';zoomOut.disabled=zoom<=.6;zoomIn.disabled=zoom>=1.6;
    }
    const wires=[];
    function showRelations(applies) {
      for (const wire of wires) {
        const related=applies(wire);
        wire.el.classList.toggle('is-related',related);
        if (related) for (const key of [wire.from,wire.to]) {
          graphNodes.get(key)?.classList.add('is-related');
        }
      }
    }
    function select(target) {
      for (const el of graph.querySelectorAll('[aria-pressed="true"]')) el.setAttribute('aria-pressed','false');
      for (const el of graph.querySelectorAll('.is-related')) el.classList.remove('is-related');
      target?.setAttribute('aria-pressed','true');info.replaceChildren();
    }
    function evidence(edges) {
      const list=html('ul');list.className='cohort-evidence';info.append(list);
      let offset=0;
      const show=()=>{
        for (const edge of edges.slice(offset,offset+32)) {
          const li=html('li'),name=html('strong',edge.from+' → '+edge.to);
          li.append(name, ' · '+edge.group+' '+edge.range);
          if (edge.state==='bad') {li.className='map-connection-conflict';li.append(' · '+t('Конфликт','Conflict'));}
          if (edge.reason) li.append(' · '+edge.reason);
          list.append(li);
        }
        offset+=32;next.hidden=offset>=edges.length;
      };
      const next=button(t('Ещё связи','More connections'),show);info.append(next);show();
    }
    function showPackage(name,target) {
      const item=model.nodes.get(name);
      select(target);showRelations(wire=>wire.edges.some(edge=>edge.from===name || edge.to===name));
      info.append(html('h3',name+(item.version?' · '+item.version:'')));
      info.append(html('p',item.requirements.map(req=>req.group+' '+req.range).join(' · ')));
      const key=item.key;
      if (key!=null && network.nodes.has(key)) {
        const open=button(t('Открыть в дереве','Open in tree'),()=>host.dispatchEvent(new CustomEvent('cohort-open-tree',{bubbles:true,detail:{key}})));
        open.dataset.openTree='';info.append(open);
      }
      if (advisories) {
        const section=html('section',t('Проверяем сведения об уязвимостях…','Checking advisories…'));
        section.className='cohort-advisories';info.append(section);
        advisories.lookup(key).then(result=>LabMap.showAdvisories(section,result,item));
      }
      const edges=model.edges.filter(edge=>edge.from===name || edge.to===name);
      if (edges.length) evidence(edges);
    }
    function showGroup(group,target) {
      select(target);showRelations(wire=>wire.fromGroup===group.id || wire.toGroup===group.id);
      info.append(html('h3',labels.get(group.id)),html('p',detailText(group)));
      if (model.hasLock && group.kind!=='unlinked') {
        const metrics=html('dl');metrics.className='cohort-metrics';
        const evidence=[[t('Связанных пар внутри','Linked pairs inside'),group.internalLinks],
          [t('Пар с другими группами','Pairs crossing groups'),group.externalLinks]];
        if (group.kind==='community' && group.members.length>1) {
          evidence.push([t('Плотность связей','Link density'),new Intl.NumberFormat(Lab.lang,{style:'percent',maximumFractionDigits:1}).format(group.density)]);
        }
        for (const [title,value] of evidence) {const cell=html('div');cell.append(html('dt',title),html('dd',String(value)));metrics.append(cell);}
        info.append(metrics);
      }
      const members=html('div');members.className='cohort-members';
      const names=group.members;
      let offset=0;
      const show=()=>{
        for (const name of names.slice(offset,offset+40)) members.append(button(name,()=>showPackage(name,null)));
        offset+=40;next.hidden=offset>=names.length;
      };
      const next=button(t('Ещё пакеты','More packages'),show);info.append(members,next);show();
      const edges=model.edges.filter(edge=>groupByName.get(edge.from)===group && groupByName.get(edge.to)===group);
      if (edges.length) evidence(edges);
    }
    function showEdges(edges,target,heading) {
      select(target);showRelations(wire=>wire.el===target);
      info.append(html('h3',heading));evidence(edges);
    }
    let graphNodes=new Map();
    function draw() {
      graph.replaceChildren();info.replaceChildren();scroller.scrollLeft=scroller.scrollTop=0;
      graphNodes.clear();wires.length=0;
      const previous=lastLayout, layout={mode,grouping,positions:new Map()};
      lastLayout=layout;
      const rearrange=previous && (previous.mode!==mode || previous.grouping!==grouping);
      function position(el,key,pos,originGroup) {
        layout.positions.set(key,pos);graphNodes.set(key,el);
        if (!rearrange || !motion.matches || !el.animate || pos.x*zoom>scroller.clientWidth+box || pos.y*zoom>scroller.clientHeight+100) return;
        const prior=previous.positions.get(key) || previous.positions.get(originGroup);
        const dx=prior ? Math.max(-90,Math.min(90,prior.x-pos.x)) : 0;
        const dy=prior ? Math.max(-55,Math.min(55,prior.y-pos.y)) : 18;
        el.animate([{transform:`translate(${pos.x+dx}px,${pos.y+dy}px)`,opacity:.3},
          {transform:`translate(${pos.x}px,${pos.y}px)`,opacity:1}],
          {duration:340,easing:'cubic-bezier(.22,.78,.24,1)'});
      }
      const query=searchTerm.trim().toLowerCase();
      const groups=[];
      for (const group of available) {
        const all=!query || labels.get(group.id).toLowerCase().includes(query);
        const members=all ? group.members : group.members.filter(name=>name.toLowerCase().includes(query));
        if (members.length) groups.push({group,members});
      }
      if (query) groups.sort((a,b)=>Number(b.members.includes(query))-Number(a.members.includes(query)));
      const visible=groups.slice(0,groupBudget);
      const slots=new Map(),headers=new Map();
      let clipped=visible.length<groups.length;
      for (const [index,{group,members}] of visible.entries()) {
        const col=groupsOnly ? index%3 : index, level=groupsOnly ? Math.floor(index/3) : 0;
        const x=22+column*col,y=20+level*112;
        headers.set(group.id,{x,y,h:groupsOnly?72:54,group});
        if (groupsOnly) continue;
        const ranked=query ? [...members].sort((a,b)=>Number(b.toLowerCase()===query)-Number(a.toLowerCase()===query)) : members;
        const shown=ranked.slice(0,memberBudget);clipped ||= shown.length<members.length;
        for (const [i,name] of shown.entries()) slots.set(name,{x,y:92+i*row,h:card,group});
      }
      const positions=[...headers.values(),...slots.values()];
      canvasWidth=positions.reduce((size,pos)=>Math.max(size,pos.x+box+38),0);
      canvasHeight=positions.reduce((size,pos)=>Math.max(size,pos.y+pos.h+24),0);
      graph.setAttribute('viewBox',`0 0 ${Math.max(1,canvasWidth)} ${Math.max(1,canvasHeight)}`);resize(zoom);
      const defs=svg('defs',{});
      for(const [id,color] of [['local','#7290b2'],['bridge','#8bd9dc']]) {
        const marker=svg('marker',{id:'cohort-'+id,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});
        marker.append(svg('path',{d:'M0 0 L8 4 L0 8Z',fill:color}));defs.append(marker);
      }
      graph.append(defs);
      let drawn=0,eligible=0;
      function wire(a,b,edges,bridge,heading) {
        if (!a || !b) return;
        eligible++;if (drawn>=edgeLimit) return;drawn++;
        const d=curve(a,b);
        const el=svg('g',{class:bridge?'cohort-bridge':'cohort-line'});
        const edge=edges[0], fromGroup=groupByName.get(edge.from).id, toGroup=groupByName.get(edge.to).id;
        wires.push({el,edges,fromGroup,toGroup,from:groupsOnly ? fromGroup : 'pkg:'+edge.from,to:groupsOnly ? toGroup : 'pkg:'+edge.to});
        if (bridge) {
          activate(el,heading+' · '+edges.length,()=>showEdges(edges,el,heading));
          el.append(svg('path',{class:'cohort-hit',d}));
        }
        el.append(svg('path',{class:'cohort-wire',d,'marker-end':'url(#cohort-'+(bridge?'bridge':'local')+')'}));graph.append(el);
      }
      if (groupsOnly) {
        for(const pair of bridges.values()) wire(headers.get(pair.from),headers.get(pair.to),pair.edges,true,labels.get(pair.from)+' → '+labels.get(pair.to));
      } else {
        for(const pair of bridges.values()) for (const e of pair.edges) wire(slots.get(e.from),slots.get(e.to),[e],true,e.from+' → '+e.to);
        for(const e of model.edges) if (groupByName.get(e.from)===groupByName.get(e.to)) wire(slots.get(e.from),slots.get(e.to),[e],false,'');
      }
      for (const [id,pos] of headers) {
        const label=labels.get(id),group=pos.group;
        const el=svg('g',{class:'cohort-group'+(group.kind==='unlinked'?' is-unlinked':''),transform:`translate(${pos.x} ${pos.y})`,'data-group':id});
        el.style.setProperty('--group-color',colorOf(group));activate(el,label+' · '+group.members.length,()=>showGroup(group,el));
        el.append(svg('rect',{width:box,height:pos.h,rx:9}),svg('path',{class:'cohort-thread',d:'M9 12 V28 Q9 33 13 33'}));
        el.append(svg('text',{x:19,y:24},truncate(label,21)));
        const members=t('Пакеты: ','Packages: ')+group.members.length;
        el.append(svg('text',{class:'cohort-meta',x:19,y:43},members));
        if (groupsOnly) {
          const count=model.hasLock ? t('Связи наружу: ','Cross-group pairs: ')+group.externalLinks : t('Только манифест','Manifest only');
          el.append(svg('text',{class:'cohort-meta',x:19,y:58},count));
        }
        graph.append(el);position(el,id,pos);
      }
      for (const [name,pos] of slots) {
        const node=model.nodes.get(name);
        const text=node.version || node.requirements.map(req=>req.range).join(' / ');
        const el=svg('g',{class:'cohort-package','data-package':name,transform:`translate(${pos.x} ${pos.y})`});
        el.style.setProperty('--group-color',colorOf(pos.group));
        activate(el,name+' · '+text,()=>showPackage(name,el));
        el.append(svg('rect',{width:box,height:card,rx:7}),svg('text',{x:12,y:20},truncate(name,22)),svg('text',{class:'cohort-meta',x:12,y:37},truncate(text,25)));
        graph.append(el);position(el,'pkg:'+name,pos,pos.group.id);
      }
      more.hidden=!clipped;scroller.hidden=!visible.length;
      const labelsShown=groupsOnly ? t('Групп: ','Groups: ')+headers.size : t('На карте пакетов: ','Packages shown: ')+slots.size+' / '+model.nodes.size;
      counts.textContent=!visible.length ? t('Совпадений нет.','No matches.') : [labelsShown,groupsOnly&&unlinked?t('без связей: ','unconnected packages: ')+unlinked:'',eligible>drawn?t('показано связей: ','connections shown: ')+drawn+' / '+eligible:''].filter(Boolean).join(' · ');
    }
    search.oninput=()=>{searchTerm=search.value;groupBudget=memberBudget=batch;draw();};draw();
  }
  window.LabCohortView={render};
})();
