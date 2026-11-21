(() => {
  'use strict';

  const { t } = window.Lab;
  document.title = t('Известные уязвимости · DepLoom', 'Known vulnerabilities · DepLoom');

  const form = document.getElementById('advisory-form');
  const nameField = document.getElementById('package');
  const versionField = document.getElementById('version');
  const scopeConfirmation = document.getElementById('scope-confirmation');
  const publicScope = document.getElementById('public-scope');
  const status = document.getElementById('query-status');
  const list = document.getElementById('advisories');
  const otherSource = document.getElementById('other-source');
  const githubLink = document.getElementById('github-link');
  const packageName = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
  const versionPart = '(?:0|[1-9][0-9]*)';
  const preId = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
  const exactVersion = new RegExp('^' + [versionPart, versionPart, versionPart].join('\\.') + '(?:-' + preId + '(?:\\.' + preId + ')*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
  const query=new URLSearchParams(location.search);
  if(query.get('example')==='selector' && Object.hasOwn(SelectorLab.cases,query.get('rev'))) {
    const record=SelectorLab.cases[query.get('rev')];
    nameField.value='nth-check';versionField.value=record.nthVersion;
  }
  const picker = document.getElementById('project-picker');
  const filter = document.getElementById('project-filter');
  const choice = document.getElementById('project-choice');
  const projectNote = document.getElementById('project-note');
  let activeRequest, generation = 0, projectRows = [], visible = [];
  let projectLabel = '', projectIsLock = false;
  const button = document.getElementById('query-button');
  const destination = document.getElementById('destination');
  const address = LabRegistry.base();
  const useOSV = address === LabRegistry.defaultBase;
  function needsConfirmation() {
    const name = nameField.value.trim();
    return useOSV && (name.startsWith('@') || projectRows.some(row => row.name === name) &&
      !projectRows.some(row => row.name === name && row.version === versionField.value.trim() && row.publicOrigin));
  }
  function describeSource() {
    publicScope.checked = false;
    scopeConfirmation.hidden = !needsConfirmation();
    document.getElementById('online-title').textContent = useOSV ? t('Проверить по базе OSV','Look up OSV advisories') :
      t('Проверить по базе выбранного реестра','Check the selected registry for advisories');
    document.getElementById('package-label').textContent = useOSV ? t('Публичный npm-пакет','Public npm package') : t('Имя пакета в реестре','Package name in the registry');
    button.disabled = false;
    button.textContent = useOSV ? t('Проверить в OSV','Check with OSV') : t('Проверить в реестре','Check with registry');
    destination.textContent = useOSV ?
      t('По кнопке браузер отправит название и версию на api.osv.dev. Вводите только публичные названия пакетов.','When you submit, your browser sends the package name and version to api.osv.dev. Enter public package names only.') :
      t('По кнопке браузер отправит имя и версию в API аудита этого реестра: ', 'Submitting sends the name and version to this registry’s advisory API: ') + address;
  }

  function resetResult() {
    activeRequest?.abort();
    activeRequest = undefined;
    status.textContent = '';
    list.replaceChildren();
    list.hidden = true;
    otherSource.hidden = true;
    githubLink.removeAttribute('href');
  }

  form.addEventListener('input', event => {
    resetResult();
    if (event.target === nameField || event.target === versionField) {
      publicScope.checked = false;
      choice.value = '';
    }
    scopeConfirmation.hidden = !needsConfirmation();
  });

  async function getAdvisories(name, version, signal) {
    const matches = new Map();
    const seenTokens = new Set();
    let token;
    do {
      const query = { package: { name, ecosystem: 'npm' }, version };
      if (token) query.page_token = token;
      const data = await LabRegistry.json('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      }, signal);
      if (!data || Array.isArray(data) || typeof data !== 'object' || data.error ||
          (data.vulns !== undefined && !Array.isArray(data.vulns)) ||
          (data.next_page_token !== undefined && typeof data.next_page_token !== 'string')) {
        throw new Error('Unexpected OSV response');
      }
      for (const entry of data.vulns ?? []) {
        if (typeof entry?.id !== 'string' || !entry.id) throw new Error('Missing OSV ID');
        if (!entry.withdrawn) matches.set(entry.id, entry);
      }
      token = data.next_page_token;
      if (token && seenTokens.has(token)) throw new Error('Repeated OSV page');
      seenTokens.add(token);
    } while (token);
    return matches;
  }

  async function registryEntries(name, version, signal) {
    const row = {name, version, ids:[], state:'unknown'};
    const entries = new Map();
    await LabAudit.registryAudit([row], entries, signal);
    if (row.state === 'unknown') throw Error('METADATA');
    return [...entries.values()];
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    resetResult();
    const name = nameField.value.trim();
    const version = versionField.value.trim();
    if (!packageName.test(name)) {
      status.textContent = t('Введите имя npm-пакета, например lodash или @babel/core.', 'Enter an npm package name such as lodash or @babel/core.');
      nameField.focus();
      return;
    }
    if (!exactVersion.test(version)) {
      status.textContent = t('Нужна точная версия, например 4.17.20. Диапазоны и теги не подходят.', 'Enter an exact version such as 4.17.20. Ranges and tags are not supported.');
      versionField.focus();
      return;
    }
    if (needsConfirmation() && !publicScope.checked) {
      scopeConfirmation.hidden = false;
      status.textContent = t('Подтвердите публичность имени перед отправкой.', 'Confirm the package name is public before submitting.');
      publicScope.focus();
      return;
    }

    const requested = name + '@' + version;
    if (useOSV) {
      const parameters = new URLSearchParams({ ecosystem: 'npm', affects: requested, per_page: '100' });
      githubLink.href = 'https://api.github.com/advisories?' + parameters;
      otherSource.hidden = false;
    }
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    status.textContent = t('Ищу записи для ', 'Checking advisories for ') + requested + '…';
    try {
      const entries = useOSV ?
        [...(await getAdvisories(name, version, controller.signal)).values()].map(record => ({
          ...record, ...LabSeverity.rating(record), href:'https://osv.dev/vulnerability/' + encodeURIComponent(record.id),
        })) : await registryEntries(name, version, controller.signal);
      if (controller !== activeRequest) return;
      const source = useOSV ? 'OSV' : address;
      if (!entries.length) {
        status.textContent = source + ' · ' + t('Известных записей для ', 'No known advisories returned for ') + requested +
          t(' не найдено. Ответ не подтверждает существование этой версии.', '. This response does not confirm that the version exists.');
        return;
      }
      status.textContent = requested + ' · ' + source + ' · ' + t('Найдено записей — ', 'Advisories found — ') + entries.length;
      for (const entry of LabSeverity.sorted(entries)) {
        const item = document.createElement('li');
        item.append(LabSeverity.badge(entry),' ');
        if (entry.href) {
          const link = document.createElement('a');
          link.href = entry.href;
          link.rel = 'noreferrer';
          link.textContent = entry.id;
          item.append(link);
        } else {
          item.append(entry.id);
        }
        if (typeof entry.summary === 'string' && entry.summary) item.append(' — ' + entry.summary);
        list.append(item);
      }
      list.hidden = false;
    } catch (error) {
      if (controller !== activeRequest) return;
      status.textContent = t('Результат неизвестен для ', 'Result unknown for ') + requested +
        ' · ' + (useOSV ? 'OSV' : address) + '. ' + LabRegistry.message(error);
    } finally {
      clearTimeout(timeout);
      if (controller === activeRequest) activeRequest = undefined;
    }
  });

  function showChoices() {
    const term = filter.value.trim().toLowerCase();
    const matching = projectRows.filter(row => (row.name + (row.version ? '@' + row.version : '')).includes(term));
    visible = matching.slice(0,80);
    choice.replaceChildren(new Option(t('Выберите пакет', 'Choose a package'), ''));
    visible.forEach((row,i) => choice.add(new Option(row.name + (row.version ? '@' + row.version : ''), String(i))));
    choice.disabled = !visible.length;
    projectNote.textContent = projectLabel + ' · ' + (projectIsLock ?
      t('Записи lock-файла с точной версией', 'Exact versions from the lockfile') :
      t('Имена из package.json. Установленную версию укажите вручную', 'Names from package.json. Enter the installed version manually')) +
      ' · ' + visible.length + ' / ' + matching.length;
  }
  filter.addEventListener('input', showChoices);
  choice.addEventListener('change', () => {
    if (!choice.value) return;
    const row = visible[Number(choice.value)];
    if (!row) return;
    resetResult();
    nameField.value = row.name;
    versionField.value = row.version || '';
    publicScope.checked = false;
    scopeConfirmation.hidden = !needsConfirmation();
    if (!row.version) versionField.focus();
  });
  window.addEventListener('lab-project', async ({detail}) => {
    const token = ++generation;
    resetResult();
    projectRows = []; visible = [];
    nameField.value = ''; versionField.value = ''; filter.value = '';
    publicScope.checked = false; scopeConfirmation.hidden = true;
    picker.hidden = !detail || (!detail.lock && !detail.manifest);
    if (picker.hidden) return;
    choice.replaceChildren(); choice.disabled = true;
    projectLabel = detail.name || t('Проект','Project');
    projectNote.textContent = projectLabel + ' · ' + t('Читаю локальный файл…', 'Reading local file…');
    const file = detail.lock || detail.manifest;
    try {
      if (file.size > LabAudit.maxBytes) throw Error('size');
      const content = await file.text();
      if (token !== generation) return;
      projectIsLock = Boolean(detail.lock);
      if (projectIsLock) {
        const lock = LabYarn.read(content);
        projectRows = LabAudit.localInventory(lock).rows.filter(row => !row.localOnly);
      } else {
        const names = new Set([...LabLockGraph.declarations(JSON.parse(content), true)].map(edge => edge.name));
        projectRows = [...names].sort().map(name => ({name}));
      }
      showChoices();
    } catch (error) {
      if (token !== generation) return;
      projectNote.textContent = projectLabel + ' · ' + (error.message === 'size' ?
        t('Файл больше 8 МиБ. Введите пакет и версию вручную.', 'File exceeds 8 MiB. Enter the package and version manually.') :
        t('Не удалось прочитать файл. Введите пакет и версию вручную.', 'Could not read the file. Enter the package and version manually.'));
    }
  });
  describeSource();
})();
