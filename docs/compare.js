'use strict';
(() => {
  const {t} = window.Lab;
  const byId = id => document.getElementById(id);
  const added = t('Добавлено','Added');
  const removed = t('Удалено','Removed');
  const changed = t('Изменено','Changed');
  const types = {added, removed, changed};
  const sides = ['before','after'];
  const state = {before:null, after:null};
  const reads = {before:0, after:0};
  const sourceErrors = {before:'',after:''};
  let example = true, lesson=null, focusPath='', rootEdits=[];
  const params=new URLSearchParams(location.search);
  let changes = [];
  let graphs;
  let selected = '';
  let page = 0;
  const pageSize = 20;
  const fileLimit = 20 * 1024 * 1024;

  function el(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }
  function version(record) {
    if (!record) return '—';
    return record.link === true ? t('ссылка','link') : String(record.version ?? t('без версии','no version'));
  }
  function sideDetail(container, side, row) {
    const snapshot = state[side];
    const packages = snapshot.lock.packages;
    container.replaceChildren(el('h3',side === 'before' ? t('До','Before') : t('После','After')));
    if (!Object.hasOwn(packages,row.path)) {
      container.append(el('p',t('По этому пути записи нет.','No entry at this path.')));
      return;
    }
    const record = packages[row.path];
    container.append(el('p',t('Версия — ','Version — ')+version(record)));
    const graph = graphs[side];
    const yarn = LabYarn.format(packages);
    const chain = yarn ? null : LabLockGraph.chain(graph,row.path);
    if (yarn) {
      const owners = graph.get(row.path) || [];
      container.append(el('p',owners.length ? t('Запрашивают: ','Requested by: ')+owners.slice(0,15).join(', ') : t('Родитель не указан в этом lock-файле. Проверьте манифест проекта или workspace.', 'No requesting entry in this lockfile. Check the project or workspace manifest.')));
    } else if (!chain) {
      container.append(el('p',graph.clipped
        ? t('Достигнут предел обхода. Цепочка до этой копии не подтверждена.','The traversal limit was reached. No chain to this copy was confirmed.')
        : t('Цепочка от корня не подтверждена. Возможна локальная ссылка или отдельная запись без разрешённого ребра.', 'No chain from the root was confirmed. This may be a local link or an entry with no resolved incoming dependency.')));
    } else {
      const list = document.createElement('ol');
      for (const path of chain) {
        if (path === '') {
          list.append(el('li',t('Корень проекта','Project root')));
        } else {
          const edge = graph.parents.get(path);
          const item = el('li',edge.name+'@'+version(packages[path])+' · '+edge.group+' '+edge.range);
          list.append(item);
        }
      }
      container.append(list);
    }
    const fields = document.createElement('details');
    fields.append(el('summary',t('Поля записи','Entry fields')));
    // A changed copy shows just the fields behind its diff. New or removed copies show the full record.
    const content = row.type === 'changed'
      ? Object.fromEntries(row.fields.filter(key => Object.hasOwn(record,key)).map(key => [key,record[key]]))
      : record;
    fields.append(el('pre',JSON.stringify(content,null,2)));
    container.append(fields);
  }
  function showSelection(row) {
    const details = byId('details');
    details.hidden = !row;
    if (!row) return;
    selected = row.path;
    byId('path').textContent = selected;
    const treeLink=byId('copy-tree');
    const preferred=lesson && lesson.before===ReviewExample.revision?'before':'after';
    const side=lesson && (Object.hasOwn(state[preferred].lock.packages,selected) ? preferred : preferred==='after'?'before':'after');
    treeLink.hidden=!side || !['selector','copies'].includes(lesson.kind);
    if (!treeLink.hidden) treeLink.href=ReviewExample.link('tree.html',lesson.kind,lesson[side],selected);
    if (lesson && ['selector','copies'].includes(lesson.kind) && selected && (Object.hasOwn(state.before.lock.packages,selected)||Object.hasOwn(state.after.lock.packages,selected))) Lab.setExampleState({path:selected});
    sideDetail(byId('old-side'),'before',row);
    sideDetail(byId('new-side'),'after',row);
    for (const button of byId('changes').querySelectorAll('button')) {
      button.setAttribute('aria-pressed',String(button.dataset.path === selected));
    }
  }
  function renderList() {
    const kind = byId('kind').value;
    const query = byId('query').value.trim().toLowerCase();
    const filtered = changes.filter(row => (!kind || kind === row.type) && row.path.toLowerCase().includes(query));
    const start = page * pageSize;
    const visible = filtered.slice(start,start+pageSize);
    const list = byId('changes');
    list.replaceChildren();
    for (const row of visible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.path = row.path;
      const path = el('code',row.path);
      path.className = 'compare-path';
      const versions = sides.map(side => {
        const packages = state[side].lock.packages;
        return Object.hasOwn(packages,row.path) ? packages[row.path] : null;
      });
      button.append(el('strong',types[row.type]),path,el('span',versions.map(version).join(' → ')));
      button.addEventListener('click',()=>showSelection(row));
      const item = document.createElement('li');
      item.append(button);
      list.append(item);
    }
    byId('empty').hidden = visible.length > 0;
    byId('empty').textContent = changes.length
      ? t('По этим условиям записей нет.','No entries match these filters.')
      : rootEdits.length ? '' : t('Установленные копии совпадают.','Installed copies match.');
    byId('pagination').hidden = filtered.length <= pageSize;
    byId('prev').disabled = start === 0;
    byId('next').disabled = start + pageSize >= filtered.length;
    byId('range').textContent = (start+1)+'–'+Math.min(start+pageSize,filtered.length)+' / '+filtered.length;
    let row=visible.find(row => row.path === selected) || visible[0];
    if (focusPath && !query && !kind) {
      const known=sides.every(side=>Object.hasOwn(state[side].lock.packages,focusPath));
      row=changes.find(r=>r.path===focusPath) || (known ? {path:focusPath,type:'unchanged',fields:[]} : row);
      focusPath='';
    }
    showSelection(row);
  }
  function refresh() {
    const report = byId('report');
    report.hidden = true;
    const message = byId('message');
    for (const side of sides) {
      const item = state[side];
      byId(side+'-source').textContent = sourceErrors[side] || item?.name || '';
    }
    if (!state.before || !state.after) {
      message.textContent = t('Выберите оба файла для сравнения.','Choose both files to compare them.');
      return;
    }
    message.textContent = '';
    try {
      const before = state.before.lock;
      const after = state.after.lock;
      if (LabYarn.format(before.packages) !== LabYarn.format(after.packages)) {
        message.textContent=t('Выберите две ревизии одного формата lock-файла.', 'Choose two revisions of the same lockfile format.');
        return;
      }
      changes = comparePackageLocks(before,after);
      rootEdits=comparePackageLocks.rootRequirements(before,after);
      graphs = {};
      for (const side of sides) {
        const pkgs=state[side].lock.packages;
        if (!LabYarn.format(pkgs)) { graphs[side]=LabLockGraph.build(pkgs); continue; }
        const parents=new Map();
        for (const [owner,record] of Object.entries(pkgs)) for (const edge of LabLockGraph.declarations(record,false)) {
          const hit=LabYarn.resolve(pkgs,edge);
          if (hit) { if (!parents.has(hit.key)) parents.set(hit.key,[]); parents.get(hit.key).push(owner); }
        }
        graphs[side]=parents;
      }
    } catch {
      message.textContent = t('Нужны два корректных корневых package-lock.json версии 3 с разделом packages.', 'Supply two valid root npm v3 lockfiles with a packages section.');
      return;
    }
    byId('root-verdict').hidden=byId('root-lines').hidden=!rootEdits.length;
    byId('root-verdict').textContent=changes.length?t('Изменились требования корня и записи пакетов.','Root requirements and package entries changed.'):
      t('Изменилось требование корня. Установленные копии совпадают.','The root requirement changed. Installed copies match.');
    byId('root-lines').textContent=rootEdits.map(r=>['− '+r.section+'.'+r.name+'  '+(r.before??'—'),'+ '+r.section+'.'+r.name+'  '+(r.after??'—')].join('\n')).join('\n');
    const counts = {added:0, removed:0, changed:0};
    for (const row of changes) counts[row.type]++;
    const summary = byId('counts');
    summary.replaceChildren();
    for (const [kind,label] of Object.entries(types)) {
      const item = el('span',label+' ');
      item.append(el('b',String(counts[kind])));
      summary.append(item);
    }
    byId('evidence').textContent = example
      ? t('Источник — пара учебных lock-файлов.','Source — the two example lockfiles.')
      : t('Источник — ваши локальные файлы. ','Source — your local files. ')+state.before.name+' / '+state.after.name;
    byId('query').value = '';
    byId('kind').value = '';
    byId('details').setAttribute('aria-label',t('Детали записи','Entry details'));
    selected = focusPath;
    page = 0;
    report.hidden = false;
    renderList();
  }
  function useExample(fromLink=false) {
    example = true;lesson=null;focusPath='';
    let pair={before:SelectorLab.cases.base.lock,after:SelectorLab.cases.override.lock}, names=['css-select · nth-check 1.0.2','css-select · override 2.1.1'];
    if (fromLink===true) {
      const {kind,revision,fixture}=ReviewExample, sample=fixture();
      if(sample) {
        const base=kind==='selector'?'base':'before';
        const after=revision===base?(kind==='selector'?'override':'after'):revision;
        lesson={kind,before:base,after};
        pair={before:fixture(kind,base).lock,after:fixture(kind,after).lock};
        names=[base,after];
        focusPath=params.get('path') || (kind==='selector'?sample.nthPath:'');
      } else if(kind==='rollup') {
        pair=RollupLab;names=['Rollup · 18','Rollup · 1'];
        const platform=params.get('focus');
        focusPath='node_modules/@rollup/rollup-'+(platform==='darwin-arm64'?platform:platform==='linux-musl'?'linux-x64-musl':'linux-x64-gnu');
      } else if(kind==='root-range') {
        names=['package.json · ^1.0.0','package.json · ~1.2.0'];
        const sample=range=>({lockfileVersion:3,packages:{'':{dependencies:{lib:range}},'node_modules/lib':{version:'1.2.3'}}});
        pair={before:sample('^1.0.0'),after:sample('~1.2.0')};
      } else {
        lesson={kind:'selector',before:'base',after:'override'};
        focusPath=SelectorLab.cases.override.nthPath;
      }
    }
    for (const side of sides) {
      sourceErrors[side] = '';
      reads[side]++;
      byId(side).value = '';
      state[side] = {lock:pair[side], name: names ? names[sides.indexOf(side)] : side==='before' ? t('Пример до обновления','Example before update') : t('Пример после обновления','Example after update')};
    }
    refresh();
  }
  async function read(side) {
    if (example) {
      example = false;lesson=null;focusPath='';
      state.before = state.after = null;
    }
    const generation = ++reads[side];
    sourceErrors[side] = '';
    const file = byId(side).files[0];
    state[side] = null;
    refresh();
    if (!file) return;
    try {
      if (file.size > fileLimit) throw new Error('SIZE');
      const lock = LabYarn.read(await file.text());
      if (reads[side] !== generation) return;
      if (!lock || (!LabYarn.format(lock.packages) && lock.lockfileVersion !== 3) || !lock.packages || !Object.hasOwn(lock.packages,'')) throw new Error('FORMAT');
      state[side] = {lock,name:file.name};
      refresh();
    } catch (error) {
      if (reads[side] !== generation) return;
      sourceErrors[side] = file.name +' — '+ (error.message === 'SIZE'
        ? t('файл превышает 20 МиБ','file exceeds 20 MiB')
        : t('не удалось прочитать yarn.lock или npm lock-файл v3','could not read a Yarn lock or npm v3 lockfile'));
      refresh();
    }
  }
  for (const side of sides) byId(side).addEventListener('change',()=>read(side));
  byId('example').addEventListener('click',()=>{
    location.href=ReviewExample.link('compare.html','selector','override',SelectorLab.cases.override.nthPath);
  });
  byId('prev').addEventListener('click',()=>{page--; renderList();});
  byId('next').addEventListener('click',()=>{page++; renderList();});
  for (const [id,event] of [['query','input'],['kind','change']]) byId(id).addEventListener(event,()=>{page=0; renderList();});
  useExample(true);
})();
