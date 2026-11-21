'use strict';
(() => {
  const {t}=Lab, el=id=>document.getElementById(id);
  const svg=el('network-map'), ns='http://www.w3.org/2000/svg';
  svg.setAttribute('aria-label',t('Интерактивная карта зависимостей','Interactive dependency map'));
  el('zoom-in').setAttribute('aria-label',t('Увеличить карту','Zoom in'));
  el('zoom-out').setAttribute('aria-label',t('Уменьшить карту','Zoom out'));
  let zoom=1,width=0,height=0, selected=null;
  function shape(tag,attrs,text) {
    const item=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attrs))item.setAttribute(key,value);
    if(text!==undefined)item.textContent=text;
    return item;
  }
  function resize(){
    svg.style.width=Math.round(width*zoom)+'px';svg.style.height=Math.round(height*zoom)+'px';
    el('network-zoom').textContent=Math.round(zoom*100)+'%';
  }
  el('zoom-in').onclick=()=>{zoom=Math.min(1.6,zoom+.2);resize();};
  el('zoom-out').onclick=()=>{zoom=Math.max(.4,zoom-.2);resize();};
  function render(graph,manifest,conflictsOnly){
    svg.replaceChildren();el('network-info').replaceChildren();el('network-panel').hidden=!graph;
    if(!graph)return;
    const root={key:'',name:manifest.name||t('Проект','Project'),version:'package.json',depth:0};
    const nodes=new Map([['',root]]),edges=[],levels=[];
    let truncated=false;
    function walk(branch,parent,depth){
      for(const entry of branch) {
        if(conflictsOnly && !entry.hasConflict)continue;
        const key=entry.key || parent+' → '+entry.name+'@'+entry.range;
        if(!nodes.has(key)){
          if(nodes.size>=42){truncated=true;continue;}
          nodes.set(key,{key,name:entry.name,version:entry.version||'?',depth});
        }
        edges.push({from:parent,to:key,entry});
        if(entry.children.length)walk(entry.children,key,depth+1);
      }
    }
    walk(graph.nodes,'',1);
    // Use shortest distance from the project so a hoisted or shared package stays in its own column.
    const outgoing=new Map();
    for(const edge of edges){
      if(!outgoing.has(edge.from))outgoing.set(edge.from,[]);
      outgoing.get(edge.from).push(edge.to);
    }
    const queue=[''],visited=new Set(queue);
    for(let i=0;i<queue.length;i++)for(const key of outgoing.get(queue[i])||[]){
      if(visited.has(key))continue;
      visited.add(key);nodes.get(key).depth=nodes.get(queue[i]).depth+1;queue.push(key);
    }
    const nw=165,nh=52;
    for(const node of nodes.values()){
      const row=levels[node.depth]||0;levels[node.depth]=row+1;
      node.x=24+node.depth*218;node.y=row*79+24;
    }
    height=Math.max(188,Math.max(...levels.filter(Boolean))*79+32);
    for(const node of nodes.values())node.y+=(height-(levels[node.depth]*79+32))/2;
    width=levels.length*218+34;
    svg.setAttribute('viewBox','0 0 '+width+' '+height);resize();
    const defs=shape('defs',{});
    for(const [id,color] of [['arrow','#5688c8'],['alert','#f89674']]){
      const marker=shape('marker',{id,viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:6,markerHeight:6,orient:'auto'});
      marker.append(shape('path',{d:'M0 0 L8 4 L0 8 Z',fill:color}));defs.append(marker);
    }
    svg.append(defs);
    for(const edge of edges){
      const a=nodes.get(edge.from),b=nodes.get(edge.to),y=a.y+nh/2,z=b.y+nh/2;
      let d;
      if(a.depth===b.depth){
        const x=a.x+nw;d='M'+x+' '+y+' C'+(x+42)+' '+y+' '+(x+42)+' '+z+' '+x+' '+z;
      } else {
        const right=b.x>a.x;const x=a.x+(right?nw:0),v=b.x+(right?0:nw),mid=(x+v)/2;
        d='M'+x+' '+y+' C'+mid+' '+y+' '+mid+' '+z+' '+v+' '+z;
      }
      edge.line=shape('path',{d,class:'map-edge '+edge.entry.state+(edge.entry.group==='peerDependencies'?' peer':''),'marker-end':'url(#'+(edge.entry.state==='bad'?'alert':'arrow')+')'});
      svg.append(edge.line);
    }
    const info=el('network-info');
    function select(key){
      selected=key;const n=nodes.get(key);info.replaceChildren();
      const title=document.createElement('strong');title.textContent=n.name+' · '+n.version;info.append(title);
      const adjacent=edges.filter(e=>e.from===key||e.to===key);
      for(const node of nodes.values())node.g.setAttribute('aria-pressed',String(node.key===key));
      for(const edge of edges)edge.line.classList.toggle('active',adjacent.includes(edge));
      const list=document.createElement('ul');
      for(const {from,to,entry} of adjacent.slice(0,12)){
        const li=document.createElement('li');
        li.textContent=nodes.get(from).name+' → '+nodes.get(to).name+' · '+entry.group+' '+entry.range+
          (entry.state==='bad'?t(' · конфликт',' · conflict'):'');list.append(li);
      }
      info.append(list);
      if(adjacent.length>12)info.append(t('Показаны первые 12 связей.','Showing the first 12 edges.'));
    }
    for(const n of nodes.values()){
      const bad=edges.some(e=>e.to===n.key&&e.entry.state==='bad');
      const g=shape('g',{class:'map-node'+(bad?' conflict':''),transform:'translate('+n.x+' '+n.y+')',role:'button',tabindex:'0','aria-label':n.name+' '+n.version});
      g.append(shape('title',{},n.name+' · '+n.version),shape('rect',{width:nw,height:nh,rx:9}),shape('text',{x:12,y:22},n.name.length>20?n.name.slice(0,18)+'…':n.name),shape('text',{class:'map-version',x:12,y:40},(bad?'!  ':'')+n.version));
      g.onclick=()=>select(n.key);g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n.key);}};
      n.g=g;svg.append(g);
    }
    const start=nodes.has(selected)?selected:(edges.find(e=>e.entry.state==='bad')?.to||'');
    select(start);
    el('map-limit').hidden=!truncated&&!graph.clipped;
  }
  window.LabMap={render};
})();
