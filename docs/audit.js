'use strict';
(() => {
  const {t}=Lab, {maxBytes,pool}=LabAudit;
  const $=id=>document.getElementById(id);
  const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
  let generation=0, project, active, findings=new Map(), groups=[], findingLimit=30;
  const registryMode = () => LabRegistry.hostedAudit ? 'snapshot' : LabRegistry.base() === LabRegistry.defaultBase ? 'osv' : 'registry';
  const unavailable = e => e?.name==='TypeError' || e?.name==='TimeoutError' || [401,403,429,502,503,504].includes(e?.status);
  function eligible(row) {return !row.localOnly && (registryMode()==='snapshot' || row.publicOrigin);}

  function resetResults() {
    active?.abort();active=null;findings=new Map();groups=[];findingLimit=30;
    if(project) {
      for (const row of project.rows) {row.state='ready';row.lookedUp=false;row.ids=[];delete row.reason;}
      for (const row of project.direct) {row.freshness=null;delete row.reason;}
    }
    $('inventory').hidden=true;$('audit-status').textContent='';
    $('report-progress').hidden=true;$('stop-audit').hidden=true;
    $('findings').replaceChildren();
  }

  function configure() {
    const mode=registryMode();
    const skipped=project.rows.filter(row=>!eligible(row)).length;
    const source=mode==='snapshot'
      ?t('Проверка по снимку OSV на этом сайте. Имена и версии остаются в браузере.','Uses this site’s OSV snapshot. Package names and versions stay in your browser.')
      :mode==='registry'
      ?t('Проверяемые имена и версии получит ','Package names and versions will be sent to ')+LabRegistry.base()
      :t('При запуске публичные имена и версии получит api.osv.dev. За датами обратимся в registry.npmjs.org.',
         'On run, api.osv.dev receives public names and versions. registry.npmjs.org receives direct dependency names for release dates.');
    $('send-summary').textContent=source+(skipped?' '+t('Пропустим локальные или неподтверждённые пары: ','Local or unconfirmed pairs skipped: ')+skipped+'.':'');
    $('run-audit').disabled=false;
  }

  function renderFindings() {
    const list=$('findings');list.replaceChildren();
    let shown=0;
    for(const group of groups){
      if(shown>=findingLimit)break;
      const section=document.createElement('section');
      section.append(el('h4',group.label+' · '+group.entries.length));
      const cards=document.createElement('ul');cards.className='report-list';
      for(const {item,rows} of group.entries) {
        if(shown>=findingLimit)break;
        cards.append(LabFindingCards.card(item,rows,project,registryMode(),true));shown++;
      }
      section.append(cards);list.append(section);
    }
    if(!shown) list.append(el('p',project.rows.some(row=>row.state==='empty')
      ?t('Для проверенных версий источник не вернул записей.','No advisories returned for the checked versions.')
      :t('Данных об уязвимостях пока нет.','No advisory results are available.')));
    $('more-findings').hidden=shown>=groups.reduce((sum,g)=>sum+g.entries.length,0);
  }

  function render() {
    const {rows,direct}=project, mode=registryMode();
    const summary=LabAudit.summarize(rows,findings);
    groups=summary.groups;
    const checked=rows.filter(row=>row.state==='found'||row.state==='empty').length;
    const known=checked>0 || summary.total>0 || (!rows.length && !project.skipped.length);
    $('vuln-count').textContent=known?String(summary.total):'—';
    $('affected-count').textContent=known
      ? t('Затронуто пакетов: ','Affected package names: ')+summary.packages+t(' · версий: ',' · package versions: ')+summary.versions
      : t('Сколько пакетов затронуто, пока неизвестно.','The affected package count is unknown.');
    const levels=$('severity-counts');levels.replaceChildren();
    const packageCounts=[];
    for(const [level,abbr] of [['Critical','C'],['High','H'],['Medium','M'],['Low','L'],['None',t('Без риска','None')],['Unknown','?']]) {
      const n=summary.severities[level] || 0;
      if(!n && (level==='None' || level==='Unknown'))continue;
      packageCounts.push(abbr+': '+(known?summary.packageSeverities[level]||0:'—'));
      const tile=el('span',abbr+': '+(known?n:'—'));
      tile.className='severity-tag sev-'+level.toLowerCase();
      const name=level==='Unknown'?t('Без оценки','Unrated'):level;
      tile.title=name;tile.setAttribute('aria-label',name+' '+(known?n:'—'));levels.append(tile);
    }
    $('package-severities').textContent=t('Пакеты по максимальной серьёзности: ','Packages by highest known severity: ')+packageCounts.join(' · ');
    $('security-coverage').textContent=t('Проверено пар «пакет + версия»: ','Package/version checks completed: ')+checked+' / '+rows.length;
    const dated=direct.filter(d=>['fresh','stale'].includes(d.freshness?.status));
    const lag=d=>Math.max(0,Math.floor((Date.parse(d.freshness.latestReleased)-Date.parse(d.freshness.released))/86400000));
    const stale=dated.filter(d=>d.freshness.status==='stale');
    $('age-count').textContent=dated.length?Math.round(100*stale.length/dated.length)+'%':'—';
    $('age-ratio').textContent=dated.length?t('Отстают: ','Behind: ')+stale.length+' / '+dated.length:t('Недостаточно данных для расчёта.','Insufficient release dates.');
    $('age-coverage').textContent=project.manifest?t('Известны даты: ','Release dates available: ')+dated.length+' / '+direct.length:
      t('Добавьте package.json для оценки прямых зависимостей.','Add package.json to identify direct dependencies.');
    $('age-details').hidden=!stale.length;
    $('age-heading').textContent=t('Отстающие пакеты','Packages over a year behind')+' · '+stale.length;
    $('age-rows').replaceChildren(...stale.sort((a,b)=>lag(b)-lag(a)).map(d=>el('li',d.name+' '+d.version+' → '+d.freshness.latest+' · '+lag(d)+t(' дн.',' d'))));
    const gaps=new Map();
    function gap(reason,detail){if(!gaps.has(reason))gaps.set(reason,[]);gaps.get(reason).push(detail);}
    for (const d of direct) if(!d.freshness || d.freshness.status==='unknown')gap(d.reason || t('Нет дат выпусков','Release dates unavailable'),d.name);
    for(const row of rows) {
      if(row.state!=='found'&&row.state!=='empty')gap(row.reason||(!eligible(row)?t('Локальная запись или неподтверждённый источник','Local entry or unconfirmed source'):t('Нет полного ответа о безопасности','Incomplete advisory response')),row.key);
      if(mode!=='registry' && row.publicPaths && row.publicPaths.size && row.publicPaths.size<row.paths.length) {
        for(const path of row.paths) if(!row.publicPaths.has(path))gap(t('Источник копии не подтверждён','Unconfirmed copy origin'),path);
      }
    }
    for(const s of project.skipped)gap(t('Нет проверяемой версии','No auditable version'),s.path);
    const unknown=$('unknown-rows');unknown.replaceChildren();$('unknown-details').hidden=!gaps.size;
    for(const [why,items] of gaps){const li=el('li',''),d=document.createElement('details');d.append(el('summary',why+' · '+items.length));d.ontoggle=()=>{if(d.open&&d.childElementCount===1)d.append(el('pre',items.join('\n')));};li.append(d);unknown.append(li);}
    $('inventory').hidden=false;renderFindings();
  }
  async function load(input,providedManifest,excerpt=false) {
    const gen=++generation;resetResults();project=null;$('run-audit').disabled=true;$('send-summary').textContent='';$('parse-status').textContent=t('Выберите lock-файл вверху страницы.','Choose a lockfile above.');
    $('vitest-context').hidden=!excerpt;
    $('audit-controls').hidden=excerpt;
    try {
      let manifest=providedManifest;
      const file=manifest instanceof File ? manifest : null;
      if(file){if(file.size>maxBytes)throw Error('size');manifest=JSON.parse((await file.text()).replace(/^\uFEFF/,''));if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||manifest.lockfileVersion)throw Error('manifest');}
      if(gen!==generation)return;
      if(!input){$('parse-status').textContent=manifest?t('package.json прочитан. Добавьте lock-файл, чтобы определить установленные версии.','Read package.json. Add a lockfile to identify installed versions.'):t('Выберите lock-файл вверху страницы.','Choose a lockfile above.');return;}
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
      configure();
    }catch(e){if(gen===generation)$('parse-status').textContent=e.message==='size'?t('Ограничение — 8 МиБ и 30 000 записей в одном файле.','Limit: 8 MiB and 30,000 entries per file.'):t('Проверьте формат: package.json и npm lock v3, Yarn Classic или Berry.','Check the format: package.json and an npm v3, Yarn Classic or Berry lockfile.');}
  }
  async function run() {
    if(active || !project || project.excerpt || $('run-audit').disabled)return;
    resetResults();
    const mode=registryMode(), rows=project.rows.filter(eligible);
    const selectedPaths=new Map();
    for(const row of rows) {
      for(const path of mode==='snapshot'?row.paths:row.publicPaths) selectedPaths.set(path,row.key);
    }
    const ctrl=new AbortController(),signal=ctrl.signal;active=ctrl;$('run-audit').disabled=true;
    const direct=project.direct.filter(d=>selectedPaths.get(d.path)===d.name+'@'+d.version);
    const chunks=[];for(let i=0;i<rows.length;i+=LabAudit.limit)chunks.push(rows.slice(i,i+LabAudit.limit));
    const progress=$('report-progress');progress.max=rows.length+direct.length;progress.value=0;progress.hidden=false;
    $('stop-audit').hidden=false;$('inventory').hidden=false;$('result-details').hidden=true;
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
    findings=records;active=null;$('result-details').hidden=false;$('run-audit').disabled=false;progress.hidden=true;$('stop-audit').hidden=true;
    const missingDetails=[...records.values()].filter(item=>item.detailsUnavailable).length;
    if(missingDetails)issues.push(t('Не удалось загрузить карточки OSV: ','OSV advisory details unavailable: ')+missingDetails+'.');
    const checked=rows.filter(r=>r.state==='found'||r.state==='empty').length;
    const dated=direct.filter(d=>['fresh','stale'].includes(d.freshness?.status)).length;
    const outside=project.rows.length-rows.length;
    const unverified=mode==='registry'?0:rows.reduce((n,row)=>n+row.paths.length-row.publicPaths.size,0);
    const securityGaps=rows.length-checked;
    if(securityGaps)issues.push(t('Без полного ответа о безопасности: ','Advisory checks incomplete: ')+securityGaps+'.');
    if(outside)issues.push(t('Пропущено пар: ','Skipped pairs: ')+outside+'.');
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
  $('more-findings').onclick=()=>{findingLimit+=30;renderFindings();};
  $('run-audit').onclick=run;$('stop-audit').onclick=()=>active?.abort();
  async function sample(rev,recorded=false) {
    const excerpt=rev==='vitest';
    const data=excerpt ? window.LabVitestCapture : SelectorLab.cases[rev];
    await load(data.lock,data.manifest,excerpt);
    if(!project || project.lock!==data.lock)return;
    if(!recorded)return;
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
    findings=new Map(Object.entries(saved.details));$('audit-controls').hidden=true;$('result-details').hidden=false;
    $('audit-status').textContent=excerpt
      ? t('Сокращённый пример. Две записи OSV для tinypool@1.1.1 сохранены ','Branch excerpt. Two OSV records for tinypool@1.1.1 were captured on ')+saved.captured+'.'
      : t('Запись аудита публичного примера от ','Recorded public example audit from ')+saved.captured+' · npmjs + OSV';
    render();
  }
  if(ReviewExample.kind==='vitest')sample('vitest',true);
  if(ReviewExample.kind==='selector' && Object.hasOwn(SelectorLab.cases,ReviewExample.revision))sample(ReviewExample.revision,ReviewExample.revision==='base');
})();
