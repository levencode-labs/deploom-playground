'use strict';

(() => {
  const { t } = window.Lab;
  const text = (tag, content) => {
    const element = document.createElement(tag);
    element.textContent = content;
    return element;
  };

  function compare(a,b) {
    if (treeSemver.satisfies(a,'>'+b,{includePrerelease:true})) return 1;
    if (treeSemver.satisfies(b,'>'+a,{includePrerelease:true})) return -1;
    return 0;
  }
  // The sorted registry list can contain thousands of pre-releases. Show the
  // candidate's neighbours and the two ends of the set accepted by this range.
  function nearby(versions, range, selected) {
    if (versions.length <= 6) return versions;
    const candidates = versions.filter(v=>!v.split('+')[0].includes('-') ||
      v===selected || treeSemver.satisfies(v,range));
    const sorted = candidates.length ? candidates : versions;
    const index=sorted.findIndex(v=>compare(v,selected)>=0);
    const at=index<0 ? sorted.length : index;
    const matches=sorted.filter(v=>treeSemver.satisfies(v,range));
    const boundary=matches.length ? sorted.indexOf(matches.at(-1))+1 : -1;
    return [...new Set([sorted[at-1],sorted[at],sorted[at+1],matches[0],matches.at(-1),sorted[boundary]].filter(Boolean))].sort(compare);
  }
  // validRange expands npm syntax into exact comparator sets. Keep OR branches separate.
  function intervals(range) {
    const normalized=treeSemver.validRange(range);
    if (normalized===null) return [];
    return normalized.split('||').map(clause=>{
      let lower=null, upper=null;
      function bound(current,version,inclusive,lowerBound) {
        if (!current) return {version,inclusive};
        const order=compare(version,current.version);
        if (order===0) return {version,inclusive:inclusive && current.inclusive};
        return (lowerBound ? order>0 : order<0) ? {version,inclusive} : current;
      }
      for (const token of clause.trim().split(/\s+/)) {
        if (!token || token==='*') continue;
        const [,op,version]=token.match(/^(>=|>|<=|<|=)?(.+)$/);
        if (!op || op==='=' || op.startsWith('>')) lower=bound(lower,version,op!=='>',true);
        if (!op || op==='=' || op.startsWith('<')) upper=bound(upper,version,op!=='<',false);
      }
      const order=lower && upper ? compare(lower.version,upper.version) : -1;
      const empty=order>0 || (order===0 && !(lower.inclusive && upper.inclusive)) ||
        Boolean(upper && !upper.inclusive && upper.version==='0.0.0-0');
      return {lower,upper,empty,clause:clause.trim() || '*'};
    });
  }
  function diagram(container,range,selected) {
    const hasCandidate=Boolean(treeSemver.valid(selected));
    const simpleStable=!/\d-[0-9a-z]/i.test(range) && (!hasCandidate || !selected.split('+')[0].includes('-'));
    const branches=intervals(range);
    const figure=document.createElement('figure');
    figure.className='range-intervals';
    figure.append(text('figcaption',t('Допустимые версии','Allowed versions')));
    for (const [index,{lower,upper,empty,clause}] of branches.entries()) {
      if (index) figure.append(text('small',t('или','or')));
      if (empty) {figure.append(text('p',t('Пустой диапазон','Empty range')));continue;}
      const exact=lower && upper && compare(lower.version,upper.version)===0;
      const end=upper && simpleStable && !upper.inclusive ? upper.version.replace(/-0$/,'') : upper?.version;
      const low=lower && lower.version + (lower.inclusive?' ≤ ':' < ');
      const high=upper && (upper.inclusive?' ≤ ':' < ') + end;
      const description=exact ? 'v = '+lower.version : lower || upper ? (low || '')+'v'+(high || '') : t('Любая стабильная версия','Any stable version');
      const caption=text('code',description);
      caption.className='interval-expression'; figure.append(caption);
      const track=document.createElement('div');track.className='interval-track';track.setAttribute('aria-hidden','true');
      const versions=[...new Set([lower?.version,upper?.version,hasCandidate?selected:null].filter(Boolean))].sort(compare);
      const stops=versions.filter((v,i)=>i===0 || compare(v,versions[i-1])!==0);
      const position=v=>100*(stops.findIndex(item=>compare(item,v)===0)+.5)/stops.length;
      const start=lower ? position(lower.version) : 0, finish=upper ? position(upper.version) : 100;
      const band=document.createElement('span');band.className='interval-band';
      band.style.left=start+'%';band.style.width=(finish-start)+'%'; track.append(band);
      for (const boundary of [lower,upper].filter(Boolean)) {
        const tick=document.createElement('i');tick.className='interval-bound'+(boundary.inclusive?' inclusive':'');
        tick.style.left=position(boundary.version)+'%';track.append(tick);
      }
      if (hasCandidate) {
        const marker=document.createElement('i');
        marker.className='interval-candidate';marker.dataset.match=String(treeSemver.satisfies(selected,clause));
        marker.style.left=position(selected)+'%';track.append(marker);
      }
      const labels=document.createElement('div');labels.className='interval-labels';labels.setAttribute('aria-hidden','true');
      labels.style.gridTemplateColumns='repeat('+Math.max(1,stops.length)+',minmax(0,1fr))';
      for (const v of stops) {
        const here=hasCandidate && compare(v,selected)===0;
        const label=text('span',here ? selected : upper && compare(v,upper.version)===0 ? end : v);
        if(here) label.append(text('small',t('проверяемая','candidate')));
        labels.append(label);
      }
      figure.append(track,labels);
    }
    container.append(figure);
  }
  function render(container, { range, selected, candidates=[], onSelect }) {
    const items=[...new Set(candidates.filter(v=>treeSemver.valid(v)))].sort(compare);
    const known=treeSemver.validRange(range)!==null;
    const valid=treeSemver.valid(selected);
    container.replaceChildren();
    if (known) diagram(container,range,selected);
    if (known && valid) {
      const fits=treeSemver.satisfies(selected,range);
      const verdict=text('p',selected+(fits?t(' входит в диапазон ',' matches '):t(' вне диапазона ',' is outside '))+range+'.');
      verdict.className='range-verdict'; verdict.dataset.match=String(fits);container.append(verdict);
      if(selected.split('+')[0].includes('-') || /\d-[0-9a-z]/i.test(range)) {
        container.append(text('small',t('npm допускает предварительный выпуск, когда в той же ветке диапазона указан prerelease с тем же major.minor.patch.','npm admits a prerelease when this range branch names a prerelease with the same major.minor.patch.')));
      }
    }
    if (!items.length) return;
    const list = document.createElement('ul');
    list.className = 'range-scale';
    list.setAttribute('aria-label', t('Кандидаты по порядку версий', 'Candidates in version order'));
    for (const version of items) {
      const fits = known && treeSemver.satisfies(version, range);
      const entry = document.createElement('li');
      entry.dataset.match = known ? String(fits) : 'unknown';
      entry.dataset.selected = String(version === selected);
      const value = text(onSelect && candidates.includes(version) ? 'button' : 'code', version);
      if(value.tagName==='BUTTON') {
        value.type='button';
        value.setAttribute('aria-label',t('Проверить версию ','Check version ')+version);
        value.addEventListener('click',()=>onSelect(version));
      }
      entry.append(value, text('span', known ?
        (fits ? t('подходит', 'matches') : t('вне диапазона', 'outside range')) :
        t('нет оценки', 'unverified')));
      if (version === selected) entry.append(text('strong', t('выбрана', 'selected')));
      list.append(entry);
    }
    container.append(list);
  }

  window.LabRangeScale = { render, compare, nearby, intervals };
})();
