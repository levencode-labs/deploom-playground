'use strict';
(() => {
  const {t}=Lab, {maxBytes,pool}=LabAudit;
  const $=id=>document.getElementById(id);
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  let generation=0, project, active, report, shown=40;
  let findings=new Map(), picker;
  let findingRows = new Map(), findingLimit = 30;
  const registryMode = () => LabRegistry.hostedAudit ? 'snapshot' : LabRegistry.base() === LabRegistry.defaultBase ? 'osv' : 'registry';
  const unavailable = e => e?.name==='TypeError' || e?.name==='TimeoutError' || [401,403,429,502,503,504].includes(e?.status);
  function eligible(row) {
    return !row.localOnly && picker?.has(row.key);
  }
  function rowsForRun() {return project.rows.filter(eligible);}
  function resetResults() {
    active?.abort();active=null;report=false;findings=new Map();findingRows=new Map();findingLimit=30;
    $('finding-filter').value='';$('finding-level').value='';
    if(project) {
      project.rows=project.rows.map(row=>({...row,state:'ready',lookedUp:false,ids:[],reason:''}));
      project.direct=project.direct.map(d=>({...d,freshness:null,reason:''}));
    }
    $('audit-status').textContent='';$('report-progress').hidden=true;$('stop-audit').hidden=true;
  }
  function configure() {
    resetResults();picker=null;if(!project)return;
    const mode=registryMode(), options=$('scope-options');
    const destinations=mode==='osv' ? LabRegistry.defaultBase+t(' и ',' and ')+'https://api.osv.dev/'
      : mode==='registry' ? LabRegistry.base() : null;
    const items=project.rows.filter(row=>!row.localOnly).map(row=>({
      key:row.key,label:row.key,publicOrigin:row.publicOrigin,selected:mode==='snapshot' || row.publicOrigin,
    }));
    options.hidden=project.excerpt || !items.length;
    picker=LabPackagePicker.mount(options,{
      items,publicDestination:destinations,exactReleases:true,
      onChange:()=>{if(picker){resetResults();render();}},
    });
    options.querySelector('details').open=!!destinations && !!items.length && !items.some(item=>item.selected);
    render();
  }
  function renderVersions() {
    const filter=$('audit-filter').value.trim().toLowerCase();
    const rows=project.rows.filter(r=>r.key.toLowerCase().includes(filter));
    const list=$('audit-rows');list.replaceChildren();
    for(const row of rows.slice(0,shown)){
      const detail=document.createElement('details'),item=el('li','');
      detail.append(el('summary',row.key+' · '+t('путей ','paths ')+row.paths.length));
      detail.ontoggle=()=>{if(detail.open && detail.childElementCount===1) detail.append(el('pre',row.paths.join('\n')));};
      item.append(detail);list.append(item);
    }
    $('more-rows').hidden=rows.length<=shown;
  }
  function showAgeRows(lines) {
    $('age-rows').replaceChildren(...lines.map(line=>el('li',line)));
    $('age-heading').textContent=t('Отставание прямых зависимостей','Direct dependency lag')+' · '+lines.length;
  }
  function renderFindings() {
    const list=$('findings');
    const term=$('finding-filter').value.trim().toLowerCase(), level=$('finding-level').value;
    const mode=registryMode();
    const items=[...findingRows.keys()].map(id=>findings.get(id)||{id,level:'Unknown'});
    const matches=LabSeverity.sorted(items.filter(item=>LabFindingCards.filter(item,findingRows.get(item.id),term,level)));
    $('finding-tools').hidden=!items.length;
    list.replaceChildren();
    for(const item of matches.slice(0,findingLimit)) {
      list.append(LabFindingCards.card(item,findingRows.get(item.id),project,mode));
    }
    if(!matches.length) {
      const checked=project.rows.some(row=>row.state==='found'||row.state==='empty');
      const empty=items.length ? t('По фильтру ничего не найдено.','No findings match the filter.')
        : checked ? t('Источник не вернул записей для проверенных версий.','The source returned no advisories for the checked versions.')
        : t('Пока нет результатов проверки уязвимостей.','No advisory results yet.');
      list.append(el('li',empty));
    }
    $('more-findings').hidden=matches.length<=findingLimit;
  }
  function render() {
    const rows=project.rows,direct=project.direct, mode=registryMode(), selected=rowsForRun();
    const byId=new Map();
    for(const row of rows) for(const id of row.ids) {if(!byId.has(id))byId.set(id,[]);byId.get(id).push(row);}
    const checked=rows.filter(r=>r.state==='found'||r.state==='empty').length;
    const dated=direct.filter(d=>['fresh','stale'].includes(d.freshness?.status));
    const lag=d=>Math.max(0,Math.floor((Date.parse(d.freshness.latestReleased)-Date.parse(d.freshness.released))/86400000));
    const stale=dated.filter(d=>d.freshness.status==='stale');
    $('age-count').textContent=report && dated.length?stale.length+' / '+dated.length+' · '+Math.round(100*stale.length/dated.length)+'%':'—';
    $('age-coverage').textContent=project.manifest
      ? t('Известны даты для ','Release dates available for ')+dated.length+' / '+direct.length+t(' прямых зависимостей',' direct dependencies')
      : t('Для определения прямых зависимостей добавьте package.json.','Add package.json to identify direct dependencies.');
    const unverifiedPaths=r=>mode!=='registry' && !r.localOnly && r.publicPaths && r.paths.length>r.publicPaths.size;
    const fullSecurity=checked>0 && checked===rows.length && !project.skipped.length && !rows.some(unverifiedPaths);
    $('vuln-count').textContent=byId.size || (report && fullSecurity?'0':checked>0?t('0 среди проверенных','0 among checked'):'—');
    $('security-coverage').textContent=t('Проверено пар «пакет + версия» ','Package/version checks completed ')+checked+' / '+rows.length+
      t(' · с находками ',' · with findings ')+rows.filter(r=>r.ids.length).length;
    $('report-source').textContent=t('Отставание — разница дат выпуска установленной и старшей стабильной версии. Доля считается среди прямых зависимостей с известными датами. Уязвимости ищем и в зависимостях этих библиотек.','Lag compares the release dates of the installed and highest stable versions. The percentage covers direct dependencies with known dates. Security checks also cover transitive dependencies.');
    const address=LabRegistry.base();
    $('send-summary').textContent=mode==='snapshot'
      ?t('Страница скачает снимок публичной базы OSV и каталог выпусков с этого сайта. Имена пакетов, версии и пути останутся в браузере.','This page downloads the public OSV snapshot and release catalog from this site. Names, versions and paths stay in your browser.')
      :mode==='registry'
      ?t('По кнопке имена и версии будут отправлены только в ','On click, names and versions go only to ')+address+t(' за датами и в его npm Bulk Advisory API.',' for release dates and its npm Bulk Advisory API.')
      :t('После запуска https://registry.npmjs.org/ получит имена выбранных прямых зависимостей для проверки дат. В https://api.osv.dev/ уйдут выбранные имена и версии для проверки уязвимостей. Пути останутся в браузере.',
         'On run, https://registry.npmjs.org/ receives selected direct dependency names for release dates. https://api.osv.dev/ receives selected names and versions for advisory checks. Paths stay in your browser.');
    $('send-summary').textContent+=' '+t('Выбрано пар «пакет + версия» ','Selected package/version pairs ')+selected.length+' / '+rows.length+
      t(' · вне выбора ',' · outside selection ')+(rows.length-selected.length)+'.';
    $('audit-actions').hidden=project.excerpt;
    $('send-summary').hidden=project.excerpt;
    $('run-audit').disabled=project.excerpt || !!active || !picker?.ready();
    $('scope-options').inert=!!active;
    $('result-details').hidden=!report;
    if(!report)return;
    findingRows=byId;
    renderFindings();
    showAgeRows(dated.sort((a,b)=>lag(b)-lag(a)).map(d=>d.name+' '+d.version+' → '+d.freshness.latest+' · '+lag(d)+t(' дн.',' d')+' ('+d.freshness.released.slice(0,10)+' → '+d.freshness.latestReleased.slice(0,10)+')'));
    const gaps=new Map();
    function gap(reason,detail){if(!gaps.has(reason))gaps.set(reason,[]);gaps.get(reason).push(detail);}
    for (const d of direct) if(!d.freshness || d.freshness.status==='unknown')gap(d.reason || t('Нет дат для расчёта отставания','Release dates unavailable'),d.name+' '+(d.version||d.range));
    for(const row of rows)if(row.state!=='found'&&row.state!=='empty')gap(row.reason||(!eligible(row)?t('Вне выбранной области','Outside selected scope'):t('Нет полного ответа о безопасности','No complete advisory response')),row.key);
    for(const row of selected.filter(unverifiedPaths)) {
      for(const path of row.paths) if(!row.publicPaths.has(path)) {
        gap(t('Публичное происхождение копии не подтверждено','Copy has unconfirmed public provenance'),path);
      }
    }
    for(const s of project.skipped)gap(t('Запись без проверяемой пары «имя + версия»','Entry without an auditable name/version pair'),s.path);
    const unknown=$('unknown-rows');unknown.replaceChildren();
    for(const [why,items] of gaps){const li=el('li',''),d=document.createElement('details');d.append(el('summary',why+' · '+items.length));d.ontoggle=()=>{if(d.open&&d.childElementCount===1)d.append(el('pre',items.join('\n')));};li.append(d);unknown.append(li);}
    $('unknown-heading').textContent=t('Пробелы в проверке','Coverage gaps')+' · '+[...gaps.values()].reduce((n,items)=>n+items.length,0);
  }
  async function load(input,providedManifest,excerpt=false) {
    const gen=++generation;resetResults();project=null;$('inventory').hidden=true;$('parse-status').textContent='';
    $('vitest-context').hidden=!excerpt;
    $('one-advisory').href=Lab.urlFor('advisories.html');
    try {
      let manifest=providedManifest;
      const file=manifest instanceof File ? manifest : null;
      if(file){if(file.size>maxBytes)throw Error('size');manifest=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||manifest.lockfileVersion)throw Error('manifest');}
      if(gen!==generation)return;
      if(!input){$('parse-status').textContent=manifest?t('package.json прочитан. Добавьте lock-файл, чтобы определить установленные версии.','Read package.json. Add a lockfile to identify installed versions.'):'';return;}
      if(input instanceof File && input.size>maxBytes)throw Error('size');
      const lock=input instanceof File ? LabYarn.read(await input.text()) : input;
      if(gen!==generation)return;
      if(Object.keys(lock?.packages||{}).length>30001)throw Error('size');
      const format=LabYarn.format(lock.packages);
      const inventory=LabAudit.localInventory(lock);
      const root=manifest || lock.packages[''];
      project={...inventory,lock,excerpt,manifest:manifest || (format ? null : root),direct:LabAudit.directVersions(root,lock),root:root?.name};
      $('parse-status').textContent=(root?.name?root.name+' · ':'')+(format||'npm')+' · '+t('прямых зависимостей ','direct dependencies ')+project.direct.length+t(', точных пар «имя + версия» ',', exact name/version pairs ')+project.rows.length+
        (format&&!manifest?t('. Добавьте package.json для оценки прямых зависимостей.','. Add package.json to assess direct dependencies.'):'');
      $('audit-filter').value='';shown=40;$('inventory').hidden=false;configure();renderVersions();
    }catch(e){if(gen===generation)$('parse-status').textContent=e.message==='size'?t('Ограничение — 8 МиБ и 30 000 записей в одном файле.','Limit: 8 MiB and 30,000 entries per file.'):t('Проверьте формат: package.json и npm lock v3, Yarn Classic или Berry.','Check the format: package.json and an npm v3, Yarn Classic or Berry lockfile.');}
  }
  async function run() {
    if(active || !project || !picker?.ready() || $('run-audit').disabled)return;
    resetResults();
    const mode=registryMode(), rows=rowsForRun(), selectedPaths=new Set(rows.flatMap(r=>r.paths));
    const ctrl=new AbortController(),signal=ctrl.signal;active=ctrl;report=true;
    const direct=project.direct.filter(d=>selectedPaths.has(d.path) && picker.has(d.name+'@'+d.version));
    const chunks=[];for(let i=0;i<rows.length;i+=LabAudit.limit)chunks.push(rows.slice(i,i+LabAudit.limit));
    const progress=$('report-progress');progress.max=rows.length+direct.length;progress.value=0;progress.hidden=false;
    $('stop-audit').hidden=false;render();
    const done=n=>{if(active===ctrl){progress.value+=n;$('audit-status').textContent=t('Обработано ','Processed ')+progress.value+' / '+progress.max;}};
    const records=new Map(), gen=generation;
    const issues=[];
    let dateError, advisoryError, detailError;
    if(mode==='snapshot') {
      $('audit-status').textContent=t('Читаем снимок OSV и каталог выпусков…','Reading the OSV snapshot and release catalog…');
      const [security,catalog]=await Promise.allSettled([LabHostedAudit.load(signal),LabRegistry.releases(signal)]);
      if(active!==ctrl || gen!==generation)return;
      if(!signal.aborted) {
        if(security.status==='fulfilled') {
          const index=security.value;
          LabHostedAudit.check(index,rows,records,signal);
          const date=new Date(index.published*1000).toISOString().slice(0,10);
          issues.push((index.fresh?t('Снимок OSV от ','OSV snapshot dated '):t('Срок действия снимка OSV истёк. Дата снимка — ','The OSV snapshot expired. Snapshot date: '))+date+'.');
        } else {
          const reason=t('Не удалось загрузить снимок OSV с этой страницы.','The OSV snapshot could not be loaded from this site.');
          issues.push(reason);for(const row of rows)row.reason=reason;
        }
        if(catalog.status==='fulfilled') for(const d of direct) {
          if(Object.hasOwn(catalog.value.packages,d.name))d.freshness=LabCriterion.freshness(catalog.value.packages[d.name],d.version);
          else d.reason=t('Даты доступны в локальной версии с полным реестром.','Use the local edition with the full registry for these dates.');
        }
        else issues.push(LabRegistry.message(catalog.reason));
      }
    } else {
      await Promise.all([pool(direct,4,async d=>{
        try {
          if(dateError)throw dateError;
          d.freshness=LabCriterion.freshness(await LabRegistry.packument(d.name,signal),d.version);
        } catch(e) {
          if(unavailable(e))dateError=e;
          d.reason=LabRegistry.message(e);
        }
        done(1);
      },signal),pool(chunks,3,async batch=>{
        for(const row of batch)row.state='unknown';
        try {
          if(advisoryError)throw advisoryError;
          if(mode==='registry')await LabAudit.registryAudit(batch,records,signal);
          else {
            const error=await LabAudit.check(batch,signal,true);
            if(error)throw error;
          }
        } catch(e) {
          if(unavailable(e))advisoryError=e;
          for(const row of batch)row.reason=LabRegistry.message(e);
        }
        done(batch.length);
      },signal)]);
      if(dateError)issues.push(t('Нет доступа к реестру за датами выпусков.','Cannot reach the registry for release dates.'));
      if(advisoryError)issues.push(mode==='osv'?t('Нет доступа к OSV.','OSV is unreachable.'):t('Нет доступа к базе уязвимостей реестра.','Registry advisory data is unreachable.'));
    }
    if(active!==ctrl || gen!==generation)return;
    if(mode==='osv') {
      const ids=[...new Set(rows.flatMap(r=>r.ids))];progress.max+=ids.length;
      await pool(ids,4,async id=>{
        const href='https://osv.dev/vulnerability/'+encodeURIComponent(id);
        try {
          if(detailError)throw detailError;
          const data=await LabRegistry.json('https://api.osv.dev/v1/vulns/'+encodeURIComponent(id),{},signal);
          if(data?.id!==id)throw Error('METADATA');
          if(data.withdrawn) {for(const row of rows){row.ids=row.ids.filter(x=>x!==id);if(row.state==='found'&&!row.ids.length)row.state=row.publicOrigin?'empty':'unknown';}}
          else records.set(id,{id,href,...LabAudit.advisoryMetadata(data,'OSV'),...LabSeverity.rating(data)});
        }catch(e){if(unavailable(e))detailError=e;records.set(id,{id,href,source:'OSV',level:'Unknown',score:null,detailsUnavailable:true});}done(1);
      },signal);
    }
    if(active!==ctrl || gen!==generation)return;
    findings=records;active=null;progress.hidden=true;$('stop-audit').hidden=true;
    const missingDetails=[...records.values()].filter(item=>item.detailsUnavailable).length;
    if(missingDetails)issues.push(t('Не удалось загрузить карточки OSV: ','OSV advisory details unavailable: ')+missingDetails+'.');
    const checked=rows.filter(r=>r.state==='found'||r.state==='empty').length;
    const dated=direct.filter(d=>['fresh','stale'].includes(d.freshness?.status)).length;
    const outside=project.rows.length-rows.length;
    const unverified=mode==='registry'?0:rows.reduce((n,row)=>n+row.paths.length-row.publicPaths.size,0);
    const securityGaps=rows.length-checked;
    if(securityGaps)issues.push(t('Без полного ответа о безопасности: ','Advisory checks incomplete: ')+securityGaps+'.');
    if(outside)issues.push(t('Вне выбора: ','Outside selection: ')+outside+'.');
    if(project.skipped.length)issues.push(t('Записей без проверяемой версии: ','Entries without an auditable version: ')+project.skipped.length+'.');
    if(unverified)issues.push(t('Копий без подтверждённого публичного источника: ','Copies with unconfirmed public provenance: ')+unverified+'.');
    if(dated<project.direct.length)issues.push(t('Даты выпусков прямых зависимостей: ','Direct release dates: ')+dated+' / '+project.direct.length+'.');
    if(!project.manifest)issues.push(t('Для оценки дат прямых зависимостей нужен package.json.','Direct dependency dates require package.json.'));
    const complete=project.manifest && !securityGaps && dated===project.direct.length && !outside && !project.skipped.length && !unverified && !missingDetails;
    const status=signal.aborted?t('Остановлено. Сохранены полученные ответы.','Stopped. Completed responses are shown.'):
      complete?t('Проверка завершена.','Audit complete.'):t('Проверка неполная.','Audit incomplete.');
    $('audit-status').textContent=[status,...issues].join(' ');
    render();
  }
  window.addEventListener('lab-project',({detail})=>load(detail?.lock,detail?.manifest));
  $('finding-filter').placeholder=t('Пакет, название, CVE, GHSA','Package, title, CVE, GHSA');
  $('finding-filter').oninput=$('finding-level').onchange=()=>{findingLimit=30;renderFindings();};
  $('more-findings').onclick=()=>{findingLimit+=30;renderFindings();};
  $('run-audit').onclick=run;$('stop-audit').onclick=()=>active?.abort();
  $('audit-filter').oninput=()=>{shown=40;renderVersions();};
  $('more-rows').onclick=()=>{shown+=40;renderVersions();};
  async function sample(rev,recorded=false) {
    const excerpt=rev==='vitest';
    const data=excerpt ? window.LabVitestCapture : SelectorLab.cases[rev];
    await load(data.lock,data.manifest,excerpt);
    if(!project || project.lock!==data.lock)return;
    if(!excerpt) $('one-advisory').href=ReviewExample.link('advisories.html','selector',rev,data.nthPath);
    if(!recorded){$('audit-filter').value='nth-check';renderVersions();return;}
    const saved=excerpt ? data : window.LabAuditCapture;
    for(const row of project.rows) {
      if(Object.hasOwn(saved.results,row.key)) {
        row.ids=saved.results[row.key];row.state=row.ids.length?'found':'empty';
      } else {
        row.state='unknown';
        row.reason=t('В учебной записи есть данные только для Tinypool.','The example includes advisory data only for Tinypool.');
      }
    }
    for(const d of project.direct) {
      if(saved.packument)d.freshness=LabCriterion.freshness(saved.packument,d.version);
      else d.reason=t('Даты выпусков в этом примере не проверялись.','Release dates were outside this example’s scope.');
    }
    findings=new Map(Object.entries(saved.details));report=true;
    $('audit-status').textContent=excerpt
      ? t('Сокращённый пример. Две записи OSV для tinypool@1.1.1 сохранены ','Branch excerpt. Two OSV records for tinypool@1.1.1 were captured on ')+saved.captured+'.'
      : t('Запись аудита публичного примера от ','Recorded public example audit from ')+saved.captured+' · npmjs + OSV';
    render();
  }
  $('sample').onclick=()=>sample($('sample-choice').value==='vitest'?'vitest':'base',true);
  if(ReviewExample.kind==='selector' && Object.hasOwn(SelectorLab.cases,ReviewExample.revision))sample(ReviewExample.revision);
})();
