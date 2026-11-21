(() => {
  'use strict';

  const { t } = window.Lab;
  document.title = t('Аудит пакета · DepLoom', 'Package audit · DepLoom');

  const form = document.getElementById('advisory-form');
  const nameField = document.getElementById('package');
  const versionField = document.getElementById('version');
  const scopeConfirmation = document.getElementById('scope-confirmation');
  const publicScope = document.getElementById('public-scope');
  const status = document.getElementById('query-status');
  const list = document.getElementById('advisories');
  const result = document.getElementById('package-result');
  const packageName = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
  const versionPart = '(?:0|[1-9][0-9]*)';
  const preId = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
  const exactVersion = new RegExp('^' + [versionPart, versionPart, versionPart].join('\\.') + '(?:-' + preId + '(?:\\.' + preId + ')*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
  const query=new URLSearchParams(location.search);
  if(query.get('example')==='selector' && Object.hasOwn(SelectorLab.cases,query.get('rev'))) {
    const record=SelectorLab.cases[query.get('rev')];
    nameField.value='nth-check';versionField.value=record.nthVersion;
  }
  const projectNote = document.getElementById('project-note');
  let activeRequest, loadingProject=false, generation=0, projectNames=new Set(), publicVersions=new Set();
  const combo=LabPackageCombo.attach(nameField,{
    onSelect(item) {
      resetResult();nameField.value=item.name;versionField.value=item.version||'';
      publicScope.checked=false;scopeConfirmation.hidden=!needsConfirmation();
      if(!item.version) versionField.focus();
    }
  });
  const button = document.getElementById('query-button');
  const destination = document.getElementById('destination');
  const address = LabRegistry.base();
  const hosted = LabRegistry.hostedAudit === true;
  const useOSV = !hosted && address === LabRegistry.defaultBase;
  function needsConfirmation() {
    const name = nameField.value.trim();
    return useOSV && (name.startsWith('@') || projectNames.has(name) && !publicVersions.has(name+'@'+versionField.value.trim()));
  }
  function describeSource() {
    publicScope.checked = false;
    scopeConfirmation.hidden = !needsConfirmation();
    button.disabled = false;
    destination.textContent=hosted
      ? t('Проверка по снимку OSV выполняется в браузере.','The browser checks this site’s OSV snapshot locally.')
      : t('После запуска имя и версию получит ','On run, the package name and version go to ')+(useOSV?'api.osv.dev.':address);

  }

  function resetResult() {
    activeRequest?.abort();
    activeRequest = undefined;
    status.textContent = '';
    list.replaceChildren();
    list.hidden = true;
    result.hidden=true;
  }

  form.addEventListener('input', event => {
    resetResult();
    if (event.target === nameField || event.target === versionField) {
      publicScope.checked = false;
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

  async function lookup(name,version,signal) {
    if(hosted) {
      const index=await LabHostedAudit.load(signal);
      const publicOrigin=publicVersions.has(name+'@'+version);
      const row={name,version,publicOrigin}, records=new Map();
      LabHostedAudit.check(index,[row],records,signal);
      const date=seconds=>new Date(seconds*1000).toISOString().replace('T',' ').slice(0,19)+' UTC';
      const source='OSV · '+date(index.published)+' · '+t('действителен до ','expires ')+date(index.expires);
      const provenance=records.size && !publicOrigin ? t('Совпали имя и версия с записью для публичного npm.','The name and version match a public npm entry.') : '';
      return {entries:[...records.values()],source,reason:[row.reason,provenance].filter(Boolean).join(' ')};
    }
    if(!useOSV)return {entries:await registryEntries(name,version,signal),source:address};
    const records=await getAdvisories(name,version,signal);
    const entries=[...records.values()].map(record=>({id:record.id,...LabAudit.advisoryMetadata(record,'OSV'),...LabSeverity.rating(record),href:'https://osv.dev/vulnerability/'+encodeURIComponent(record.id)}));
    return {entries,source:'OSV'};
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if(loadingProject)return;
    resetResult();result.hidden=false;
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
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    status.textContent = t('Ищу записи для ', 'Checking advisories for ') + requested + '…';
    try {
      const {entries,source,reason}=await lookup(name,version,controller.signal);
      if (controller !== activeRequest) return;
      if (!entries.length) {
        if(reason){status.textContent=requested+' · '+source+'. '+reason;return;}
        status.textContent = source + ' · ' + t('Известных записей для ', 'No known advisories returned for ') + requested +
          t(' не найдено. Ответ не подтверждает существование этой версии.', '. This response does not confirm that the version exists.');
        return;
      }
      status.textContent = requested + ' · ' + source + ' · ' + t('Найдено записей — ', 'Advisories found — ') + entries.length + (reason ? '. '+reason : '');
      for (const entry of LabSeverity.sorted(entries)) {
        list.append(LabFindingCards.card(entry,[{name,key:requested,paths:[]}],null,hosted?'snapshot':useOSV?'osv':'registry'));
      }
      list.hidden = false;
    } catch (error) {
      if (controller !== activeRequest) return;
      status.textContent = t('Результат неизвестен для ', 'Result unknown for ') + requested +
        ' · ' + (hosted ? t('Не удалось загрузить или подтвердить полный снимок OSV.','The complete OSV snapshot could not be loaded or verified.') : (useOSV ? 'OSV' : address) + '. ' + LabRegistry.message(error));
    } finally {
      clearTimeout(timeout);
      if (controller === activeRequest) activeRequest = undefined;
    }
  });

  window.addEventListener('lab-project',async ({detail})=>{
    const token=++generation;
    resetResult();projectNames=new Set();publicVersions=new Set();combo.setItems([]);combo.setValue('');
    versionField.value='';publicScope.checked=false;scopeConfirmation.hidden=true;projectNote.textContent='';
    loadingProject=Boolean(detail?.manifest || detail?.lock);button.disabled=loadingProject;
    if(!loadingProject)return;
    try {
      for(const file of [detail.manifest,detail.lock]) if(file && file.size>LabAudit.maxBytes)throw Error('size');
      const [manText,lockText]=await Promise.all([detail.manifest?.text(),detail.lock?.text()]);
      if(token!==generation)return;
      const manifest=manText&&JSON.parse(manText.replace(/^\uFEFF/,''));
      const entries=LabPackageCombo.direct(manifest);
      projectNames=new Set(entries.map(edge=>edge.name));
      const lock=lockText&&LabYarn.read(lockText,manifest);
      const rows=lock?LabAudit.localInventory(lock).rows:[];
      for(const row of rows)projectNames.add(row.name);
      publicVersions=new Set(rows.filter(row=>row.publicOrigin).map(row=>row.key));
      if(!manifest)return;
      const rowsByPath=new Map();
      for(const row of rows)for(const path of row.paths)rowsByPath.set(path,row);
      const direct=new Map();
      for(const edge of entries)if(!direct.has(edge.name))direct.set(edge.name,edge);
      const options=[...direct.values()].map(edge=>{
        const match=lock && LabLockGraph.lockedPackage(lock.packages,'',edge);
        const row=match && rowsByPath.get(match.key);
        const version=row?.name===edge.name && !row.localOnly ? row.version : '';
        return {name:edge.name,version,value:edge.name,label:edge.name,detail:version||edge.range};
      });
      combo.setItems(options);
      projectNote.textContent=(manifest.name || detail.name || t('Проект','Project'))+' · '+
        t('Подсказки из package.json: ','Suggestions from package.json: ')+options.length+
        (lock?t(' · версии из lock-файла',' · versions from lockfile'):'');
    }catch(error){
      if(token!==generation)return;
      projectNote.textContent=error.message==='size'?t('Размер файла превышает 8 МиБ.','File exceeds 8 MiB.'):
        t('Подсказки проекта недоступны. Введите имя и версию.','Project suggestions are unavailable. Enter a name and version.');
    } finally {if(token===generation){loadingProject=false;button.disabled=false;}}
  });
  describeSource();
})();
