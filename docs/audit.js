'use strict';
(() => {
  const {t}=window.Lab, {localInventory,check,limit,maxBytes}=window.LabAudit;
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
      '':{name:'lab-example',version:'1.0.0',dependencies:{lodash:'^4.17.0'}},
      'node_modules/lodash':{version:'4.17.20',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz'},
      'packages/server/node_modules/lodash':{version:'4.17.20',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz'},
      'packages/worker/node_modules/lodash':{version:'4.17.21',resolved:'https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz'},
      'node_modules/local-theme':{resolved:'packages/local-theme',link:true},
    },
  };

  function controls() {
    $('pick-count').textContent=selected.size ? t('Выбрано ','Selected ')+selected.size+' / '+limit : '';
    $('run-audit').disabled=!!active || !selected.size;
    $('latest').disabled=$('run-audit').disabled;
    for(const input of $('audit-rows').querySelectorAll('input')) input.disabled=!!active || (!input.checked && selected.size>=limit);
  }
  function coverage() {
    const counts={found:0,empty:0,unknown:0};
    for(const row of data.rows) if(row.state!=='ready') counts[row.state]++;
    $('coverage').hidden=!Object.values(counts).some(Boolean);
    $('coverage').textContent=t('OSV · с находками ','OSV · with advisories ')+counts.found+t(', без известных находок ',', no known advisories ')+counts.empty+t(', проверить не удалось ',', lookup incomplete ')+counts.unknown;
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
        controls();
      });
      if (row.localOnly) item.append(row.key,t(' · локальная запись',' · local entry'));
      else {label.append(input,' '+row.key);item.append(label); }
      if (row.state!=='ready') item.append(' · '+statusLabels[row.state]);
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
      details.append(make('summary',t('Записи в lock-файле','Lockfile entries')+' ('+row.paths.length+')'));
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
    $('one-advisory').href=Lab.urlFor('advisories.html');
    $('direct-report').hidden=true;$('inventory').hidden=true;$('parse-status').textContent='';$('audit-status').textContent='';
    try {
      const manifestFile=$('audit-manifest').files[0];
      let manifest;
      if(manifestFile) {
        if(manifestFile.size>maxBytes) throw Error('size');
        try {
          manifest=JSON.parse(await manifestFile.text());
          if(!manifest || typeof manifest!=='object' || Array.isArray(manifest) || manifest.lockfileVersion) throw Error();
        } catch {throw Error('manifest');}
      }
      if(revision!==generation) return;
      if(!source) {
        $('parse-status').textContent=manifest ? t('package.json прочитан. Добавьте lock-файл, чтобы увидеть точные версии.','package.json is ready. Add the lockfile to see exact versions.') : '';
        return;
      }
      let lock=source;
      if(source instanceof File) {
        if(source.size>maxBytes) throw Error('size');
        lock=await source.text();
      }
      if(typeof lock==='string') {
        if(new Blob([lock]).size>maxBytes) throw Error('size');
        lock=LabYarn.read(lock);
      }
      if(revision!==generation) return;
      const yarn=LabYarn.format(lock?.packages);
      if(Object.keys(lock?.packages || {}).length>30001) throw Error('size');
      data=localInventory(lock);
      const entries=Object.keys(lock.packages).length-1;
      $('parse-status').textContent=(yarn || 'npm')+' · '+t('записей в lock-файле ','lockfile entries ')+entries+t(', разных пар «пакет + версия» ',', distinct package/version pairs ')+new Set(data.rows.map(row=>row.key)).size+'.';
      manifest ??= yarn ? null : lock.packages[''];
      if(manifest) {
        const list=[], mismatches=[];
        for(const edge of LabLockGraph.declarations(manifest,true)) {
          if(edge.group==='peerDependencies') continue;
          const hit=LabLockGraph.lockedPackage(lock.packages,'',edge);
          const version=hit?.record.version, range=treeSemver.validRange(edge.range);
          const text=edge.name+' · '+edge.range+' → '+(version || t('нет записи','no entry'));
          const mismatch=!version || (range!==null && !treeSemver.satisfies(version,range));
          (mismatch?mismatches:list).push(make('li',text));
        }
        const total=list.length+mismatches.length;
        $('direct-count').textContent=t('Из package.json · ','From package.json · ')+total+(mismatches.length?t(' · проверить ',' · review ')+mismatches.length:'');
        $('direct-rows').replaceChildren(...mismatches,...list);$('direct-report').hidden=!total;
      }
      rowCount=50;skipCount=50;$('audit-filter').value='';
      $('inventory').hidden=false;renderSkips();coverage();renderRows();
    } catch(e) {
      if(revision!==generation) return;
      $('parse-status').textContent=e.message==='size' ? t('Лимит — 8 МиБ и 30 000 путей.','Limit: 8 MiB and 30,000 package paths.') :
        e.message==='manifest' ? t('В первое поле нужен package.json проекта. Lock-файл останется во втором.','The first field expects the project package.json. Your lockfile stays in the second.') :
        t('Нужен yarn.lock (Classic или Berry) либо корневой npm lock-файл v3.','Use a Yarn Classic or Berry lock, or a root npm v3 lockfile.');
    }
  }
  if(ReviewExample.kind==='selector') {
    const record=ReviewExample.fixture();
    if(record) load(record.lock).then(()=>{
      if($('audit-file').files.length || $('audit-manifest').files.length || !data) return;
      $('audit-filter').value='nth-check';renderRows();
      $('one-advisory').href=ReviewExample.link('advisories.html','selector',ReviewExample.revision,record.nthPath);
    });
  }
  $('sample').addEventListener('click',()=>{ $('audit-file').value='';$('audit-manifest').value='';load(example); });
  for(const id of ['audit-file','audit-manifest']) $(id).addEventListener('change',()=>load($('audit-file').files[0]));
  $('audit-filter').addEventListener('input',()=>{rowCount=50;renderRows();});
  $('more-rows').addEventListener('click',()=>{rowCount+=50;renderRows();});
  $('more-skips').addEventListener('click',()=>{skipCount+=50;renderSkips();});
  $('latest').addEventListener('click', async()=>{
    if(active || !selected.size) return;
    const rows=data.rows.filter(row=>!row.localOnly && selected.has(row.key));
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
    if(active || !selected.size) return;
    const rows=data.rows.filter(row=>!row.localOnly && selected.has(row.key));
    const controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),60000);
    $('audit-status').textContent=t('Сверяю версии с npm и запрашиваю OSV…','Checking versions in npm and querying OSV…');
    controls();
    try {await check(rows,controller.signal);}
    finally {
      clearTimeout(timer);
      if(active===controller) {
        active=undefined;selected.clear();
        $('audit-status').textContent=rows.some(row=>row.state==='unknown') ?
          t('Часть выбранных результатов неизвестна. Причина указана у каждой версии.','Some selected results are unknown. See the reason for each version.') :
          t('Выбранные версии проверены.','Selected versions checked.');
        coverage();renderRows();
      }
    }
  });
})();
