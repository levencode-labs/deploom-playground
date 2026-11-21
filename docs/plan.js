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
  let active, revision = 0;

  function reset() {
    revision++;
    active?.abort(); active = undefined;
    el('network').hidden = true; el('lookup').disabled = true;
    el('net-status').textContent = '';
    el('plan-output').replaceChildren();
  }
  const manifestFile = () => el('manifest-file').files[0];
  const lockFile = () => el('lock-file').files[0];
  const demo = () => !manifestFile() && !lockFile();
  function caption() {
    el('project').textContent = demo() ?
      t('Сейчас открыт пример с React 18.2.0. Чтобы взять свой проект, выберите оба файла.','The React 18.2.0 example is open. Select both files to use your project.') :
      t('Выбранные файлы читаются только в браузере.','Selected files are read only in this browser.');
  }
  function syncGoal() {
    let entries;
    try { entries=Object.entries(JSON.parse(el('targets').value)); } catch { entries=[]; }
    const single=entries.length===1 ? entries[0] : [];
    el('goal-package').value=single[0] || '';
    el('goal-version').value=single[1] || '';
  }
  async function choosePackages() {
    const file=manifestFile();
    let man=manifest;
    if(file) {
      try { man=file.size<=20*1024*1024 ? JSON.parse(await file.text()) : {}; } catch { man={}; }
      if(file!==manifestFile()) return;
    }
    const names=new Set([...LabLockGraph.declarations(man || {},true)].filter(e=>e.group!=='peerDependencies').map(e=>e.name));
    el('goal-package').replaceChildren(new Option(t('Выберите пакет','Choose a package'),''), ...[...names].sort().map(name=>new Option(name,name)));
    syncGoal();
  }
  function errorText(err) {
    const messages = {
      files:t('Выберите package.json и соответствующий yarn.lock либо npm lock-файл v3.','Select a package.json and its Yarn lockfile or npm v3 lockfile.'),
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
    const node = document.createElement(tag); node.textContent = text; el('plan-output').append(node); return node;
  }
  async function calculate() {
    reset(); const current = revision;
    try {
      let man = manifest, lock = sample;
      if (!demo()) {
        const files = [manifestFile(),lockFile()];
        if (!files.every(Boolean)) throw Error('files');
        if (files.some(file => file.size > 20*1024*1024)) throw Error('size');
        [man,lock] = await Promise.all([files[0].text().then(JSON.parse), files[1].text().then(LabYarn.read)]);
      }
      if (current !== revision) return;
      const yarn = LabYarn.format(lock.packages);
      const changes = LabPlan.read(man,lock,JSON.parse(el('targets').value));
      const evidence = new Map(metadata);
      const fromLock = new Set();
      const byName = new Map(changes.filter(c=>c.publicRegistry).map(c=>[c.name,c]));
      for (const [path,record] of Object.entries(lock.packages)) {
        if (!record || !path.includes('node_modules/')) continue;
        const name = record.name || path.split('node_modules/').at(-1);
        if (byName.get(name)?.target !== record.version || !LabLockGraph.publicTarball(record,name)) continue;
        const key = name + '@' + record.version;
        evidence.set(key,record); fromLock.add(key);
      }
      const installed = new Map();
      for (const edge of LabLockGraph.declarations(man,true)) {
        const hit=LabLockGraph.lockedPackage(lock.packages,'',edge);
        if(hit && !hit.record.link && treeSemver.valid(hit.record.version)) installed.set(edge.name,hit.record.version);
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
      add('h2',notFound.length ? t('Такой версии нет в публичном npm','Release not found in public npm') :
        result.issues.length ? t('Для обновления нужна ещё одна правка','Another change is needed') :
        missing.length ? t('У цели пока неизвестны требования','Target requirements are unknown') :
        result.unknown.length ? t('Цель проверена частично','Target partially checked') :
        t('В проверенных требованиях конфликтов нет','No conflicts in the checked requirements'));
      if(notFound.length) add('p',notFound.map(c=>c.name+'@'+c.target).join(', ')+t(' · npmjs вернул 404. Уточните версию в цели. Для внутренней сборки загрузите её package.json.',' · npmjs returned 404. Edit the target version, or supply its package.json for an internal build.'));

      for(const item of notFound) {
        const link=add('a',t('Посмотреть опубликованные версии ','See published releases of ')+item.name);
        link.href='https://www.npmjs.com/package/'+item.name+'?activeTab=versions';
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
      if (result.unknown.length && !notFound.length) add('p',yarn==='Yarn Classic'
        ? t('Yarn Classic хранит версии, но обычно опускает peerDependencies. Требования можно прочитать из npmjs или из package.json библиотеки.', 'Yarn Classic records versions and usually omits peerDependencies. Read those requirements from npmjs or from the library’s package.json.')
        : t('Для части пакетов не хватает требований. Добавьте манифесты библиотек или запросите выбранные версии в npmjs.', 'Some requirements are missing. Supply package manifests or look up selected versions in npmjs.'));
      const lines = document.createElement('ul');
      for (const [rows,mark] of [[result.issues,'✗'],[result.checks,'✓']]) {
        for (const row of rows.slice(0,100)) {
          const li = document.createElement('li');
          li.textContent = mark + ' ' + row.path + ' → peer ' + row.name + '@' + row.range + ' · ' + (row.version || t('нет провайдера','missing provider'));
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
      const sources = new Set([demo() ? t('учебный lock-файл','sample lockfile') : t('ваши package.json и lock-файл','your package.json and lockfile')]);
      if (confirmed.size) sources.add(t('метаданные выбранных версий из npmjs','npmjs metadata for selected releases'));
      if (uploaded.size) sources.add(t('загруженные манифесты целевых версий','uploaded target manifests'));
      for (const {name,target,record,publicRegistry} of changes) {
        const key = name + '@' + target;
        if (publicRegistry && !local.has(key) && !fromLock.has(key) && record.version !== target && metadata.has(key)) sources.add(recorded.has(key) ? t('сохранённые требования React из npm','saved React metadata from npm') : t('ответ npm для целевой версии','npm response for target version'));
      }
      add('p',t('Источник — ','Source — ') + [...sources].join(', ') + '.').className = 'hint';
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
      const targets = missing.filter(c=>!absent.has(c.name+'@'+c.target));
      const peers = [];
      const unknownNames = new Set(result.unknown.map(path=>LabYarn.parts(path)?.name));
      if (yarn==='Yarn Classic') for (const [name,target] of installed) {
        if(changes.some(c=>c.name===name) || local.has(name+'@'+target) || absent.has(name+'@'+target)) continue;
        if(unknownNames.has(name)) peers.push({name,target});
      }
      if(targets.length || peers.length) {
        el('network').hidden=false;
        el('send-list').textContent=targets.length ? t('Цели · ','Targets · ')+targets.map(c=>c.name+'@'+c.target).join(', ') : '';
        el('peer-picks').hidden=!peers.length;
        el('peer-count').textContent=t('Добавить требования других прямых зависимостей · ','Include requirements of other direct dependencies · ')+peers.length;
        el('peer-options').replaceChildren();
        const selected=new Set();
        for(const peer of peers) {
          const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';
          label.append(box,' '+peer.name+'@'+peer.target);el('peer-options').append(label);
          box.onchange=()=>{if(box.checked)selected.add(peer);else selected.delete(peer);el('lookup').disabled=!!active || !targets.length && !selected.size;};
        }
        el('lookup').disabled=!targets.length;
        el('lookup').onclick=()=>lookup([...targets,...selected],current);
      }
    } catch (err) { if (current === revision) add('p',errorText(err)); }
  }
  async function lookup(changes,current) {
    if (!changes.length || active || current !== revision) return;
    el('lookup').disabled = true;
    const ctrl = new AbortController(); active = ctrl;
    const timer = setTimeout(()=>ctrl.abort(),25000);
    el('net-status').textContent=t('Запрашиваю выбранные версии…','Looking up selected releases…');
    let failures = 0;
    try {
      for (const {name,target} of changes) {
        try {
          const url = 'https://registry.npmjs.org/' + encodeURIComponent(name) + '/' + encodeURIComponent(target);
          const response = await fetch(url,{signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
          if (current !== revision) return;
          if (response.status===404) {absent.add(name+'@'+target);continue;}
          if (!response.ok) throw Error('registry');
          const data = await response.json();
          if (data?.name !== name || data.version !== target) throw Error('metadata');
          if (current !== revision) return;
          confirmed.set(name + '@' + target,data);
        } catch { failures++; }
      }
    } finally { clearTimeout(timer); }
    if (current !== revision) return;
    await calculate();
    if (failures && current+1 === revision) add('p',t('npm не вернул метаданные для части целей. Они остаются непроверенными.','npm did not return metadata for some targets. They remain unverified.'));
  }
  for (const id of ['manifest-file','lock-file','meta-files','targets']) el(id).addEventListener('input',()=>{confirmed.clear();absent.clear();reset();caption();});
  el('manifest-file').addEventListener('change',()=>{
    el('targets').value='{}';choosePackages();
  });
  el('targets').addEventListener('input',syncGoal);
  for(const id of ['goal-package','goal-version']) el(id).addEventListener('input',()=>{
    const name=el('goal-package').value,version=el('goal-version').value.trim();
    el('targets').value=JSON.stringify(name && version ? {[name]:version} : {});
    confirmed.clear();absent.clear();reset();
  });
  el('sample').onclick = () => {
    confirmed.clear();absent.clear();el('manifest-file').value = ''; el('lock-file').value = ''; el('meta-files').value = '';
    el('targets').value = '{"react-dom": "18.3.1"}'; el('batch-goals').open=false;choosePackages();caption();calculate();
  };
  el('make-plan').onclick = calculate;
  choosePackages();caption();calculate();
})();
