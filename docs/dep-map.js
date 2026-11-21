'use strict';

(() => {
  const {t} = Lab;
  const $ = id => document.getElementById(id);
  const svg = $('network-map'), panel = $('network-panel'), viewport = $('map-viewport');
  const start = $('map-start');
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
    const vertical = $('map-layout').value === 'vertical';
    camera.x = node.x + 89 - viewport.clientWidth * (vertical ? .5 : .23);
    camera.y = node.y + 26 - viewport.clientHeight * (vertical ? .23 : .5);
    paintCamera();
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
    if (!data.hasLock) return t('Требование без подтверждённой установки', 'Declared requirement; installation unconfirmed');
    if (node.key.startsWith('[')) return t('Требование без зафиксированной версии','Requirement with no locked version');
    return node.key;
  }
  function displayStart(node) {
    return node.key === data.rootKey ? t('Корень проекта','Project root')+' · '+node.name : describe(node);
  }
  const chooser = LabPackageCombo.attach(start,{onSelect:item=>focusOn(item.key)});
  function focusOn(key) {
    if (!data?.nodes.has(key)) return;
    anchor=key; selected=key; budget=pageSize;
    chooser.setValue(displayStart(data.nodes.get(key)));
    draw();
  }
  $('map-direction').onchange=$('map-depth').onchange=()=>{budget=pageSize;draw();};
  $('map-layout').onchange=()=>draw();
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
        const status=edge.state==='bad' ? [t('Конфликт','Conflict'),edge.reason].filter(Boolean).join(' · ') : edge.state==='good' ? t('Подходит','Matches') : edge.reason || t('Без проверки','Unverified');
        list.append(html('li',line+' · '+status));
      }
      info.append(list);
      if(node.incoming.length+node.outgoing.length>12) info.append(t('Показаны первые 12 связей.','Showing the first 12 connections.'));
    }
    const command=commandFor?.(key);
    if (command) info.append(html('pre',command));
  }

  function curve(a,b,width,height,vertical) {
    if (vertical) {
      const x=a.x+width/2, endX=b.x+width/2;
      if (a.level===b.level) {
        const y=a.y+height, endY=b.y+height;
        return 'M'+x+' '+y+' C'+(x-22)+' '+(y+28)+' '+(endX+22)+' '+(endY+28)+' '+endX+' '+endY;
      }
      const down=b.y>a.y, y=a.y+(down?height:0), endY=b.y+(down?0:height);
      const mid=(y+endY)/2;
      return 'M'+x+' '+y+' C'+x+' '+mid+' '+endX+' '+mid+' '+endX+' '+endY;
    }
    const y=a.y+height/2, endY=b.y+height/2;
    if (a.level===b.level) {
      const x=a.x+width, endX=b.x+width;
      return 'M'+x+' '+y+' C'+(x+44)+' '+(y-20)+' '+(endX+44)+' '+(endY+20)+' '+endX+' '+endY;
    }
    const right=b.x>a.x, x=a.x+(right?width:0), endX=b.x+(right?0:width);
    const mid=(x+endX)/2;
    return 'M'+x+' '+y+' C'+mid+' '+y+' '+mid+' '+endY+' '+endX+' '+endY;
  }
  function draw(resetCamera=true) {
    svg.replaceChildren();positions=new Map();displayedEdges=[];
    const reverse=$('map-direction').value==='in', vertical=$('map-layout').value==='vertical';
    const value=$('map-depth').value;
    const depth=value==='all'?Infinity:Number(value);
    const levels=DepMapModel.neighborhood(data,anchor,reverse,depth);
    viewport.hidden=!levels.size;
    if (!levels.size){
      const info=$('network-info');info.replaceChildren();
      const copies=data.copyKeys, shown=copies.slice(0,budget);
      $('map-limit').textContent=t('Копий в lock-файле: ','Lockfile copies: ')+copies.length+'. '+
        t('Выберите копию, чтобы увидеть её связи. Для прямых зависимостей добавьте package.json.','Choose a copy to inspect its edges. Add package.json to identify direct dependencies.');
      $('map-more').hidden=shown.length>=copies.length;
      const list=html('ul','');list.className='map-copies';
      for (const key of shown) {
        const item=html('li',''),node=data.nodes.get(key),button=html('button',describe(node));
        button.type='button';button.onclick=()=>focusOn(key);
        item.append(button,html('code',key));list.append(item);
      }
      info.append(list);return;
    }
    const layout=DepMapModel.layout(levels,budget,vertical);
    positions=layout.positions; bounds=layout.bounds;
    const nodeWidth=layout.width, nodeHeight=layout.height;
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
        const d=curve(a,b,nodeWidth,nodeHeight,vertical);
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
  function render(next, commands, hasManifest) {
    panel.hidden=!next;
    if (!next) {data=null;anchor=null;chooser.setItems([]);chooser.setValue('');svg.replaceChildren();return;}
    const starts=DepMapModel.startingNodes(next,hasManifest);
    const keep=data && data.rootKey===next.rootKey && data.nodes.get(data.rootKey)?.name===next.nodes.get(next.rootKey)?.name && starts.some(node=>node.key===anchor);
    data=next;commandFor=commands;
    if (!keep) {anchor=next.rootKey;selected=anchor;budget=pageSize;}
    chooser.setItems(starts.map(node=>({key:node.key,value:displayStart(node),label:node.key===data.rootKey?t('Корень проекта','Project root'):node.name,detail:node.key===data.rootKey?node.name:!hasManifest ? node.version+' · '+node.key : node.version})));
    start.disabled=!starts.length;
    chooser.setValue(data.nodes.has(anchor) ? displayStart(data.nodes.get(anchor)) : '');
    draw();
  }
  window.LabMap={render,focusOn};
})();
