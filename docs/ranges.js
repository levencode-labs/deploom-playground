'use strict';
(() => {
  const {t}=Lab;
  const el=id=>document.getElementById(id);
  const form=el('range-form'), name=form.elements.pkg, range=form.elements.range, candidate=form.elements.v;
  const presets={scheduler:['0.23.0','0.23.2','0.25.0'],react:['18.2.0','18.3.1','19.0.0']};
  const ops={caret:'^',tilde:'~',exact:''};
  const params=new URLSearchParams(location.search);
  let releases=[], origin='manual', publicExample=null, active, request=0, declarations=[], fromFile=false;
  let lastFile=null, lastText=null, reading=0, edits=0;
  const manifestHint=el('manifest-status').textContent;
  const hosted=LabRegistry.hostedAudit===true;
  if(hosted) el('load-versions').textContent=t('Проверить по снимку Nexus','Check the Nexus snapshot');

  function sharePublicState() {
    const base=presets[publicExample]?.[0];
    const op=Object.keys(ops).find(key=>range.value===ops[key]+base);
    if(base && op && presets[publicExample].includes(candidate.value)) {
      Lab.setExampleState({pkg:publicExample,op,v:candidate.value});
    } else {
      const url=new URL(location.href);
      const keys=['pkg','op','v'];
      if(!keys.some(key=>url.searchParams.has(key))) return;
      for(const key of keys) url.searchParams.delete(key);
      try {history.replaceState(null,'',url);} catch {}
      Lab.setExampleState({});
    }
  }
  function stopLookup() {
    request++;active?.abort();active=null;el('lookup-status').textContent='';el('range-local').hidden=true;
  }
  function draw() {
    const pkg=name.value.trim(), need=range.value.trim(), entered=candidate.value.trim();
    const version=treeSemver.valid(entered) ? entered.replace(/^v/,'') : null;
    const valid=Boolean(need && treeSemver.validRange(need));
    range.setAttribute('aria-invalid',String(Boolean(need) && !valid));
    candidate.setAttribute('aria-invalid',String(Boolean(entered) && !version));
    let address='', validName=false;
    try {address=LabRegistry.base();LabRegistry.url(pkg);validName=true;} catch {}
    el('load-versions').disabled=!validName || Boolean(active);
    el('range-host').textContent=hosted
      ? t('Браузер загрузит с этого сайта общую копию метаданных Nexus. Поиск имени и версий выполнится на устройстве.','The browser downloads a shared Nexus metadata snapshot from this site. Package names and versions are matched on this device.')
      : validName ? t('По кнопке имя ','Clicking sends the name ')+pkg+t(' будет отправлено в ',' to ')+address :
      t('Для списка выпусков введите имя пакета npm, например @scope/name.','For published releases, enter an npm name such as @scope/name.');
    const source=el('range-source'), scale=el('range-scale'), reason=el('range-reason');
    source.hidden=!valid || !version;scale.replaceChildren();reason.textContent='';
    if(origin==='snapshot') el('range-local').hidden=Boolean(version && releases.includes(version));
    if(!valid || !version) {
      source.textContent='';
      reason.textContent=!need ? t('Введите требование из package.json.','Enter the requirement from package.json.') :
        !valid ? t('Эту запись нельзя проверить как диапазон npm semver. Для git, file: или workspace: нужен источник зависимости.','This is not an npm semver range. Git, file: and workspace: dependencies use a different source.') :
        !entered ? t('Введите точную версию из lock-файла или загрузите выпуски пакета.','Enter an exact version from a lockfile or load the package releases.') :
        t('Для кандидата нужна точная версия, например 1.2.3 или 2.0.0-beta.1.','Use an exact release such as 1.2.3 or 2.0.0-beta.1 as the candidate.');
      return;
    }
    source.textContent='semver.satisfies('+JSON.stringify(entered)+', '+JSON.stringify(need)+')';
    const visible=LabRangeScale.nearby(releases,need,version);
    LabRangeScale.render(scale,{range:need,selected:version,candidates:visible,onSelect:v=>{
      edits++;candidate.value=v;draw();sharePublicState();
      Array.from(scale.querySelectorAll('button')).find(button=>button.textContent===v)?.focus();
    }});
    reason.textContent=origin==='snapshot'
      ? t('Версий на шкале из снимка Nexus: ','Nexus snapshot releases on the scale: ')+visible.length+'/'+releases.length+'. '+
        (releases.includes(version) ? t('Проверяемая версия есть в снимке.','The selected version is in the snapshot.') : t('В снимке нет проверяемой версии.','The snapshot has no entry for the selected version.'))
      : origin==='registry' ? t('На шкале показаны выпуски из реестра: ','Registry releases shown: ')+visible.length+'/'+releases.length+'. '+
        (releases.includes(version) ? t('Выбранная версия опубликована.','The selected release is published.') : t('В ответе реестра выбранной версии нет.','The selected version is absent from the registry response.'))
      : origin==='preset' ? t('На шкале три сохранённых выпуска ','The scale shows three saved releases of ')+pkg+'. '+
        (releases.includes(version) ? '' : t('Введённая версия проверена вручную. Её нет в этом снимке.','The entered version is a manual check outside this snapshot.'))
      : t('Проверено локально по правилам npm semver. Сведения о публикации версии можно загрузить отдельно.','Checked locally with npm semver. Load published releases to check availability.');
  }
  function preset(pkg,op='caret',v=presets[pkg][1]) {
    edits++;fromFile=false;stopLookup();publicExample=pkg;origin='preset';releases=presets[pkg];
    name.value=pkg;range.value=ops[op]+releases[0];candidate.value=v;
    el('range-dep').value='';draw();
  }
  function localPackage(pkg,spec) {
    stopLookup();publicExample=null;origin='manual';releases=[];
    name.value=pkg;
    if(spec!==undefined) {range.value=spec;candidate.value=treeSemver.valid(spec) ? spec : '';}
    draw();sharePublicState();
  }
  form.addEventListener('submit',e=>e.preventDefault());
  name.addEventListener('input',()=>{edits++;fromFile=false;el('range-dep').value='';localPackage(name.value);});
  for(const field of [range,candidate]) field.addEventListener('input',()=>{edits++;draw();sharePublicState();});
  for(const button of document.querySelectorAll('[data-preset]')) button.onclick=()=>{preset(button.dataset.preset);sharePublicState();};
  el('load-versions').onclick=async()=>{
    stopLookup();
    const serial=request, pkg=name.value.trim();
    active=new AbortController();releases=[];origin='manual';draw();
    el('lookup-status').textContent=hosted ? t('Читаем снимок Nexus…','Reading the Nexus snapshot…') : t('Загружаем выпуски ','Loading releases for ')+pkg+'…';
    let date='';
    try {
      const signal=active.signal;
      if(hosted) {
        const snapshot=await LabRegistry.releases(signal);
        date=new Date(snapshot.published*1000).toISOString().slice(0,10)+' UTC';
        if(serial!==request)return;
      }
      const doc=await LabRegistry.packument(pkg,signal);
      if(serial!==request)return;
      releases=Object.keys(doc.versions).filter(v=>Boolean(treeSemver.valid(v))).sort(LabRangeScale.compare);
      origin=hosted?'snapshot':'registry';
      if(!candidate.value.trim() && releases.length) {
        const matches=releases.filter(v=>treeSemver.satisfies(v,range.value));
        candidate.value=matches.at(-1) || releases.findLast(v=>!v.includes('-')) || releases.at(-1);
      }
      el('lookup-status').textContent=hosted ? t('Снимок Nexus от ','Nexus snapshot dated ')+date+t('. Выпусков: ','. Releases: ')+releases.length+'.' : releases.length ? t('Получено выпусков: ','Published releases received: ')+releases.length+'.' :
        t('Реестр вернул пакет без версий в формате semver.','The registry returned no semver releases for this package.');
    } catch(e) {
      if(serial!==request)return;
      el('lookup-status').textContent=hosted && e.status===404 && date ? t('В снимке Nexus от ','The Nexus snapshot dated ')+date+t(' нет этого пакета.',' has no entry for this package.') : LabRegistry.message(e);
      el('range-local').hidden=!hosted;
    } finally {
      if(serial===request){active=null;draw();}
    }
  };
  const menu=el('range-dep');
  function selectDependency() {
    const edge=declarations[Number(menu.value)];
    if(menu.value && edge){edits++;fromFile=true;localPackage(edge.name,edge.spec);}
  }
  menu.addEventListener('change',selectDependency);
  function clearManifest() {
    declarations=[];menu.replaceChildren();el('range-dep-field').hidden=true;
    el('manifest-status').textContent=manifestHint;
    if(fromFile){fromFile=false;localPackage('','');}
  }
  async function useManifest(file) {
    if(file===lastFile)return;
    const serial=++reading, priorEdits=edits;
    lastFile=file;
    if(!file){lastText=null;clearManifest();return;}
    try {
      if(file.size>8_000_000) throw Error(t('Лимит для package.json — 8 МБ.','The package.json limit is 8 MB.'));
      const text=await file.text();
      if(serial!==reading || text===lastText)return;
      // IndexedDB and other tabs can deliver a new File for the same manifest.
      lastText=text;
      const doc=JSON.parse(text.replace(/^\uFEFF/,''));
      declarations=[];
      for(const group of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
        if(!doc?.[group] || typeof doc[group]!=='object' || Array.isArray(doc[group])) continue;
        for(const [name,spec] of Object.entries(doc[group]).sort(([a],[b])=>a.localeCompare(b))) {
          if(typeof spec==='string') declarations.push({name,spec,group});
        }
      }
      if(!declarations.length)throw Error(t('В package.json нет записей зависимостей.','The package.json contains no dependency declarations.'));
      menu.replaceChildren(new Option(t('Выберите зависимость','Choose a dependency'),''),
        ...declarations.map(({name,spec,group},i)=>new Option(name+' · '+spec+' ('+group+')',String(i))));
      el('range-dep-field').hidden=false;
      el('manifest-status').textContent='';
      if(edits===priorEdits){menu.value='0';selectDependency();}
    } catch(e) {
      if(serial!==reading)return;
      lastText=null;clearManifest();
      el('manifest-status').textContent=e instanceof SyntaxError ? t('Файл не удалось прочитать как JSON.','Could not read the file as JSON.') : e.message;
    }
  }
  window.addEventListener('lab-project',event=>useManifest(event.detail?.manifest || null));
  const pkg=Object.hasOwn(presets,params.get('pkg')) ? params.get('pkg') : 'scheduler';
  const op=Object.hasOwn(ops,params.get('op')) ? params.get('op') : 'caret';
  const v=presets[pkg].includes(params.get('v')) ? params.get('v') : presets[pkg][1];
  preset(pkg,op,v);
})();
