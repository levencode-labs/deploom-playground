'use strict';

(() => {
  const {t} = Lab;
  const $ = id => document.getElementById(id);
  const svg = $('network-map'), panel = $('network-panel'), viewport = $('map-viewport');
  const pick = $('map-start'), search = $('map-search');
  const ns = 'http://www.w3.org/2000/svg';
  const pageSize = 60;
  let data, commandFor, anchor = null, selected = null, budget = pageSize;
  let positions = new Map(), displayedEdges = [], bounds = {width:1,height:1};
  let camera = {x:0,y:0,zoom:1}, moved = false, pointer;
  svg.setAttribute('aria-label',t('Интерактивная карта зависимостей','Interactive dependency map'));
  $('zoom-in').setAttribute('aria-label',t('Увеличить','Zoom in'));
  $('zoom-out').setAttribute('aria-label',t('Уменьшить','Zoom out'));

  function shape(tag, attrs, text) {
    const item=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs)) item.setAttribute(key,value);
    if(text!==undefined) item.textContent=text;
    return item;
  }
  function html(tag,text) {
    const item=document.createElement(tag);
    item.textContent=text; return item;
  }
  function paintCamera() {
    const w=Math.max(viewport.clientWidth,1), h=Math.max(viewport.clientHeight,1);
    svg.setAttribute('viewBox',[camera.x,camera.y,w/camera.zoom,h/camera.zoom].join(' '));
    $('network-zoom').textContent=Math.round(camera.zoom*100)+'%';
  }
  function scaleBy(multiplier, x=viewport.clientWidth/2, y=viewport.clientHeight/2) {
    const old=camera.zoom;
    camera.zoom=Math.max(.02,Math.min(4,old*multiplier));
    camera.x+=x/old-x/camera.zoom;camera.y+=y/old-y/camera.zoom;
    paintCamera();
  }
  function fit() {
    camera.zoom=Math.max(.02,Math.min(1.25,viewport.clientWidth/bounds.width,viewport.clientHeight/bounds.height));
    camera.x=(bounds.width-viewport.clientWidth/camera.zoom)/2;
    camera.y=(bounds.height-viewport.clientHeight/camera.zoom)/2;
    paintCamera();
  }
  function centerAtAnchor() {
    const node=positions.get(anchor);
    if (!node || (bounds.width<=viewport.clientWidth && bounds.height<=viewport.clientHeight)) { fit(); return; }
    camera.zoom=1;
    const anchorFraction = $('map-flip').getAttribute('aria-pressed') === 'true' ? .78 : .22;
    camera.x = node.x + 90 - viewport.clientWidth * anchorFraction;
    camera.y=node.y+26-viewport.clientHeight/2; paintCamera();
  }
  $('zoom-in').onclick=()=>scaleBy(1.25);
  $('zoom-out').onclick=()=>scaleBy(.8);
  $('map-fit').onclick=fit;
  new ResizeObserver(paintCamera).observe(viewport);
  viewport.addEventListener('wheel',event=>{
    event.preventDefault();
    const rect=viewport.getBoundingClientRect();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1);
    scaleBy(Math.exp(-Math.max(-100,Math.min(100,delta))*.004),event.clientX-rect.left,event.clientY-rect.top);
  },{passive:false});
  viewport.addEventListener('pointerdown',e=>{
    if (e.button!==0 || !e.isPrimary) return;
    pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:camera.x,startY:camera.y};moved=false;
  });
  viewport.addEventListener('pointermove',e=>{
    if (!pointer || pointer.id!==e.pointerId) return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if (!moved && Math.hypot(dx,dy)<4) return;
    if (!moved) {viewport.setPointerCapture(e.pointerId);viewport.dataset.dragging='true';moved=true;}
    camera.x=pointer.startX-dx/camera.zoom;camera.y=pointer.startY-dy/camera.zoom;
    paintCamera();
  });
  function release(e) {
    if (!pointer || pointer.id!==e.pointerId) return;
    if(viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
    pointer=null;delete viewport.dataset.dragging;
  }
  window.addEventListener('pointerup',release);
  viewport.addEventListener('pointercancel',release);
  viewport.addEventListener('keydown',e=>{
    const step=65/camera.zoom;
    switch(e.key) {
      case 'ArrowLeft':camera.x-=step;break;
      case 'ArrowRight':camera.x+=step;break;
      case 'ArrowUp':camera.y-=step;break;
      case 'ArrowDown':camera.y+=step;break;
      case '+': case '=':scaleBy(1.25);break;
      case '-':scaleBy(.8);break;
      case '0':fit();break;
      default:return;
    }
    e.preventDefault();paintCamera();
  });
  const fullscreen=$('map-fullscreen');
  function syncFullscreen() {
    const active=document.fullscreenElement===panel||panel.classList.contains('map-expanded');
    fullscreen.setAttribute('aria-pressed',String(active));
    fullscreen.textContent=active?t('Выйти из полного экрана','Exit full screen'):t('На весь экран','Full screen');
    requestAnimationFrame(paintCamera);
  }
  fullscreen.onclick=async()=>{
    if(panel.classList.contains('map-expanded')) panel.classList.remove('map-expanded');
    else if(document.fullscreenElement===panel) await document.exitFullscreen();
    else {
      try {await panel.requestFullscreen();} catch {panel.classList.add('map-expanded');}
    }
    syncFullscreen();
  };
  document.addEventListener('fullscreenchange',syncFullscreen);
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape' && panel.classList.contains('map-expanded')){
      panel.classList.remove('map-expanded');syncFullscreen();fullscreen.focus();
    }
  });

  function describe(node) { return node.name+(node.version?' · '+node.version:''); }
  function locationOf(node) {
    if (node.key==='') return t('Корень проекта','Project root');
    if (node.key.startsWith('[')) return t('Требование без зафиксированной версии','Requirement with no locked version');
    return node.key;
  }
  function choices() {
    const query=search.value.trim().toLowerCase(), best=[], rest=[];
    let count=0;
    for (const node of data.nodes.values()) {
      const name=node.name.toLowerCase(), key=node.key.toLowerCase(), label=(name+'@'+node.version).toLowerCase();
      if (!name.includes(query) && !key.includes(query) && !label.includes(query)) continue;
      count++;
      if (query && (query===key || query===label || query===name)) {if(best.length<80) best.push(node);}
      else if(rest.length<80) rest.push(node);
    }
    const items=[...best,...rest].slice(0,80);
    const current=data.nodes.get(anchor);
    if (!query && current && !items.includes(current)) items.unshift(current);
    pick.replaceChildren(...items.map(node=>new Option(describe(node)+' · '+locationOf(node),node.key)));
    if (!query && items.includes(current)) pick.value=anchor;
    $('map-apply').disabled=!items.length;
    $('map-search-count').textContent=count>80?t('Совпадений: ','Matches: ')+count+t('. Уточните запрос.','. Refine the query.') :
      !count?t('Совпадений нет','No matches'):'';
  }
  function focusOn(key) {
    if (!data?.nodes.has(key)) return;
    anchor=key;selected=key;budget=pageSize;search.value='';choices();draw();
  }
  $('map-focus-form').onsubmit=e=>{e.preventDefault();if(pick.selectedIndex>=0)focusOn(pick.value);};
  search.oninput=choices;
  $('map-direction').onchange=$('map-depth').onchange=()=>{budget=pageSize;draw();};
  $('map-flip').onclick=()=>{
    const btn=$('map-flip');
    btn.setAttribute('aria-pressed',String(btn.getAttribute('aria-pressed')!=='true'));draw();
  };
  $('map-more').onclick=()=>{budget+=pageSize;draw(false);};

  function inspect(key) {
    const node=data.nodes.get(key);
    if (!node) return;
    selected=key;
    const info=$('network-info');
    const path=html('code',locationOf(node));path.className='map-id';
    info.replaceChildren(html('strong',describe(node)),path);
    for(const [id,pos] of positions) pos.g.setAttribute('aria-pressed',String(id===key));
    for(const edge of displayedEdges) edge.line.classList.toggle('active',edge.from===key||edge.to===key);
    if(key!==anchor){
      const btn=html('button',t('Построить от этого узла','Explore from this node'));
      btn.type='button';btn.onclick=()=>focusOn(key);info.append(btn);
    }
    const counts=html('p',t('Зависимостей: ','Dependencies: ')+node.outgoing.length+' · '+t('Входящих связей: ','Incoming edges: ')+node.incoming.length);
    info.append(counts);
    const adjacent=[...node.incoming.slice(0,12),...node.outgoing.slice(0,12)].slice(0,12);
    if (adjacent.length) {
      const list=document.createElement('ul');
      for (const edge of adjacent) {
        const line=data.nodes.get(edge.from).name+' → '+data.nodes.get(edge.to).name+' · '+edge.group+' '+edge.range;
        const status=edge.state==='bad' ? t('Конфликт','Conflict') : edge.state==='good' ? t('Подходит','Matches') : edge.reason || t('Без проверки','Unverified');
        list.append(html('li',line+' · '+status));
      }
      info.append(list);
      if(node.incoming.length+node.outgoing.length>12) info.append(t('Показаны первые 12 связей.','Showing the first 12 connections.'));
    }
    const command=commandFor?.(key);
    if (command) info.append(html('pre',command));
  }

  function draw(resetCamera=true) {
    svg.replaceChildren();positions=new Map();displayedEdges=[];
    const reverse=$('map-direction').value==='in', flipped=$('map-flip').getAttribute('aria-pressed')==='true';
    const value=$('map-depth').value;
    const depth=value==='all'?Infinity:Number(value);
    const levels=DepMapModel.neighborhood(data,anchor,reverse,depth);
    if (!levels.size){
      $('network-info').replaceChildren();
      $('map-limit').textContent=t('Выберите начальную запись. В этом lock-файле нет манифеста корневого проекта.','Choose a starting entry. This lockfile has no root project manifest.');
      $('map-more').hidden=true;return;
    }
    const rows=[];
    const nodeWidth=178,nodeHeight=52,gapX=255,gapY=76;
    for(const [key,level] of levels){
      if (positions.size>=budget) break;
      const row=rows[level]||0;rows[level]=row+1;
      positions.set(key,{level,row});
    }
    const maxRows=rows.reduce((a,b)=>Math.max(a,b),0), last=rows.length-1;
    bounds={width:last*gapX+nodeWidth+100,height:maxRows*gapY+40};
    for(const pos of positions.values()){
      pos.x=50+(flipped?last-pos.level:pos.level)*gapX;
      pos.y=25+(pos.row+(maxRows-rows[pos.level])/2)*gapY;
    }
    const defs=shape('defs',{});
    for(const [id,color] of [['arrow','#75a6dc'],['alert','#ff9978']]){
      const marker=shape('marker',{id,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});
      marker.append(shape('path',{d:'M0 0 L8 4 L0 8 Z',fill:color}));defs.append(marker);
    }
    svg.append(defs);
    for (const [key,a] of positions) {
      for(const edge of data.nodes.get(key).outgoing) {
        const b=positions.get(edge.to);
        if(!b)continue;
        const direct=b.x>=a.x,x=a.x+(direct?nodeWidth:0),end=b.x+(direct?0:nodeWidth),y=a.y+nodeHeight/2,z=b.y+nodeHeight/2;
        const d=a.level===b.level?
          'M'+(a.x+nodeWidth)+' '+y+' C'+(a.x+nodeWidth+49)+' '+(y-25)+' '+(a.x+nodeWidth+49)+' '+(z+25)+' '+(b.x+nodeWidth)+' '+z :
          'M'+x+' '+y+' C'+((x+end)/2)+' '+y+' '+((x+end)/2)+' '+z+' '+end+' '+z;
        const line=shape('path',{d,class:'map-edge '+edge.state+(edge.group==='peerDependencies'?' peer':''),'marker-end':'url(#'+(edge.state==='bad'?'alert':'arrow')+')'});
        displayedEdges.push({...edge,line});svg.append(line);
      }
    }
    for(const [key,pos] of positions){
      const n=data.nodes.get(key),bad=n.incoming.some(e=>e.state==='bad');
      const g=shape('g',{class:'map-node'+(bad?' conflict':'')+(key===anchor?' is-anchor':''),transform:'translate('+pos.x+' '+pos.y+')',role:'button',tabindex:'0','aria-label':describe(n)+' · '+locationOf(n)});
      const short=v=>v.length>21?v.slice(0,19)+'…':v;
      g.append(shape('title',{},describe(n)+' · '+locationOf(n)),shape('rect',{width:nodeWidth,height:nodeHeight,rx:9}),shape('text',{x:12,y:22},short(n.name)),shape('text',{class:'map-version',x:12,y:41},(bad?'!  ':'')+short(n.version)));
      g.onclick=()=>{if(!moved)inspect(key);};
      g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect(key);}};
      pos.g=g;svg.append(g);
    }
    $('map-limit').textContent=t('Узлов в выбранном обходе: ','Nodes in this traversal: ')+levels.size+' · '+t('показано: ','shown: ')+positions.size+' · '+t('во всём индексе: ','in the full index: ')+data.nodes.size;
    $('map-more').hidden=positions.size>=levels.size;
    inspect(positions.has(selected)?selected:anchor);
    if(resetCamera)centerAtAnchor();else paintCamera();
  }
  function render(next, commands) {
    panel.hidden=!next;
    if (!next) {data=null;anchor=null;svg.replaceChildren();return;}
    const keep=data && data.rootKey===next.rootKey && next.nodes.has(anchor);
    data=next;commandFor=commands;
    if (!keep) {anchor=next.rootKey;selected=anchor;budget=pageSize;search.value='';}
    choices();draw();
  }
  window.LabMap={render,focusOn};
})();
