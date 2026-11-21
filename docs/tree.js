'use strict';

(() => {
  const lang = window.Lab?.lang ?? (new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ru');
  const t = (ru, en) => lang === 'en' ? en : ru;
  const $ = id => document.getElementById(id);
  const manifestInput = $('tree-manifest');
  let lockText = '', sampleOpen = false, editorChanged = false;
  let parsedText, parsedLock, mapRootKey;
  const legacyLocks = new WeakSet();
  const limit = { chars: 8_000_000, edges: 240, depth: 12 };
  const { groupKeys, usableName, declarations, lockedPackage } = LabLockGraph;
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const has = (obj, key) => Object.hasOwn(obj, key);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const builtIn = new Map([
    ['react@18.2.0', {}], ['react@18.3.1', {}],
    ['react-dom@18.2.0', { peerDependencies: { react: '^18.2.0' } }],
    ['react-dom@18.3.1', { peerDependencies: { react: '^18.3.1' } }],
  ]);
  let registry = new Map();
  let currentManifest = null;
  let request = null;
  let timer;
  let projectRevision = 0;
  let graph;

  function parseJson(raw, fragment) {
    if (raw.length > limit.chars) throw Error(t('Лимит поля — 8 млн символов.', 'The input limit is 8 million characters.'));
    const trimmed = raw.trim();
    if (!trimmed) throw Error(t('Добавьте package.json.', 'Add a package.json.'));
    return JSON.parse(fragment && trimmed.startsWith('"') ? '{' + trimmed + '}' : trimmed);
  }

  function readManifest() {
    let value = parseJson(manifestInput.value, true);
    if (!object(value)) throw Error(t('package.json должен быть объектом JSON.', 'package.json must be a JSON object.'));
    if (!groupKeys.some(k => has(value, k)) && !['name', 'version', 'scripts', 'private', 'workspaces'].some(k => has(value, k))) {
      value = { dependencies: value };
    }
    for (const section of groupKeys) {
      if (!has(value, section)) continue;
      if (!object(value[section])) throw Error(section + t(' должен быть объектом.', ' must be an object.'));
      for (const [name, range] of Object.entries(value[section])) {
        if (!usableName(name) || typeof range !== 'string') throw Error(section + t(' должен содержать имена пакетов и строковые диапазоны.', ' must contain package names and string ranges.'));
      }
    }
    return value;
  }

  function readLock() {
    if (!lockText.trim()) return null;
    if (lockText === parsedText) return parsedLock;
    if (lockText.length > limit.chars) throw Error(t('Лимит поля — 8 млн символов.', 'Input limit: 8 million characters.'));
    let value;
    try { value = LabYarn.read(lockText); }
    catch { throw Error(t('Не удалось прочитать lock-файл. Проверьте формат и маркеры конфликта Git.', 'Cannot read this lockfile. Check its format and Git conflict markers.')); }
    if (value.lockfileVersion === 1) legacyLocks.add(value.packages);
    parsedText = lockText; parsedLock = value.packages;
    return parsedLock;
  }

  function graphRoot(packages) {
    mapRootKey = '';
    if (manifestInput.value.trim() || !packages) return readManifest();
    if (!LabYarn.format(packages)) {
      if (legacyLocks.has(packages)) {mapRootKey=null; return {};} // Hoisted v1 entries do not identify direct declarations.
      return packages[''];
    }
    const workspace = Object.keys(packages).find(key => packages[key].resolution?.endsWith?.('@workspace:.'));
    mapRootKey = workspace ?? null;
    return workspace ? {...packages[workspace], name:LabYarn.parts(workspace).name, mapSource:'yarn.lock'} : {};
  }

  let lockPackages;
  let availableCopies = [];

  function installedEntries(packages) {
    const entries = [];
    if (LabYarn.format(packages)) return Object.entries(packages).filter(([key])=>key).map(([key,record])=>({
      path:key, name:LabYarn.parts(key).name, label:LabYarn.parts(key).name+'@'+record.version
    }));
    // Only paths composed of package names can become a terminal command.
    const safePath = /^node_modules\/(?:@[a-z\d~][a-z\d._~-]*\/)?[a-z\d~][a-z\d._~-]*(?:\/node_modules\/(?:@[a-z\d~][a-z\d._~-]*\/)?[a-z\d~][a-z\d._~-]*)*$/i;
    for (const [path, record] of Object.entries(packages)) {
      if (!safePath.test(path) || !object(record) || record.link) continue;
      const name = path.split('node_modules/').pop();
      entries.push({ path, label: name + (typeof record.version === 'string' ? '@' + record.version : ''), name });
    }
    return entries;
  }

  function commandFor(path) {
    const copy=availableCopies.find(item=>item.path===path);
    if (!copy) return '';
    const yarn=LabYarn.format(lockPackages);
    return yarn ? (yarn==='Yarn Classic'?'yarn why ':'yarn why -R ')+copy.name : 'npm explain "'+path+'"';
  }
  function resolver(manifest, packages) {
    const roots = [...declarations(manifest, true)];
    const assignments = new Map();
    for (const edge of roots) {
      const version = treeSemver.valid(edge.range);
      if (!assignments.has(edge.name)) assignments.set(edge.name, version);
      else if (assignments.get(edge.name) !== version) assignments.set(edge.name, null);
    }
    return (owner, edge) => {
      let key, record, version, reason = '', state = 'unknown';
      if (packages) {
        const match = lockedPackage(packages, owner, edge);
        if (match && object(match.record) && !match.record.link) {
          key = match.key; record = match.record;
          version = typeof record.version === 'string' ? record.version : undefined;
        } else if (LabYarn.format(packages) && edge.group === 'peerDependencies') {
          reason = t('Поставщик peer зависит от окружения установки Yarn.', 'Peer provider depends on the Yarn install environment.');
        } else if (match?.record?.link) {
          reason = t('Локальная ссылка или workspace. Ветка требует отдельной проверки.', 'Local link or workspace. Check this branch separately.');
        } else {
          reason = edge.optional ? t('Необязательная запись отсутствует.', 'Optional entry is absent.')
            : t('В доступной ветке lock-файла нет записи.', 'No matching record at this location in the lockfile.');
        }
      } else {
        if (!owner) version = treeSemver.valid(edge.range) || undefined;
        if (owner && edge.group === 'peerDependencies') version = assignments.get(edge.name) || undefined;
        if (version) {
          key = edge.name + '@' + version;
          record = registry.get(key) ?? builtIn.get(key);
        }
        if (!version) reason = t('Точная версия неизвестна. Добавьте lock-файл.', 'The exact version is unknown. Add a lockfile.');
        else if (!record) reason = t('Версия задана в манифесте. Для проверки её зависимостей нужны метаданные.', 'Version pinned in the manifest. Its dependencies need package metadata.');
      }
      const constraint = LabYarn.format(packages) ? edge.range.replace(/^npm:/,'') : edge.range;
      if (version && treeSemver.valid(version) && treeSemver.validRange(constraint) !== null) {
        const matches = treeSemver.satisfies(version, constraint);
        if (packages || (owner && edge.group === 'peerDependencies')) {
          if (matches) state = 'good';
          else {
            state = 'bad';
            reason = version + t(' вне диапазона ', ' is outside ') + constraint + '.';
          }
        } else if (!reason) reason = t('Зафиксировано в package.json.', 'Pinned in package.json.');
      } else if (version) reason = t('Требование или версия вне формата semver.', 'The requirement or version is outside semver.');
      else if (!reason) reason = t('У записи нет точной версии.', 'No exact version in this record.');
      return { key, record, version, state, reason };
    };
  }

  function buildGraph(manifest, assess, overrides) {
    const seen = new Set();
    const roots = [...declarations(manifest, true)];
    const result = { nodes: [], bad: 0, good: 0, unknown: 0, total: 0, clipped: false };
    function walk(edges, owner, ancestors, depth, context) {
      const nodes = [];
      for (const edge of edges) {
        if (result.total >= limit.edges || depth > limit.depth) { result.clipped = true; break; }
        result.total++;
        const base = assess(owner, edge);
        let { key, record, version, state, reason } = overrides ? overrides.check(base,edge.name,edge.range,context) : base;
        result[state]++;
        const children = [];
        if (key && record) {
          const nextContext = overrides?.downstream(context,edge.name,version,edge.range);
          const visit = overrides ? JSON.stringify([key,...[...nextContext].map(scope=>scope.id).sort((a,b)=>a-b)]) : key;
          let note = '';
          if (ancestors.has(key)) note = t('Цикл. Этот пакет уже есть выше в этой ветке.', 'Cycle. This package already appears on this path.');
          else if (seen.has(visit)) note = t('Эта запись уже раскрыта в другой ветке.', 'This entry is already expanded elsewhere.');
          else {
            seen.add(visit);
            const next = new Set(ancestors); next.add(key);
            children.push(...walk(declarations(record, false), key, next, depth + 1,nextContext));
          }
          if (note) reason = [reason,note].filter(Boolean).join(' ');
        }
        const node = { ...edge, state, version, reason, children, key, hasConflict: state === 'bad' || children.some(n => n.hasConflict) };
        nodes.push(node);
      }
      return nodes;
    }
    result.nodes = walk(roots, '', new Set(), 1, overrides && [overrides.root]);
    return result;
  }

  function drawTree() {
    if (!graph) return;
    const onlyConflicts = $('tree-filter').checked;
    function branch(nodes, depth) {
      const list = el('ul', 'tree-branches');
      for (const node of nodes) {
        if (onlyConflicts && !node.hasConflict) continue;
        const li = el('li');
        const nested = node.children.some(child => !onlyConflicts || child.hasConflict);
        const container = nested ? el('details') : li;
        const line = el(nested ? 'summary' : 'div');
        line.append(el('span', 'tree-label', node.name + (node.version ? '@' + node.version : '')));
        const edgeType = { dependencies: '', devDependencies: 'dev ', optionalDependencies: 'optional ', peerDependencies: 'peer ' }[node.group];
        line.append(el('span', 'tree-edge', edgeType + node.range));
        if (node.state !== 'unknown') line.append(el('span', 'tree-state ' + node.state, node.state === 'bad' ? t('Конфликт', 'Conflict') : t('Подходит', 'Matches')));
        container.append(line);
        if (node.group === 'peerDependencies' && node.version && treeSemver.validRange(node.range)) {
          const scale = document.createElement('details');
          scale.className = 'tree-scale';
          scale.append(el('summary', '', t('Проверить диапазон ', 'Inspect range ') + node.range));
          scale.addEventListener('toggle', () => {
            if (!scale.open || scale.children.length > 1) return;
            const candidates = new Set([node.version]);
            if (lockPackages) {
              for (const [path, record] of Object.entries(lockPackages)) {
                if (record && (record.name || path.split('node_modules/').at(-1)) === node.name && record.version) candidates.add(record.version);
                if (candidates.size >= 8) break;
              }
            } else if (node.name === 'react') {
              candidates.add('18.2.0'); candidates.add('18.3.1');
            }
            const plot = el('div');
            scale.append(plot);
            LabRangeScale.render(plot,{range:node.range,selected:node.version,candidates:[...candidates]});
          });
          container.append(scale);
        }
        if (node.reason) container.append(el('p', 'tree-note', node.reason));
        if (nested) {
          container.open = depth < 2 || node.hasConflict;
          container.append(branch(node.children, depth + 1));
          li.append(container);
        }
        list.append(li);
      }
      return list;
    }
    const root = el('div', 'tree-root', typeof currentManifest.name === 'string' ? currentManifest.name : t('Ваш проект', 'Your project'));
    const out = $('tree-graph');
    out.replaceChildren(root, branch(graph.nodes, 0));
    if (!graph.total) out.append(el('p', 'hint', t('Список зависимостей пуст.', 'The dependency list is empty.')));
    if (onlyConflicts && !graph.bad) out.append(el('p', 'hint', t('Среди проверенных связей конфликтов нет.', 'No conflicts among checked edges.')));
    $('tree-count').textContent = t('Связей', 'Edges') + ' ' + graph.total + ' · ' + t('конфликтов', 'conflicts') + ' ' + graph.bad + ' · ' + t('диапазон проверен и подходит', 'matched') + ' ' + graph.good + ' · ' + t('без проверки', 'unverified') + ' ' + graph.unknown;
    $('tree-limit').textContent = graph.clipped ? t('Показана часть дерева. Предел — 240 связей и 12 уровней. Итоги относятся к показанной части.', 'Partial tree. Limit: 240 edges and 12 levels. Counts describe the displayed portion.') : '';
  }

  function eligible(manifest) {
    const indexes = new Map();
    if (!manifest) return indexes;
    for (const edge of declarations(manifest, true)) {
      if (!treeSemver.valid(edge.range)) continue;
      const key = edge.name + '@' + edge.range;
      indexes.set(key, edge);
    }
    return indexes;
  }

  const metadataInput = $('tree-registry-package');
  const metadataButton = $('tree-load-meta');
  let metadataOptions = new Map();
  function updateLookupButton() {
    metadataButton.disabled = Boolean(request) || !metadataOptions.has(metadataInput.value);
  }
  const metadataCombo = LabPackageCombo.attach(metadataInput, {
    onSelect:updateLookupButton, onInput:updateLookupButton
  });

  function showChoices(manifest) {
    const hosted = LabRegistry.hostedAudit === true;
    $('tree-local').hidden = true;
    metadataOptions = eligible(manifest);
    metadataCombo.setItems([...metadataOptions].map(([key,edge])=>({value:key,label:edge.name,detail:edge.range})));
    metadataCombo.setValue('');
    metadataInput.disabled = !metadataOptions.size;
    metadataInput.placeholder = metadataOptions.size ? t('Начните вводить имя', 'Type a package name') : t('Нет точных версий', 'No exact versions');
    $('tree-source-hint').textContent = hosted
      ? t('По кнопке браузер сверит выбранную версию с общим снимком Nexus на этом устройстве.', 'Clicking checks this version on your device against the shared Nexus snapshot.')
      : t('По кнопке имя и версия будут отправлены в ', 'Clicking sends the name and version to ') + LabRegistry.base();
    if (hosted) metadataButton.textContent = t('Проверить по снимку Nexus','Check the Nexus snapshot');
    updateLookupButton();
  }

  function clearOutput(message = '') {
    graph = currentManifest = null;
    $('tree-details').hidden = $('tree-netbox').hidden = true;
    LabMap.render(null);
    $('tree-error').textContent = message;
    for (const id of ['tree-mode', 'tree-count', 'tree-graph', 'tree-limit']) $(id).replaceChildren();
    lockPackages = null;
    availableCopies = [];
  }

  function render(resetChoices) {
    if (!manifestInput.value.trim() && !lockText.trim()) { clearOutput(); return; }
    graph = currentManifest = null;
    try {
      const packages = readLock();
      const manifest = graphRoot(packages);
      currentManifest = manifest;
      if (resetChoices) {
        lockPackages = packages;
        availableCopies = packages ? installedEntries(packages) : [];
      }
      const assess = resolver(manifest, packages);
      const npm = !LabYarn.format(packages) && (packages || !/^(yarn|pnpm|bun)@/.test(manifest.packageManager || ''));
      const overrides = npm ? TreeOverrides.compile(manifest.overrides,manifest) : null;
      graph = buildGraph(manifest, assess, overrides);
      const network = DepMapModel.create({manifest, packages, rootKey:mapRootKey, copies:availableCopies, assess, declarations});
      if (overrides) overrides.annotate(network);
      LabMap.render(network, commandFor, Boolean(manifestInput.value.trim()));
      $('tree-error').textContent = '';
      $('tree-mode').textContent = packages ?
        t('Версии из lock-файла. Каждая связь сравнивает требование с версией в ближайшей доступной папке. Проверки приложения и движка выполняются отдельно.', 'Lockfile versions. Each edge compares a requirement with the version in the nearest valid location. Runtime and engine checks are separate.')
        : t('Карта показывает, какие версии запросил проект в package.json. Добавьте lock-файл, чтобы увидеть, какие версии были выбраны.', 'The map shows the versions requested in package.json. Add a lockfile to see which versions were selected.');
      const yarn = LabYarn.format(packages);
      if (yarn && !manifestInput.value.trim()) $('tree-mode').textContent=t('Найдите запись yarn.lock на карте. Для пути от приложения добавьте его package.json.', 'Find a yarn.lock entry on the map. Add the application package.json to trace paths from its root.');
      else if (yarn) $('tree-mode').textContent = yarn + t(' · Связи из манифеста и yarn.lock. Путь установки и фактический поставщик peer-пакета проверяются в проекте через yarn why.', ' · Edges from the manifest and yarn.lock. Verify install layout and actual peer providers in the project with yarn why.');
      $('tree-netbox').hidden = Boolean(packages);
      if (resetChoices) showChoices(packages ? null : manifest);
      $('tree-details').hidden = false;
      drawTree();
    } catch (error) {
      clearOutput(error instanceof SyntaxError ? t('Проверьте синтаксис JSON в данных проекта.', 'Check the JSON syntax in the project files.') : error.message);
    }
  }

  function changed() {
    projectRevision++;
    $('lesson-copy').hidden=true;
    clearTimeout(timer);
    request?.abort(); request = null; registry = new Map();
    $('tree-network-result').textContent = '';
    metadataOptions.clear(); updateLookupButton();
    timer = setTimeout(() => render(true), 140);
  }

  function seed(reactVersion, domVersion = '18.3.1') {
    manifestInput.value = JSON.stringify({ name: 'react-demo', dependencies: { react: reactVersion, 'react-dom': domVersion } }, null, 2);
    sampleOpen = true; lockText = ''; $('tree-filter').checked = false;
    changed(); clearTimeout(timer); render(true);
  }

  async function getMetadata() {
    const hosted=LabRegistry.hostedAudit===true;
    const key = metadataInput.value;
    const edge = metadataOptions.get(key);
    if (!edge || request || lockText.trim()) return;
    const controller = new AbortController(); request = controller;
    metadataInput.disabled = true;
    updateLookupButton();
    const status = $('tree-network-result');
    status.textContent = t('Загружаем сведения о ', 'Loading metadata for ') + key + '…';
    $('tree-local').hidden = true;
    try {
      let source = '';
      if (hosted) {
        const snapshot = await LabRegistry.releases(controller.signal);
        if (request !== controller) return;
        source = t('Снимок Nexus от ', 'Nexus snapshot dated ') + new Date(snapshot.published*1000).toISOString().slice(0,10) + ' UTC. ';
      }
      const record = await LabRegistry.manifest(edge.name, treeSemver.valid(edge.range), controller.signal);
      if (request !== controller) return;
      registry.set(edge.name + '@' + record.version, record);
      status.textContent = source + t('Загружены сведения о ', 'Loaded metadata for ') + key + '.';
    } catch (error) {
      if (request !== controller) return;
      $('tree-local').hidden = !hosted;
      status.textContent = key + ' · ' + LabRegistry.message(error);
    } finally {
      if (request === controller) {
        request = null;
        metadataInput.disabled = false;
        updateLookupButton();
      }
    }
    render(false);
  }

  async function useProject(files) {
    const revision = ++projectRevision;
    clearTimeout(timer);
    request?.abort(); request = null;
    try {
      if ([files?.manifest, files?.lock].some(file => file && file.size > limit.chars)) {
        throw Error(t('Лимит каждого файла — 8 МБ.', 'Each file must be at most 8 MB.'));
      }
      const [manifest, lock] = await Promise.all([files?.manifest?.text(), files?.lock?.text()]);
      if (revision !== projectRevision) return;
      const keepEdit = editorChanged && !sampleOpen && (files?.manifest || files?.lock) &&
        (files.changedSlot === 'lock' || (!manifest && lock && !lockText && files.changedSlot !== 'manifest'));
      if (!keepEdit) { manifestInput.value = manifest || ''; editorChanged = false; }
      sampleOpen = false;
      lockText = lock || '';
      $('tree-filter').checked = false;
      LabMap.render(null);
      changed(); clearTimeout(timer);
      render(true);
    } catch (error) {
      if (revision !== projectRevision) return;
      sampleOpen = editorChanged = false; lockText = ''; manifestInput.value = '';
      changed(); clearTimeout(timer);
      clearOutput(error.message);
    }
  }
  window.addEventListener('lab-project', ({detail}) => useProject(detail));
  manifestInput.addEventListener('input', () => {
    editorChanged = true;
    if (sampleOpen) {lockText='';sampleOpen=false;}
    changed();
  });
  $('tree-filter').addEventListener('change', drawTree);
  $('tree-load-meta').addEventListener('click', getMetadata);
  if (lang === 'en') document.title = 'Dependency tree · DepLoom';
  function yarnSample(berry) {
    manifestInput.value=JSON.stringify({name:'terminal-colors',dependencies:{'color-convert':'^2.0.1'}},null,2);
    const lines=berry?['__metadata:','  version: 8']:['# yarn lockfile v1'];
    for(const [name,range,version] of [['color-convert','^2.0.1','2.0.1'],['color-name','~1.1.4','1.1.4']]){
      lines.push('',JSON.stringify(name+'@'+(berry?'npm:':'')+range)+':');
      lines.push(berry?'  version: '+version:'  version "'+version+'"');
      lines.push(berry?'  resolution: "'+name+'@npm:'+version+'"':'  resolved "https://registry.yarnpkg.com/'+name+'/-/'+name+'-'+version+'.tgz"');
      if(name==='color-convert')lines.push('  dependencies:',berry?'    color-name: "npm:~1.1.4"':'    color-name "~1.1.4"');
    }
    sampleOpen = true; lockText=lines.join('\n')+'\n';$('tree-filter').checked=false;
    changed();clearTimeout(timer);render(true);
  }
  const query = new URLSearchParams(location.search);
  const publicExample=ReviewExample.fixture();
  if (publicExample) {
    const {lock,manifest}=publicExample;
    const chosen=query.get('path');
    manifestInput.value=JSON.stringify(manifest,null,2);lockText=JSON.stringify(lock);sampleOpen=true;
    changed();clearTimeout(timer);render(true);
    const copy=availableCopies.find(item=>item.path===chosen);
    if (copy) {
      const graph=LabLockGraph.build(lock.packages,manifest), edge=graph.parents.get(chosen);
      const owner=edge?.owner || '';
      const root=manifest.name || t('проект','project');
      const parentName=owner.split('node_modules/').at(-1);
      const parent=owner ? parentName+'@'+lock.packages[owner].version : root;
      const override=owner && (manifest.overrides?.[parent] || manifest.overrides?.[parentName])?.[copy.name];
      $('lesson-parent').textContent=edge ? parent+' → '+copy.name+'@'+edge.range+' · '+t('в lock-файле ','locked ')+copy.label+
        (override ? ' · override '+override : '') : copy.label;
      $('lesson-proof').textContent=chosen+'\n'+commandFor(chosen);
      $('lesson-copy').hidden=false;$('network-panel').hidden=true;
      $('lesson-map').onclick=()=>{$('network-panel').hidden=false;$('map-direction').value='in';LabMap.focusOn(chosen);$('network-panel').scrollIntoView({block:'start'});};
    }
  } else if (query.get('own') === '1' || !['react','dom','yarn'].some(key=>query.has(key))) {
    manifestInput.value = ''; lockText = '';
    $('tree-netbox').hidden = true;
    manifestInput.placeholder = '{"dependencies": {"react": "^18.2.0"}}';
    $('tree-mode').textContent = t('Вставьте манифест, чтобы построить дерево.', 'Paste a manifest to build the tree.');
    $('tree-details').hidden = true;
  } else if (['classic','berry'].includes(query.get('yarn'))) {
    yarnSample(query.get('yarn')==='berry');
  } else {
    const known = ['18.2.0', '18.3.1'];
    const react = query.get('react');
    const dom = query.get('dom');
    seed(known.includes(react) ? react : '18.2.0', known.includes(dom) ? dom : '18.3.1');
  }
})();
