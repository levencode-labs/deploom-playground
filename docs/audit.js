'use strict';
(() => {
  const {t}=window.Lab, {inventory,check,limit,maxBytes}=window.LabAudit;
  const $=id=>document.getElementById(id);
  const make=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const reasons={
    local:t('локальный пакет, workspace, link или bundled','local package, workspace, link or bundled'),
    version:t('не распознаны имя или точная версия','unrecognized name or exact version'),
    source:t('нет подтверждённого адреса в публичном npm','no matching public npm tarball URL'),
  };
  const statusLabels={
    ready:t('не проверено','not checked'), found:t('найдены записи OSV','OSV advisories found'),
    empty:t('OSV не вернула записей','no known advisories returned by OSV'), unknown:t('неизвестно','unknown'),
  };
  const notes={
    registry:t('не удалось подтвердить версию в npm','npm version lookup incomplete'),
    missing:t('версия не подтверждена публичным реестром npm','release not confirmed by the public npm registry'),
    osv:t('ответ OSV неполный или недоступен','OSV response incomplete or unavailable'),
  };
  let data, active, generation=0, rowCount=50, skipCount=50;
  const selected=new Set();
  const example={
    name:'lab-example',lockfileVersion:3,packages:{
      '':{name:'lab-example',version:'1.0.0'},
      'node_modules/lodash':{version:'4.17.20',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz'},
      'packages/server/node_modules/lodash':{version:'4.17.20',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz'},
      'packages/worker/node_modules/lodash':{version:'4.17.21',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'},
      'node_modules/local-theme':{resolved:'packages/local-theme',link:true},
    },
  };

  function controls() {
    $('pick-count').textContent=t('Выбрано ','Selected ')+selected.size+' / '+limit;
    $('run-audit').disabled=!!active || !selected.size || !$('consent').checked;
    $('latest').disabled=$('run-audit').disabled;
    $('clear').disabled=!!active || !selected.size;
    $('pick').disabled=!!active || selected.size>=limit;
    $('consent').disabled=!!active || !selected.size;
    for(const input of $('audit-rows').querySelectorAll('input')) input.disabled=!!active || (!input.checked && selected.size>=limit);
  }
  function coverage() {
    const counts={ready:0,found:0,empty:0,unknown:0};
    for(const row of data.rows) counts[row.state]++;
    $('coverage').textContent=t('Полный ответ OSV получен для ','Complete OSV response for ')+(counts.found+counts.empty)+' / '+data.rows.length+
      t(' подходящих пар. С находками — ',' eligible pairs. With advisories — ')+counts.found+
      t(', без записей — ',', with no records — ')+counts.empty+t(', неизвестно — ',', unknown — ')+counts.unknown+
      t(', ещё не проверено — ',', not checked — ')+counts.ready+t('. Исключено путей — ','. Excluded paths — ')+data.skipped.length+'.';
  }
  function matching() {
    const text=$('audit-filter').value.trim().toLowerCase();
    return data.rows.filter(row=>row.key.toLowerCase().includes(text));
  }
  function renderRows() {
    const list=$('audit-rows'), filtered=matching();
    const nodes=filtered.slice(0,rowCount).map(row=>{
      const item=document.createElement('li'), label=document.createElement('label'), input=document.createElement('input');
      input.type='checkbox';
      input.checked=selected.has(row.key);
      input.addEventListener('change',()=>{
        if(input.checked) selected.add(row.key); else selected.delete(row.key);
        $('consent').checked=false;controls();
      });
      label.append(input,' '+row.key);item.append(label,' · '+statusLabels[row.state]);
      if (row.latest !== undefined) {
        const latest = row.latest;
        const comparison = latest === null ? t('ответ недоступен','response unavailable') :
          latest === row.version ? t('совпадает с установленной','matches installed') :
          treeSemver.satisfies(row.version,'<' + latest,{includePrerelease:true}) ? t('есть более новая версия','newer release available') :
          t('установленная версия выше тега или иной сборки','installed version is ahead of the tag or a different build');
        item.append(make('p','npm latest · ' + (latest ? latest + ' · ' : '') + comparison));
      }
      if(row.note) item.append(' ('+notes[row.note]+')');
      const details=document.createElement('details');
      details.append(make('summary',t('Пути в lock-файле','Lockfile paths')+' ('+row.paths.length+')'));
      details.addEventListener('toggle',()=>{
        if(!details.open || details.querySelector('ul')) return;
        const paths=document.createElement('ul');
        for(const path of row.paths) paths.append(make('li',path));
        details.append(paths);
      });
      item.append(details);
      if(row.ids.length) {
        const ids=document.createElement('ul');
        for(const id of row.ids) {
          const li=document.createElement('li'), a=make('a',id);
          a.href='https://osv.dev/vulnerability/'+encodeURIComponent(id);li.append(a);ids.append(li);
        }
        item.append(ids);
      }
      return item;
    });
    list.replaceChildren(...nodes);
    if(!nodes.length) list.append(make('li',t('Совпадений нет.','No matching versions.')));
    $('more-rows').hidden=filtered.length<=rowCount;
    controls();
  }
  function renderSkips() {
    $('skips').hidden=!data.skipped.length;
    $('skip-list').replaceChildren(...data.skipped.slice(0,skipCount).map(({path,reason})=>make('li',path+' · '+reasons[reason])));
    $('more-skips').hidden=data.skipped.length<=skipCount;
  }
  async function load(source) {
    const revision=++generation;
    active?.abort();active=undefined;data=undefined;selected.clear();
    $('inventory').hidden=true;$('parse-status').textContent='';$('audit-status').textContent='';
    try {
      let lock=source;
      if(source instanceof File) {
        if(source.size>maxBytes) throw Error('size');
        lock=await source.text();
      }
      if(typeof lock==='string') {
        if(new Blob([lock]).size>maxBytes) throw Error('size');
        lock=JSON.parse(lock);
      }
      if(revision!==generation) return;
      data=inventory(lock);
      rowCount=50;skipCount=50;$('audit-filter').value='';$('consent').checked=false;
      $('inventory').hidden=false;renderSkips();coverage();renderRows();
    } catch(e) {
      if(revision!==generation) return;
      $('parse-status').textContent=e.message==='size' ? t('Лимит — 8 МиБ и 30 000 путей.','Limit: 8 MiB and 30,000 package paths.') :
        t('Нужен корректный JSON package-lock версии 3 с объектом packages и записью корня.','Use a valid package-lock v3 JSON object with a packages map and root entry.');
    }
  }
  $('sample').addEventListener('click',()=>{ $('audit-file').value='';$('audit-text').value='';load(example); });
  $('read-text').addEventListener('click',()=>{ $('audit-file').value='';load($('audit-text').value); });
  $('audit-file').addEventListener('change',()=>{ const file=$('audit-file').files[0];if(file){$('audit-text').value='';load(file);} });
  $('audit-filter').addEventListener('input',()=>{rowCount=50;renderRows();});
  $('more-rows').addEventListener('click',()=>{rowCount+=50;renderRows();});
  $('more-skips').addEventListener('click',()=>{skipCount+=50;renderSkips();});
  $('consent').addEventListener('change',controls);
  $('pick').addEventListener('click',()=>{
    for(const row of matching()) {
      if(selected.size>=limit) break;
      if(row.state==='ready') selected.add(row.key);
    }
    $('consent').checked=false;renderRows();
  });
  $('clear').addEventListener('click',()=>{selected.clear();$('consent').checked=false;renderRows();});
  $('latest').addEventListener('click', async()=>{
    if(active || !selected.size || !$('consent').checked) return;
    const rows=data.rows.filter(row=>selected.has(row.key));
    const controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),30000);
    $('audit-status').textContent=t('Проверяю тег latest в npm…','Looking up the latest tag in npm…');
    controls();
    try {
      for(const name of new Set(rows.map(row=>row.name))) {
        let latest=null;
        try {
          const response=await fetch('https://registry.npmjs.org/'+encodeURIComponent(name)+'/latest',{
            signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'
          });
          if(response.ok) {
            const meta=await response.json();
            if(meta.name===name && typeof meta.version==='string' && treeSemver.valid(meta.version)) latest=meta.version;
          }
        } catch { /* An unavailable response stays unknown. */ }
        if(active!==controller) return;
        for(const row of rows) if(row.name===name) row.latest=latest;
      }
    } finally {
      clearTimeout(timer);
      if(active===controller) {
        active=undefined;
        $('audit-status').textContent=t('Источник сравнения — тег latest в публичном npm и установленные версии из lock-файла.','Comparison source — the public npm latest tag and installed versions in the lockfile.');
        renderRows();
      }
    }
  });
  $('run-audit').addEventListener('click', async()=>{
    if(active || !selected.size || !$('consent').checked) return;
    const rows=data.rows.filter(row=>selected.has(row.key));
    const controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),60000);
    $('audit-status').textContent=t('Сверяю версии с npm и запрашиваю OSV…','Checking versions in npm and querying OSV…');
    controls();
    try {await check(rows,controller.signal);}
    finally {
      clearTimeout(timer);
      if(active===controller) {
        active=undefined;selected.clear();$('consent').checked=false;
        $('audit-status').textContent=rows.some(row=>row.state==='unknown') ?
          t('Часть выбранных результатов неизвестна. Причина указана у каждой версии.','Some selected results are unknown. See the reason for each version.') :
          t('Выбранные версии проверены.','Selected versions checked.');
        coverage();renderRows();
      }
    }
  });
})();
