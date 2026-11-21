'use strict';
(() => {
  const {t}=Lab;
  const el=id=>document.getElementById(id);
  const form=el('range-form'), name=form.elements.pkg, range=form.elements.range, candidate=form.elements.v;
  const presets={scheduler:['0.23.0','0.23.2','0.25.0'],react:['18.2.0','18.3.1','19.0.0']};
  const ops={caret:'^',tilde:'~',exact:''};
  const params=new URLSearchParams(location.search);
  let releases=[], origin='manual', publicExample=null, active, request=0, reading=0, declarations=[], fromFile=false;

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
    request++;active?.abort();active=null;el('lookup-status').textContent='';
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
    el('range-host').textContent=validName ? t('По кнопке имя ','Clicking sends the name ')+pkg+t(' будет отправлено в ',' to ')+address :
      t('Для списка выпусков введите имя пакета npm, например @scope/name.','For published releases, enter an npm name such as @scope/name.');
    const source=el('range-source'), scale=el('range-scale'), reason=el('range-reason');
    source.hidden=!valid || !version;scale.replaceChildren();reason.textContent='';
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
      candidate.value=v;draw();sharePublicState();
      Array.from(scale.querySelectorAll('button')).find(button=>button.textContent===v)?.focus();
    }});
    reason.textContent=origin==='registry'
      ? t('На шкале показаны выпуски из реестра: ','Registry releases shown: ')+visible.length+'/'+releases.length+'. '+
        (releases.includes(version) ? t('Выбранная версия опубликована.','The selected release is published.') : t('В ответе реестра выбранной версии нет.','The selected version is absent from the registry response.'))
      : origin==='preset' ? t('На шкале три сохранённых выпуска ','The scale shows three saved releases of ')+pkg+'. '+
        (releases.includes(version) ? '' : t('Введённая версия проверена вручную. Её нет в этом снимке.','The entered version is a manual check outside this snapshot.'))
      : t('Проверено локально по правилам npm semver. Сведения о публикации версии можно загрузить отдельно.','Checked locally with npm semver. Load published releases to check availability.');
  }
  function preset(pkg,op='caret',v=presets[pkg][1]) {
    reading++;fromFile=false;stopLookup();publicExample=pkg;origin='preset';releases=presets[pkg];
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
  name.addEventListener('input',()=>{reading++;fromFile=false;el('range-dep').value='';localPackage(name.value);});
  for(const field of [range,candidate]) field.addEventListener('input',()=>{draw();sharePublicState();});
  for(const button of document.querySelectorAll('[data-preset]')) button.onclick=()=>{preset(button.dataset.preset);sharePublicState();};
  el('load-versions').onclick=async()=>{
    stopLookup();
    const serial=request, pkg=name.value.trim();
    active=new AbortController();releases=[];origin='manual';draw();
    el('lookup-status').textContent=t('Загружаем выпуски ','Loading releases for ')+pkg+'…';
    try {
      const doc=await LabRegistry.packument(pkg,active.signal);
      if(serial!==request)return;
      releases=Object.keys(doc.versions).filter(v=>Boolean(treeSemver.valid(v))).sort(LabRangeScale.compare);
      origin='registry';
      if(!candidate.value.trim() && releases.length) {
        const matches=releases.filter(v=>treeSemver.satisfies(v,range.value));
        candidate.value=matches.at(-1) || releases.findLast(v=>!v.includes('-')) || releases.at(-1);
      }
      el('lookup-status').textContent=releases.length ? t('Получено выпусков: ','Published releases received: ')+releases.length+'.' :
        t('Реестр вернул пакет без версий в формате semver.','The registry returned no semver releases for this package.');
    } catch(e) {
      if(serial!==request)return;
      el('lookup-status').textContent=LabRegistry.message(e);
    } finally {
      if(serial===request){active=null;draw();}
    }
  };
  const menu=el('range-dep');
  function selectDependency() {
    const edge=declarations[Number(menu.value)];
    if(menu.value && edge){fromFile=true;localPackage(edge.name,edge.spec);}
  }
  menu.addEventListener('change',selectDependency);
  async function useManifest(file) {
    const serial=++reading;
    declarations=[];menu.replaceChildren();el('range-dep-field').hidden=true;
    el('manifest-status').textContent='';
    if(fromFile){fromFile=false;localPackage('','');}
    if(!file)return;
    stopLookup();draw();
    try {
      if(file.size>8_000_000) throw Error(t('Лимит для package.json — 8 МБ.','The package.json limit is 8 MB.'));
      const doc=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
      if(serial!==reading)return;
      for(const group of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
        if(!doc?.[group] || typeof doc[group]!=='object' || Array.isArray(doc[group])) continue;
        for(const [name,spec] of Object.entries(doc[group]).sort(([a],[b])=>a.localeCompare(b))) {
          if(typeof spec==='string') declarations.push({name,spec,group});
        }
      }
      if(!declarations.length)throw Error(t('В package.json нет записей зависимостей.','The package.json contains no dependency declarations.'));
      menu.replaceChildren(new Option(t('Выберите зависимость','Choose a dependency'),''),
        ...declarations.map(({name,spec,group},i)=>new Option(name+' · '+spec+' ('+group+')',String(i))));
      el('range-dep-field').hidden=false;el('manifest-options').open=true;
      el('manifest-status').textContent=t('Прочитано локально: ','Read locally: ')+file.name+'.';
      menu.value='0';selectDependency();
    } catch(e) {
      if(serial!==reading)return;
      el('manifest-options').open=true;
      el('manifest-status').textContent=e instanceof SyntaxError ? t('Файл не удалось прочитать как JSON.','Could not read the file as JSON.') : e.message;
    }
  }
  el('range-file').addEventListener('change',()=>useManifest(el('range-file').files[0]));
  window.addEventListener('lab-project',event=>useManifest(event.detail?.manifest));
  const pkg=Object.hasOwn(presets,params.get('pkg')) ? params.get('pkg') : 'scheduler';
  const op=Object.hasOwn(ops,params.get('op')) ? params.get('op') : 'caret';
  const v=presets[pkg].includes(params.get('v')) ? params.get('v') : presets[pkg][1];
  preset(pkg,op,v);
})();
