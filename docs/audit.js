'use strict';
(() => {
  const {t}=Lab, {maxBytes,pool}=LabAudit;
  const $=id=>document.getElementById(id);
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  let generation=0, project, active, report, shown=40;
  let findings=new Map(), allowed=new Set();
  const group=name=>name.startsWith('@')?name.split('/')[0]:t('Без префикса @','Unscoped names');
  function registryMode() {try{return LabRegistry.base()===LabRegistry.defaultBase?'osv':'registry';}catch{return 'invalid';}}
  function eligible(row) {
    return !row.localOnly && (registryMode()==='registry' || row.publicOrigin || allowed.has(group(row.name)));
  }
  function rowsForRun() {return project.rows.filter(eligible);}
  function resetResults() {
    active?.abort();active=null;report=false;findings=new Map();
    if(project) {
      project.rows=project.rows.map(row=>({...row,state:'ready',ids:[],reason:''}));
      project.direct=project.direct.map(d=>({...d,freshness:null,reason:''}));
    }
    $('audit-status').textContent='';$('report-progress').hidden=true;$('stop-audit').hidden=true;
  }
  function configure() {
    resetResults();allowed.clear();if(!project)return;
    const options=$('scope-options');options.replaceChildren();
    const unknown=project.rows.filter(r=>!r.localOnly && !r.publicOrigin);
    const groups=[...new Set(unknown.map(r=>group(r.name)))].sort();
    $('scope-box').hidden=registryMode()!=='osv' || !groups.length;
    $('scope-box').open=registryMode()==='osv' && groups.length>0 && !project.rows.some(r=>r.publicOrigin);
    $('scope-title').textContent=t('Пакеты с зеркала или без публичного адреса','Packages from mirrors or without a public URL')+' · '+unknown.length;
    $('scope-hint').textContent=t('Отметьте группы, для которых можно отправить имена в публичный npm и OSV. Для внутренних пакетов выберите корпоративный реестр выше.','Select groups whose names may be sent to public npm and OSV. For internal packages, select your company registry above.');
    for(const key of groups) {
      const label=el('label',''),input=document.createElement('input');input.type='checkbox';
      input.onchange=()=>{resetResults();if(input.checked)allowed.add(key);else allowed.delete(key);render();};
      label.append(input,' '+key);options.append(label);
    }
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
  function render() {
    const rows=project.rows,direct=project.direct, mode=registryMode(), selected=rowsForRun();
    const byId=new Map();
    for(const row of rows) for(const id of row.ids) {if(!byId.has(id))byId.set(id,[]);byId.get(id).push(row);}
    const checked=rows.filter(r=>r.state==='found'||r.state==='empty').length;
    const dated=direct.filter(d=>['fresh','stale'].includes(d.freshness?.status));
    const lag=d=>Math.max(0,Math.floor((Date.parse(d.freshness.latestReleased)-Date.parse(d.freshness.released))/86400000));
    const stale=dated.filter(d=>Date.parse(d.freshness.latestReleased)-Date.parse(d.freshness.released)>365*86400000);
    $('age-count').textContent=report && dated.length?stale.length+' / '+dated.length+' · '+Math.round(100*stale.length/dated.length)+'%':'—';
    $('age-coverage').textContent=t('Известны даты для ','Release dates available for ')+dated.length+' / '+direct.length+t(' прямых зависимостей',' direct dependencies');
    $('vuln-count').textContent=byId.size || (report && checked===rows.length && checked>0?'0':checked>0?t('0 среди проверенных','0 among checked'):'—');
    $('security-coverage').textContent=t('Проверено версий ','Versions checked ')+checked+' / '+rows.length+t(' · с находками ',' · affected ')+rows.filter(r=>r.ids.length).length;
    $('report-source').textContent=t('Отставание — разница дат выпуска установленной и старшей стабильной версии. Доля считается среди прямых зависимостей с известными датами. Уязвимости ищем и в зависимостях этих библиотек.','Lag compares the release dates of the installed and highest stable versions. The percentage covers direct dependencies with known dates. Security checks also cover transitive dependencies.');
    const address=mode==='invalid'?'':LabRegistry.base();
    $('send-summary').textContent=mode==='invalid'?LabRegistry.message(Error('REGISTRY_URL')):mode==='registry'
      ?t('По кнопке имена и версии будут отправлены только в ','On click, names and versions go only to ')+address+t(' за датами и в его npm Bulk Advisory API.',' for release dates and its npm Bulk Advisory API.')
      :t('По кнопке npm получит имена для проверки версий, OSV — публичные имена и версии. Пути останутся в браузере.','On click, npm receives names for release lookups and OSV receives public names and versions. Paths stay in your browser.');
    $('send-summary').textContent+=' '+t('В проверке ','Selected ')+selected.length+' / '+rows.length+'.';
    $('run-audit').disabled=!!active || !selected.length || mode==='invalid';
    for(const input of $('scope-options').querySelectorAll('input'))input.disabled=!!active;
    $('result-details').hidden=!report;
    if(!report)return;
    const list=$('findings');list.replaceChildren();
    for(const item of LabSeverity.sorted([...byId.keys()].map(id=>findings.get(id)||{id,level:'Unknown',score:null,href:'',summary:''}))) {
      const li=el('li',''),detail=document.createElement('details'),summary=document.createElement('summary'),affected=byId.get(item.id);
      summary.append(LabSeverity.badge(item),' '+item.id+(item.summary?' · '+item.summary:''));
      detail.append(summary);for(const row of affected)detail.append(el('p',row.key),el('pre',row.paths.join('\n')));
      if(item.href){const a=el('a',t('Открыть запись источника','Open source advisory'));a.href=item.href;detail.append(a);}
      li.append(detail);list.append(li);
    }
    if(!byId.size) list.append(el('li',checked?t('Источник не вернул записей для проверенных версий.','The source returned no advisories for the checked versions.'):t('Пока нет результатов проверки уязвимостей.','No vulnerability results yet.')));
    showAgeRows(dated.sort((a,b)=>lag(b)-lag(a)).map(d=>d.name+' '+d.version+' → '+d.freshness.latest+' · '+lag(d)+t(' дн.',' d')+' ('+d.freshness.released.slice(0,10)+' → '+d.freshness.latestReleased.slice(0,10)+')'));
    const gaps=new Map();
    function gap(reason,detail){if(!gaps.has(reason))gaps.set(reason,[]);gaps.get(reason).push(detail);}
    for (const d of direct) if(!d.freshness || d.freshness.status==='unknown')gap(d.reason || t('Нет дат для расчёта отставания','Release dates unavailable'),d.name+' '+(d.version||d.range));
    for(const row of rows)if(row.state!=='found'&&row.state!=='empty')gap(row.reason||(!eligible(row)?t('Вне выбранной области','Outside selected scope'):t('Нет полного ответа о безопасности','No complete advisory response')),row.key);
    for(const s of project.skipped)gap(t('Запись без точной версии','Entry without an exact version'),s.path);
    const unknown=$('unknown-rows');unknown.replaceChildren();
    for(const [why,items] of gaps){const li=el('li',''),d=document.createElement('details');d.append(el('summary',why+' · '+items.length));d.ontoggle=()=>{if(d.open&&d.childElementCount===1)d.append(el('pre',items.join('\n')));};li.append(d);unknown.append(li);}
    $('unknown-heading').textContent=t('Пробелы в проверке','Coverage gaps')+' · '+[...gaps.values()].reduce((n,items)=>n+items.length,0);
  }
  async function load(input,providedManifest) {
    const gen=++generation;resetResults();project=null;$('inventory').hidden=true;$('parse-status').textContent='';
    $('one-advisory').href=Lab.urlFor('advisories.html');
    try {
      const file=$('audit-manifest').files[0];let manifest=providedManifest;
      if(file){if(file.size>maxBytes)throw Error('size');manifest=JSON.parse(await file.text());if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||manifest.lockfileVersion)throw Error('manifest');}
      if(gen!==generation)return;
      if(!input){$('parse-status').textContent=manifest?t('package.json прочитан. Добавьте lock-файл, чтобы определить установленные версии.','Read package.json. Add a lockfile to identify installed versions.'):'';return;}
      if(input instanceof File && input.size>maxBytes)throw Error('size');
      const lock=input instanceof File ? LabYarn.read(await input.text()) : input;
      if(gen!==generation)return;
      if(Object.keys(lock?.packages||{}).length>30001)throw Error('size');
      const format=LabYarn.format(lock.packages);
      const inventory=LabAudit.localInventory(lock);
      const root=manifest || lock.packages[''];
      project={...inventory,direct:LabAudit.directVersions(root,lock),root:root?.name};
      $('parse-status').textContent=(root?.name?root.name+' · ':'')+(format||'npm')+' · '+t('прямых зависимостей ','direct dependencies ')+project.direct.length+t(', точных пар «имя + версия» ',', exact name/version pairs ')+project.rows.length+
        (format&&!manifest?t('. Добавьте package.json для оценки прямых зависимостей.','. Add package.json to assess direct dependencies.'):'');
      $('audit-filter').value='';shown=40;$('inventory').hidden=false;configure();renderVersions();
    }catch(e){if(gen===generation)$('parse-status').textContent=e.message==='size'?t('Ограничение — 8 МиБ и 30 000 записей в одном файле.','Limit: 8 MiB and 30,000 entries per file.'):t('Проверьте формат: package.json и npm lock v3, Yarn Classic или Berry.','Check the format: package.json and an npm v3, Yarn Classic or Berry lockfile.');}
  }
  async function run() {
    if(active || !project || $('run-audit').disabled)return;
    resetResults();
    const mode=registryMode(), rows=rowsForRun(), eligibleKeys=new Set(rows.map(r=>r.key));
    const ctrl=new AbortController(),signal=ctrl.signal;active=ctrl;report=true;
    const direct=project.direct.filter(d=>eligibleKeys.has(d.name+'@'+d.version));
    const chunks=[];for(let i=0;i<rows.length;i+=LabAudit.limit)chunks.push(rows.slice(i,i+LabAudit.limit));
    const progress=$('report-progress');progress.max=rows.length+direct.length;progress.value=0;progress.hidden=false;
    $('stop-audit').hidden=false;render();
    const done=n=>{if(active===ctrl){progress.value+=n;$('audit-status').textContent=t('Обработано ','Processed ')+progress.value+' / '+progress.max;}};
    const records=new Map(), gen=generation;
    await Promise.all([pool(direct,4,async d=>{
      try{d.freshness=LabCriterion.freshness(await LabRegistry.packument(d.name,signal),d.version);}
      catch(e){d.reason=LabRegistry.message(e);}done(1);
    },signal),pool(chunks,3,async batch=>{
      for(const row of batch)row.state='unknown';
      try {if(mode==='registry')await LabAudit.registryAudit(batch,records,signal);else await LabAudit.check(batch,signal,true);}
      catch(e){for(const row of batch)row.reason=LabRegistry.message(e);}done(batch.length);
    },signal)]);
    if(active!==ctrl || gen!==generation)return;
    if(mode==='osv') {
      const ids=[...new Set(rows.flatMap(r=>r.ids))];progress.max+=ids.length;
      await pool(ids,4,async id=>{
        const href='https://osv.dev/vulnerability/'+encodeURIComponent(id);
        try {
          const data=await LabRegistry.json('https://api.osv.dev/v1/vulns/'+encodeURIComponent(id),{},signal);
          if(data?.id!==id)throw Error('METADATA');
          if(data.withdrawn) {for(const row of rows){row.ids=row.ids.filter(x=>x!==id);if(row.state==='found'&&!row.ids.length)row.state='empty';}}
          else records.set(id,{id,href,summary:data.summary||'',...LabSeverity.rating(data)});
        }catch{records.set(id,{id,href,level:'Unknown',score:null,summary:t('Описание и оценка недоступны','Description and rating unavailable')});}done(1);
      },signal);
    }
    if(active!==ctrl || gen!==generation)return;
    findings=records;active=null;progress.hidden=true;$('stop-audit').hidden=true;
    $('audit-status').textContent=signal.aborted?t('Остановлено. Сохранены полученные ответы.','Stopped. Completed responses are shown.'):
      t('Проверка закончена. Источник уязвимостей — ','Audit finished. Advisory source: ')+(mode==='osv'?'OSV':LabRegistry.base())+'.';
    render();
  }
  async function folder(source) {
    const gen=generation;
    try {const pair=await source;if(!pair || gen!==generation)return;LabRegistry.setFile($('audit-manifest'),pair.manifest);LabRegistry.setFile($('audit-file'),pair.lock);await load(pair.lock);}
    catch(e){if(gen===generation)$('parse-status').textContent=e.message;}
  }
  $('pick-folder').onclick=()=>folder(LabRegistry.pickProject($('audit-folder')));
  $('audit-folder').onchange=()=>folder(LabRegistry.projectFiles($('audit-folder').files));
  for(const id of ['audit-file','audit-manifest'])$(id).onchange=()=>load($('audit-file').files[0]);
  $('run-audit').onclick=run;$('stop-audit').onclick=()=>active?.abort();
  $('audit-filter').oninput=()=>{shown=40;renderVersions();};
  $('more-rows').onclick=()=>{shown+=40;renderVersions();};
  window.addEventListener('lab-registry-change',configure);
  async function sample(rev,recorded=false) {
    $('audit-file').value='';$('audit-manifest').value='';const data=SelectorLab.cases[rev];
    await load(data.lock,data.manifest);if(!project)return;
    $('one-advisory').href=ReviewExample.link('advisories.html','selector',rev,data.nthPath);
    if(recorded && rev==='base') {
      const saved=window.LabAuditCapture;
      for(const row of project.rows){if(!Object.hasOwn(saved.results,row.key))continue;row.ids=saved.results[row.key];row.state=row.ids.length?'found':'empty';}
      for(const d of project.direct)d.freshness=LabCriterion.freshness(saved.packument,d.version);
      findings=new Map(Object.entries(saved.details));report=true;
      $('audit-status').textContent=t('Запись аудита публичного примера от ','Recorded public example audit from ')+saved.captured+' · npmjs + OSV';render();
    }else{$('audit-filter').value='nth-check';renderVersions();}
  }
  $('sample').onclick=()=>sample('base',true);
  if(ReviewExample.kind==='selector' && Object.hasOwn(SelectorLab.cases,ReviewExample.revision))sample(ReviewExample.revision);
})();
