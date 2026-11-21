'use strict';
(() => {
  const { t } = Lab;
  const el = id => document.getElementById(id);
  const versions = ['18.2.0','18.3.1'];
  const recorded = new Map(versions.flatMap(version => [
    ['react@' + version, {name:'react',version}],
    ['react-dom@' + version, {name:'react-dom',version,peerDependencies:{react:'^' + version}}],
  ]));
  const metadata = new Map(recorded);
  const confirmed = new Map(), absent = new Set();
  const manifest = {dependencies:{react:'18.2.0','react-dom':'18.2.0'}};
  const packages = {'':manifest};
  for (const name of Object.keys(manifest.dependencies)) {
    packages['node_modules/' + name] = {...recorded.get(name + '@18.2.0'),
      resolved:'https://registry.npmjs.org/' + name + '/-/' + name + '-18.2.0.tgz'};
  }
  const sample = {lockfileVersion:3,packages};
  const params = new URLSearchParams(location.search);
  const lessonRevision = params.get('revision');
  const webpackLesson = params.get('example')==='webpack' ? LabWebpack.planner(lessonRevision) : null;
  const selectorLesson = ReviewExample.kind==='selector' ? ReviewExample.fixture() : null;
  const lesson = webpackLesson || selectorLesson;
  const reactLesson=params.get('example')==='react';
  const freshnessLesson=params.get('example')==='freshness';
  const exampleData=lesson || (freshnessLesson ? LabWebpack.planner('merged') : reactLesson ? {manifest,lock:sample} : null);
  // Only a recognized fixture takes precedence over the files in the header.
  Lab.activeProjectExample=Boolean(exampleData);
  const initialTargets = webpackLesson?.targets || (selectorLesson ? {'css-select':'4.3.0'} : reactLesson ? {'react-dom':'18.3.1'} : {});
  let active, revision = 0;
  const manual = () => el('plan-mode').value==='manual';
  const hosted=LabRegistry.hostedAudit===true;
  let snapshotSource='';
  function localDownload() {
    add('a',t('Скачать локальную версию для прямого запроса в Nexus','Download the local lab to query Nexus directly')).href=Lab.urlFor('index.html#local-download');
  }
  function registryAddress() {
    try { return LabRegistry.base(); } catch { return ''; }
  }

  function reset() {
    revision++;
    active?.abort(); active = undefined;
    el('network').hidden = true; el('network').open=false; el('lookup').disabled = true;
    el('lookup').onclick=null;el('lookup-packages').inert=false;
    el('net-status').textContent = '';
    el('plan-output').replaceChildren(); el('plan-output').hidden=true;
    el('plan-status').textContent='';
  }
  let manifestFile=null, lockFile=null, project=null, fileRevision=0, fileError='';
  const demo = () => !!exampleData && !manifestFile && !lockFile;
  el('goal-package').placeholder=t('Начните вводить имя','Type a package name');
  const packageChoice=LabPackageCombo.attach(el('goal-package'),{onSelect:changeSingleGoal,onInput:changeSingleGoal});
  function caption() {
    if (!demo()) {
      el('project').textContent=fileError || (!manifestFile && !lockFile
        ? t('Выберите package.json и lock-файл в шапке.','Choose package.json and a lockfile in the header.')
        : !manifestFile ? t('Добавьте package.json в шапке.','Add package.json in the header.')
        : !lockFile ? t('Добавьте lock-файл в шапке.','Add a lockfile in the header.') : '');
      return;
    }
    if (!manual() && (webpackLesson || freshnessLesson)) {
      el('project').textContent=t('Пример с webpack. Даты выпусков сохранены на 1 июля 2024 года.','Webpack example. Release dates were captured on 1 July 2024.');
      return;
    }
    if (selectorLesson && demo()) {
      el('project').textContent = t('Версии в выбранной ревизии · ','Versions in this revision · ')+
        'css-select@'+selectorLesson.cssVersion+' → nth-check@'+selectorLesson.nthVersion+
        t('. Здесь проверяются известные peer-требования к корневой цели css-select@4.3.0. Вызов селектора проверяется отдельно в уроке.',
          '. This checks known peer requirements for the root target css-select@4.3.0. The lesson tests the actual selector call separately.');
      return;
    }
    if (webpackLesson && demo()) {
      el('project').textContent = lessonRevision==='merged'
        ? t('Слияние двух MR. Общий lock-файл не собрался. Проверяем цели из двух веток по версиям и требованиям UI-ветки.',
            'Merged MRs. npm could not produce a merged lockfile. Check both branches’ targets against the UI branch versions and requirements.')
        : t('Исправленная ревизия. Проверяем переход с версий UI-ветки на webpack 5 и CSS-плагин 2.9.0.',
            'Fixed revision. Check the change from the UI branch to webpack 5 and CSS plugin 2.9.0.');
      return;
    }
    el('project').textContent=freshnessLesson ? t('Прямые зависимости UI-ветки с webpack.','Direct dependencies from the webpack UI branch.') : t('Пример с React 18.2.0.','React 18.2.0 example.');
  }
  function syncGoal() {
    let entries;
    try { entries=Object.entries(JSON.parse(el('targets').value)); } catch { entries=[]; }
    const single=entries.length===1 ? entries[0] : [];
    packageChoice.setValue(single[0]);
    el('goal-version').value=single[1] || '';
  }
  function choosePackages(man) {
    const direct=new Map();
    for (const edge of LabPackageCombo.direct(man)) {
      if(edge.group!=='peerDependencies' && !direct.has(edge.name)) direct.set(edge.name,{value:edge.name,detail:edge.range});
    }
    packageChoice.setItems([...direct.values()].sort((a,b)=>a.value.localeCompare(b.value)));
    syncGoal();
  }
  function errorText(err) {
    const messages = {
      files:t('Выберите package.json и соответствующий yarn.lock либо npm lock-файл v1–v3.','Select a package.json and its Yarn lockfile or npm v1–v3 lockfile.'),
      evidence:t('Манифест должен совпадать по имени и версии с целью или установленной прямой зависимостью. Можно выбрать до 20 файлов.', 'Each manifest must match a target or an installed direct dependency by name and version. Select up to 20 files.'),
      'meta-size':t('Манифест целевой версии должен помещаться в 1 МиБ.','Each target manifest can be up to 1 MiB.'),
      size:t('Максимальный размер файла — 20 МиБ.','Each file can be up to 20 MiB.'),
      targets:t('Задайте от 1 до 20 пакетов в виде JSON: {"имя":"1.2.3"}.','Specify 1–20 packages as JSON: {"name":"1.2.3"}.'),
    };
    if (err.message==='targets' && !el('batch-goals').open) return t('Выберите пакет и укажите точную версию, например 1.2.3.','Choose a package and enter an exact version such as 1.2.3.');
    if (err instanceof SyntaxError) return t('Не получилось прочитать JSON. Проверьте файлы и запись цели.','Invalid JSON. Check the files and targets.');
    if (err.message.startsWith('source:')) return t('Нужна установленная обычная npm-зависимость в корне. Проверьте путь и диапазон — ', 'A regular root npm dependency is needed. Check the path and range — ') + err.message.slice(8);
    if (err.message.startsWith('target:')) return t('Проверьте имя прямой зависимости и точную версию — ', 'Check the direct dependency name and exact version — ') + err.message.slice(8);
    return messages[err.message] || t('Не удалось прочитать пакетные данные.','Could not read package data.');
  }
  function add(tag,text) {
    const node = document.createElement(tag); node.textContent = text;
    if (tag==='h2') node.setAttribute('aria-live','polite');
    el('plan-output').append(node); return node;
  }
  async function calculate() {
    reset(); const current = revision;
    try {
      if (!manual() || !project) return;
      const {man,lock}=project;
      el('plan-output').hidden=false;
      const yarn = LabYarn.format(lock.packages);
      const changes = LabPlan.read(man,lock,JSON.parse(el('targets').value));
      const evidence = new Map(demo() ? (webpackLesson ? LabWebpack.records : metadata) : []);
      if (selectorLesson && demo()) {
        const target = SelectorLab.cases.parent;
        evidence.set('css-select@'+target.cssVersion,target.lock.packages[target.cssPath]);
      }
      const fromLock = new Set();
      const byName = new Map(changes.filter(c=>c.publicRegistry).map(c=>[c.name,c]));
      for (const [path,record] of Object.entries(lock.packages)) {
        if (lock.lockfileVersion===1 || !record || !path.includes('node_modules/')) continue;
        const name = record.name || path.split('node_modules/').at(-1);
        if (byName.get(name)?.target !== record.version || !LabLockGraph.publicTarball(record,name)) continue;
        const key = name + '@' + record.version;
        evidence.set(key,record); fromLock.add(key);
      }
      const installed = new Map(), publicClassicPeers = new Set();
      for (const edge of LabLockGraph.declarations(man,true)) {
        const hit=LabLockGraph.lockedPackage(lock.packages,'',edge);
        if(hit && !hit.record.link && treeSemver.valid(hit.record.version)) {
          installed.set(edge.name,hit.record.version);
          if(yarn==='Yarn Classic' && LabYarn.identity(lock.packages,hit.key)===edge.name) publicClassicPeers.add(edge.name);
        }
      }
      const local = new Map(confirmed);
      const uploaded = new Set();
      const files = Array.from(el('meta-files').files);
      if (files.length > 20) throw Error('evidence');
      if (files.some(file => file.size > 1024*1024)) throw Error('meta-size');
      for (const file of files) {
        const record = JSON.parse(await file.text());
        if (current !== revision) return;
        if (!record?.name || typeof record.version!=='string' || (!changes.some(c=>c.name === record.name && c.target === record.version) && installed.get(record.name)!==record.version)) throw Error('evidence');
        const key = record.name+'@'+record.version;
        if (uploaded.has(key)) throw Error('evidence');
        uploaded.add(key);local.set(key,record);
      }
      const result = yarn ? LabPlan.assessYarn(man,lock,changes,evidence,local) : LabPlan.assess(lock,changes,evidence,local);
      const missing = changes.filter(c => c.record.version !== c.target && !local.has(c.name+'@'+c.target) && (!c.publicRegistry || !evidence.has(c.name+'@'+c.target)));
      const notFound = missing.filter(c=>absent.has(c.name+'@'+c.target));
      add('h2',notFound.length ? (hosted ? t('В снимке Nexus нет записи версии','Version record absent from the Nexus snapshot') : t('Выбранный реестр не нашёл запись версии','The selected registry did not find the version record')) :
        result.issues.length ? t('Для обновления нужна ещё одна правка','Another change is needed') :
        missing.length ? t('У цели пока неизвестны требования','Target requirements are unknown') :
        result.unknown.length ? t('Цель проверена частично','Target partially checked') :
        t('В проверенных требованиях конфликтов нет','No conflicts in the checked requirements'));
      if(notFound.length) {
        add('p',notFound.map(c=>c.name+'@'+c.target).join(', ')+' · '+(hosted ? snapshotSource : registryAddress()+t(' вернул 404. Уточните версию или загрузите её package.json.',' returned 404. Edit the target or supply its package.json.')));
        if(hosted) localDownload();
      }

      for(const item of hosted ? [] : notFound) {
        const link=add('a',t('Посмотреть опубликованные версии ','See published releases of ')+item.name);
        link.href=LabRegistry.url(item.name);
        link.rel='noreferrer';
      }
      for (const change of changes) {
        for (const group of change.groups) {
          const range = man[group][change.name];
          if (!treeSemver.satisfies(change.record.version,range)) {
            add('p',t('Исходные файлы уже расходятся: ','The inputs already disagree: ') + group + '.' + change.name +
              ' ' + range + ' ↔ ' + change.record.version + ' (lock).');
          }
        }
        add('p',t('Ваша цель · ','Your target · ') + change.name + ' ' + change.record.version + ' → ' + change.target);
      }
      if(lock.lockfileVersion===1) add('p',t('В npm lock v1 нет peer-требований установленных пакетов. Для проверки нужны их манифесты.','npm lock v1 omits installed packages’ peer requirements. Their manifests provide those requirements.'));
      if(demo()) LabCriterionPlan.showReactCheck(el('plan-output'),changes);
      if (result.unknown.length && !notFound.length) add('p',hosted
        ? t('Добавьте локальный package.json нужной библиотеки, чтобы проверить её peer-требования.','Add the library’s package.json from disk to check its peer requirements.')
        : yarn==='Yarn Classic'
        ? t('Yarn Classic хранит версии, но обычно опускает peerDependencies. Требования можно прочитать из выбранного реестра или из package.json библиотеки.', 'Yarn Classic records versions and usually omits peerDependencies. Read those requirements from the selected registry or from the library’s package.json.')
        : t('Для части пакетов не хватает требований. Добавьте манифесты библиотек или запросите версии в выбранном реестре.', 'Some requirements are missing. Supply package manifests or look up releases in the selected registry.'));
      const lines = document.createElement('ul');
      for (const [rows,mark] of [[result.issues,'✗'],[result.checks,'✓']]) {
        for (const row of rows.slice(0,100)) {
          const li = document.createElement('li');
          const consumer = lesson && demo() && row.path.startsWith('node_modules/')
            ? row.path.slice('node_modules/'.length) : null;
          const owner = consumer ? consumer + '@' + (changes.find(c=>c.name===consumer)?.target || lock.packages[row.path].version) : row.path;
          li.textContent = mark + ' ' + owner + ' → peer ' + row.name + '@' + row.range + ' · ' + (row.version || t('нет провайдера','missing provider'));
          lines.append(li);
        }
      }
      if(lines.childElementCount) el('plan-output').append(lines);
      if(result.unknown.length) {
        const detail=add('details',''),summary=document.createElement('summary'),list=document.createElement('ul');
        summary.textContent=t('Не удалось проверить · ','Unchecked entries · ')+result.unknown.length;
        for(const path of result.unknown){const li=document.createElement('li');li.textContent=path;list.append(li);}
        detail.append(summary,list);
      }
      const sources = new Set([selectorLesson && demo() ? t('сохранённый lock-файл этой ревизии и запись css-select@4.3.0 из lock-файла новой пары','the selected revision’s saved lockfile and the css-select@4.3.0 entry in the new pair’s lockfile') : webpackLesson && demo() ? t('прямые зависимости из lock-файла UI-ветки и сохранённые требования целевых пакетов','direct UI-branch lock entries and saved target package requirements') : demo() ? t('учебный lock-файл','sample lockfile') : t('ваши package.json и lock-файл','your package.json and lockfile')]);
      if (confirmed.size) sources.add(hosted ? snapshotSource : t('метаданные выбранных версий из ','metadata from ')+registryAddress());
      if (uploaded.size) sources.add(t('загруженные манифесты целевых версий','uploaded target manifests'));
      for (const {name,target,record,publicRegistry} of changes) {
        const key = name + '@' + target;
        if (publicRegistry && !local.has(key) && !fromLock.has(key) && record.version !== target && evidence.has(key)) sources.add(recorded.has(key) ? t('сохранённые требования React из npm','saved React metadata from npm') : t('ответ npm для целевой версии','npm response for target version'));
      }
      add('p',t('Источник — ','Source — ') + [...sources].join(', ') + '.').className = 'hint';
      if (selectorLesson && demo()) {
        add('a',t('Проверить селектор в этой ревизии','Test the selector in this revision')).href =
          ReviewExample.link('override.html','selector',ReviewExample.revision);
      }
      if (result.issues.length) add('p',t('Посмотрите на диапазон после peer. Добавьте совместимую версию соседа в цель либо пересмотрите исходное обновление.','Look at the range after peer. Add a compatible neighbour version to the targets or reconsider the original upgrade.'));
      const suggested = new Set();
      for (const row of result.issues) {
        const name = row.name;
        if (suggested.has(name) || changes.some(c => c.name === name)) continue;
        const direct = ['dependencies','optionalDependencies','devDependencies'].some(group => Object.hasOwn(man[group] || {},name));
        const owner = row.path === '.' ? '' : row.path;
        const installed = !yarn && LabLockGraph.lockedPackage(lock.packages,owner,{name,group:'peerDependencies'});
        if (!direct || (!yarn && installed?.key !== 'node_modules/'+name)) continue;
        const target = row.range.replace(/^[~^]/,'');
        if (treeSemver.valid(target) !== target || !treeSemver.satisfies(target,row.range)) continue;
        suggested.add(name);
        const btn = add('button',t('Проверить в плане ','Try in the plan: ') + name + '@' + target);
        btn.onclick = () => {
          el('targets').value = JSON.stringify({...JSON.parse(el('targets').value),[name]:target},null,2);
          syncGoal();el('batch-goals').open=true;calculate();
        };
      }
      const missingTargets = missing.filter(c=>!absent.has(c.name+'@'+c.target));
      const publicHost=!hosted && registryAddress()===LabRegistry.defaultBase;
      const options=missingTargets.map(change=>{
        const publicOrigin=yarn!=='Yarn Berry' && change.publicRegistry;
        const key=change.name+'@'+change.target;
        return {key,label:key,publicOrigin,selected:!publicHost || publicOrigin,change};
      });
      const unknownNames = new Set(result.unknown.map(path=>LabYarn.parts(path)?.name));
      if (yarn==='Yarn Classic') for (const [name,target] of installed) {
        const key=name+'@'+target;
        if(!unknownNames.has(name) || changes.some(c=>c.name===name) || local.has(key) || absent.has(key)) continue;
        options.push({key,label:key,publicOrigin:publicClassicPeers.has(name),selected:false,change:{name,target}});
      }
      if(options.length) {
        el('network').hidden=false;
        if(hosted) el('lookup').textContent=t('Проверить по снимку Nexus','Check the Nexus snapshot');
        el('send-host').textContent=hosted ? t('Имена и версии будут найдены на устройстве по общему снимку Nexus с этой страницы.','Names and versions are matched on this device in the shared Nexus snapshot from this site.') :
          t('При нажатии в реестр уйдут выбранные имена и версии. Адрес — ','Clicking sends selected names and versions to ')+(registryAddress() || t('проверьте адрес реестра','check the registry address'));
        const picker=LabPackagePicker.mount(el('lookup-packages'),{
          items:options,publicDestination:publicHost ? registryAddress() : null,
          onChange:ready=>{el('lookup').disabled=!!active || !ready;},
        });
        el('lookup').onclick=()=>{
          const selected=picker.values();
          if(!selected.length || active || current!==revision)return;
          el('lookup-packages').inert=true;
          lookup(selected.map(item=>item.change),current);
        };
      }
    } catch (err) { if (current === revision) {el('plan-output').hidden=false;add('p',errorText(err));} }
  }
  async function lookup(changes,current) {
    if (!changes.length || active || current !== revision) return;
    el('lookup').disabled = true;
    const ctrl = new AbortController(); active = ctrl;

    el('net-status').textContent=t('Запрашиваю выбранные версии…','Looking up selected releases…');
    const failures = new Set();
    if(hosted) {
      try {
        const snapshot=await LabRegistry.releases(ctrl.signal);
        if(current!==revision)return;
        snapshotSource=t('снимок Nexus от ','Nexus snapshot dated ')+new Date(snapshot.published*1000).toISOString().slice(0,10)+' UTC';
      } catch(err) {
        if(current!==revision)return;
        active=undefined;el('lookup-packages').inert=false;el('lookup').disabled=false;el('net-status').textContent=LabRegistry.message(err);
        const link=document.createElement('a');link.textContent=t('Скачать локальную версию','Download the local lab');
        link.href=Lab.urlFor('index.html#local-download');el('net-status').append(' ',link);return;
      }
    }
    for (const {name,target} of changes) {
        if (ctrl.signal.aborted || current!==revision) return;
        try {
          const data = await LabRegistry.manifest(name,target,ctrl.signal);
          if (data?.name !== name || data.version !== target) throw Error('metadata');
          if (current !== revision) return;
          confirmed.set(name + '@' + target,data);
        } catch (err) {
          if (current!==revision) return;
          if (err.status===404) absent.add(name+'@'+target);
          else {
            failures.add(LabRegistry.message(err));
            if(!hosted && err instanceof TypeError)break;
          }
        }
    }
    if (current !== revision) return;
    await calculate();
    if (failures.size && current+1 === revision) {
      add('p',[...failures].join(' '));if(hosted)localDownload();
    }
  }
  function manualButton() {
    el('make-plan').disabled=!project || !el('targets').value.trim() || el('targets').value.trim()==='{}';
  }
  function changeSingleGoal() {
    const name=el('goal-package').value.trim(),version=el('goal-version').value.trim();
    el('targets').value=JSON.stringify(name && version ? {[name]:version} : {});
    confirmed.clear();absent.clear();reset();manualButton();
  }
  function configure() {
    reset();
    const button=el('make-plan'), options=el('plan-options');
    options.replaceChildren();options.hidden=true;
    button.disabled=true;button.onclick=null;
    el('manual-goal').hidden=el('manual-options').hidden=!manual();
    el('plan-goal-label').textContent=manual() ? t('Цель обновления','Upgrade goal') : t('Цель по свежести прямых зависимостей','Freshness goal for direct dependencies');
    caption();
    if (!project) return;
    if (manual()) {
      button.onclick=calculate;
      manualButton();
      return;
    }
    active=new AbortController();
    try {
      LabCriterionPlan.prepare({output:el('plan-output'),options,button,progress:el('plan-status'),
        man:project.man,lock:project.lock,level:el('plan-mode').value,sample:demo() && (freshnessLesson || !!webpackLesson),signal:active.signal});
    } catch (err) { el('project').textContent=errorText(err); }
  }
  async function readProject() {
    const ticket=++fileRevision;
    project=null;fileError='';
    confirmed.clear();absent.clear();
    choosePackages(null);configure();
    try {
      const [man,lock]=await Promise.all([
        manifestFile ? manifestFile.text().then(text=>JSON.parse(text.replace(/^\uFEFF/,''))) : demo() ? exampleData.manifest : null,
        lockFile ? lockFile.text().then(LabYarn.read) : demo() ? exampleData.lock : null,
      ]);
      if(ticket!==fileRevision)return;
      choosePackages(man);
      if(man && lock) project={man,lock:LabYarn.withManifest(lock,man)};
    } catch (err) {
      if(ticket!==fileRevision)return;
      fileError=errorText(err);
    }
    configure();
    if (demo() && manual() && el('targets').value!=='{}') await calculate();
  }
  window.addEventListener('lab-project',({detail})=>{
    manifestFile=detail?.manifest || null;
    lockFile=detail?.lock || null;
    if (detail?.changedSlot!=='lock') {
      el('meta-files').value='';
      el('targets').value='{}';
    }
    readProject();
  });
  el('plan-mode').onchange=configure;
  el('targets').addEventListener('input',()=>{syncGoal();confirmed.clear();absent.clear();reset();manualButton();});
  el('goal-version').addEventListener('input',changeSingleGoal);
  el('meta-files').addEventListener('input',()=>{confirmed.clear();absent.clear();reset();manualButton();});
  el('plan-mode').value=lesson || reactLesson ? 'manual' : 'yellow';
  el('targets').value=JSON.stringify(initialTargets,null,2);
  readProject();
})();
