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
    el('network').hidden = true; el('public-ok').checked = false; el('lookup').disabled = true;
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
  function errorText(err) {
    const messages = {
      files:t('Выберите package.json и корневой package-lock.json версии 3.','Select a package.json and its root version 3 package-lock.json.'),
      evidence:t('Выберите до 20 манифестов целевых пакетов. Имя и точная версия каждого должны совпадать с одной из целей.', 'Select up to 20 target package manifests. Each name and exact version must match a target.'),
      'meta-size':t('Манифест целевой версии должен помещаться в 1 МиБ.','Each target manifest can be up to 1 MiB.'),
      size:t('Максимальный размер файла — 20 МиБ.','Each file can be up to 20 MiB.'),
      targets:t('Задайте от 1 до 20 пакетов в виде JSON: {"имя":"1.2.3"}.','Specify 1–20 packages as JSON: {"name":"1.2.3"}.'),
    };
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
        [man,lock] = await Promise.all(files.map(async file => JSON.parse(await file.text())));
      }
      if (current !== revision) return;
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
      const local = new Map();
      const files = Array.from(el('meta-files').files);
      if (files.length > 20) throw Error('evidence');
      if (files.some(file => file.size > 1024*1024)) throw Error('meta-size');
      for (const file of files) {
        const record = JSON.parse(await file.text());
        if (current !== revision) return;
        if (!changes.some(c=>c.name === record?.name && c.target === record.version)) throw Error('evidence');
        const key = record.name+'@'+record.version;
        if (local.has(key)) throw Error('evidence');
        local.set(key,record);
      }
      const result = LabPlan.assess(lock,changes,evidence,local);
      add('h2',t('Предлагаемые изменения','Proposed changes'));
      for (const change of changes) {
        for (const group of change.groups) {
          const range = man[group][change.name];
          if (!treeSemver.satisfies(change.record.version,range)) {
            add('p',t('Исходные файлы уже расходятся: ','The inputs already disagree: ') + group + '.' + change.name +
              ' ' + range + ' ↔ ' + change.record.version + ' (lock).');
          }
        }
        add('p',change.groups.map(group => group + '.' + change.name).join(', ') + ' · ' + change.record.version + ' → ' + change.target);
      }
      const labels = [t('Совместимые требования','Matching requirements'),t('Конфликты','Conflicts'),t('Нет данных','Unknown')];
      add('h3',labels.map((label,i) => label + ' · ' + [result.checks,result.issues,result.unknown][i].length).join('   /   '));
      const lines = document.createElement('ul');
      for (const [rows,mark] of [[result.issues,'✗'],[result.checks,'✓']]) {
        for (const row of rows.slice(0,100)) {
          const li = document.createElement('li');
          li.textContent = mark + ' ' + row.path + ' → peer ' + row.name + '@' + row.range + ' · ' + (row.version || t('нет провайдера','missing provider'));
          lines.append(li);
        }
      }
      for (const path of result.unknown.slice(0,100)) {
        const li = document.createElement('li'); li.textContent = '? ' + path; lines.append(li);
      }
      el('plan-output').append(lines);
      if ([result.checks,result.issues,result.unknown].some(list => list.length>100)) add('p',t('Показаны первые 100 строк каждой группы.','Showing the first 100 entries in each group.'));
      const sources = new Set([demo() ? t('учебный lock-файл','sample lockfile') : t('ваши package.json и lock-файл','your package.json and lockfile')]);
      if (local.size) sources.add(t('загруженные манифесты целевых версий','uploaded target manifests'));
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
        const installed = LabLockGraph.lockedPackage(lock.packages,owner,{name,group:'peerDependencies'});
        if (!direct || installed?.key !== 'node_modules/'+name) continue;
        const target = row.range.replace(/^[~^]/,'');
        if (treeSemver.valid(target) !== target || !treeSemver.satisfies(target,row.range)) continue;
        suggested.add(name);
        const btn = add('button',t('Проверить в плане ','Try in the plan: ') + name + '@' + target);
        btn.onclick = () => {
          el('targets').value = JSON.stringify({...JSON.parse(el('targets').value),[name]:target},null,2);
          calculate();
        };
      }
      const missing = changes.filter(c => c.record.version !== c.target && !local.has(c.name+'@'+c.target) && (!c.publicRegistry || !evidence.has(c.name+'@'+c.target)));
      const allowed = missing.filter(c => c.publicRegistry);
      if (missing.length > allowed.length) add('p',t('Для части пакетов lock-файл не подтверждает источник registry.npmjs.org. Требования этих целевых версий неизвестны.','Some lock entries have no confirmed registry.npmjs.org origin. Their target metadata is unknown.'));
      if (allowed.length) {
        el('network').hidden = false;
        el('send-list').textContent = allowed.map(c=>c.name + '@' + c.target).join('\n');
        el('lookup').onclick = () => lookup(allowed,current);
      }
    } catch (err) { if (current === revision) add('p',errorText(err)); }
  }
  async function lookup(changes,current) {
    if (!el('public-ok').checked || current !== revision) return;
    el('lookup').disabled = true;
    const ctrl = new AbortController(); active = ctrl;
    const timer = setTimeout(()=>ctrl.abort(),25000);
    let failures = 0;
    try {
      for (const {name,target} of changes) {
        try {
          const url = 'https://registry.npmjs.org/' + encodeURIComponent(name) + '/' + encodeURIComponent(target);
          const response = await fetch(url,{signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});
          if (!response.ok) throw Error('registry');
          const data = await response.json();
          if (data?.name !== name || data.version !== target) throw Error('metadata');
          if (current !== revision) return;
          metadata.set(name + '@' + target,data);
        } catch { failures++; }
      }
    } finally { clearTimeout(timer); }
    if (current !== revision) return;
    await calculate();
    if (failures && current+1 === revision) add('p',t('npm не вернул метаданные для части целей. Они остаются непроверенными.','npm did not return metadata for some targets. They remain unverified.'));
  }
  for (const id of ['manifest-file','lock-file','meta-files','targets']) el(id).addEventListener('input',()=>{reset();caption();});
  el('sample').onclick = () => {
    el('manifest-file').value = ''; el('lock-file').value = ''; el('meta-files').value = '';
    el('targets').value = '{"react-dom": "18.3.1"}'; caption(); calculate();
  };
  el('public-ok').onchange = () => {el('lookup').disabled = !!active || !el('public-ok').checked;};
  el('make-plan').onclick = calculate;
  caption(); calculate();
})();
