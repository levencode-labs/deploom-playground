'use strict';
(() => {
  const {t} = window.Lab;
  const el = id => document.getElementById(id);
  function sync(hash) {
    try {history.replaceState(null,'','#'+hash);} catch {}
    const language = document.querySelector('a.language');
    if (language) { const url = new URL(language.href); url.hash=hash; language.href=url; }
  }

  if (el('ci-result')) {
    const steps = {
      base: ['^1.2.0','1.2.3',t('Диапазон допускает зафиксированную версию 1.2.3. npm ci установил её из lock-файла.','The range includes the locked 1.2.3. npm ci installed that exact version.')],
      mismatch: ['^2.0.0','1.2.3',t('В package.json указана версия 2.x, а в lock-файле осталась 1.2.3. npm ci остановился и сохранил lock-файл без изменений.','The manifest requires 2.x, but the lockfile still records 1.2.3. npm ci stopped and left the lockfile unchanged.')],
      fixed: ['^2.0.0','2.0.0',t('После npm install --package-lock-only в lock-файле появилась 2.0.0. Повторный npm ci установил её.','npm install --package-lock-only recorded 2.0.0 in the lockfile. Running npm ci again installed it.')],
    };
    function render() {
      const candidate = location.hash.slice(1);
      const stage = Object.hasOwn(steps,candidate) ? candidate : 'base';
      const [range,locked,why] = steps[stage];
      document.querySelector('input[value="'+stage+'"]').checked = true;
      el('manifest-line').textContent = '"dependencies": { "demo-lib": "'+range+'" }';
      el('lock-line').textContent = '"version": "'+locked+'"';
      const failed = stage === 'mismatch';
      el('ci-result').dataset.status = failed ? 'fail' : 'pass';
      for (const id of ['lock-line','manifest-line']) el(id).classList.toggle('ci-conflict',failed);
      el('ci-verdict').textContent = failed ? t('npm ci остановился','npm ci stopped') : t('Установка прошла','Installation passed');
      el('ci-why').textContent = why;
      el('ci-log').textContent = failed ? "$ npm ci\nnpm error code EUSAGE\nnpm error Invalid: lock file's demo-lib@1.2.3 does not satisfy demo-lib@2.0.0" : '$ npm ci\nexit 0\ndemo-lib@'+locked;
      const next = stage==='base'?'mismatch':stage==='mismatch'?'fixed':'base';
      el('ci-next').textContent={base:t('Изменить одну строку в package.json →','Edit one line in package.json →'),mismatch:t('Обновить lock и повторить npm ci →','Update the lock and retry npm ci →'),fixed:t('Вернуться к исходной ветке','Back to the original branch')}[stage];
      el('ci-next').onclick=()=>{sync(next);render();};
      if (!candidate || Object.hasOwn(steps,candidate)) sync(stage);
    }
    for (const input of document.querySelectorAll('input[name=stage]')) input.addEventListener('change',()=>{sync(input.value);render();});
    addEventListener('hashchange',()=>{if(location.hash!=='#main-content') render();});
    render();
  } else {
    if (new URLSearchParams(location.hash.slice(1)).has('scope')) el('copies-case').open=true;
    const parents = ['ui-kit','build-tool'];
    const samplePath = parent => 'node_modules/'+parent+'/node_modules/shared-utils';
    const params = () => new URLSearchParams(location.hash.slice(1));
    function render() {
      const state = params();
      const stage = state.get('scope') === 'after' ? 'after' : 'before';
      const parent = state.get('parent') === 'ui-kit' ? 'ui-kit' : 'build-tool';
      const sample = window.LabSamples[stage];
      document.querySelector('input[value="'+stage+'"]').checked = true;
      el('override-rule').textContent = stage==='after' ? '"overrides": { "ui-kit": { "shared-utils": "1.2.4" } }' : '"overrides": {}';
      for (const [tree,data] of [['before-tree',window.LabSamples.before],['after-tree',sample]]) {
        const list=el(tree);
        const buttons=[];
        for (const name of parents) {
          const li=document.createElement('li');
          li.append(name+'@1.0.0');
          const label='shared-utils@'+data.packages[samplePath(name)].version;
          if(tree==='before-tree') {li.append(document.createElement('br'),'└ '+label);}
          else {
            const button=document.createElement('button');
            button.type='button';
            button.textContent='└ '+label;
            button.setAttribute('aria-label',name+' → '+label);
            button.setAttribute('aria-pressed',String(state.get('parent')===name));
            button.addEventListener('click',()=>{sync('scope='+stage+'&parent='+name);render();el('after-tree').querySelector('[aria-pressed=true]').focus();});
            li.append(button);
          }
          buttons.push(li);
        }
        list.replaceChildren(...buttons);
      }
      const after=stage==='after';
      el('compare-old').hidden=!after;
      el('copies-title').textContent=after?t('Осталась одна копия 1.2.3','One copy of 1.2.3 remains'):t('Два пакета установили 1.2.3','Two packages installed 1.2.3');
      el('copies-hint').textContent=after?t('Нажмите на 1.2.3. Путь покажет, какой пакет ещё предстоит обновить.','Click 1.2.3 to trace the package that still needs attention.'):t('У каждой строки свой родитель. Попробуйте обновить копию, которая приехала с кнопками.','Each copy has its own parent. Try updating the one installed by the UI components.');
      const picked=parents.includes(state.get('parent'));
      el('who-brought-it').hidden=!picked;
      el('override-next').textContent=stage==='before'?t('Обновить копию под ui-kit →','Update the copy under ui-kit →'):t('Вернуться к двум старым копиям','Restore both old copies');
      el('override-next').onclick=()=>{sync(stage==='before'?'scope=after':'scope=before');render();};
      const physical = samplePath(parent), version = sample.packages[physical].version;
      el('parent-title').textContent = parent+' → shared-utils@'+version;
      el('parent-reason').textContent = stage==='before' ? t('Родитель запрашивает ровно 1.2.3. В этой ревизии замен нет.','The parent requests exactly 1.2.3. This revision declares no overrides.') :
        parent==='ui-kit' ? t('В package.json библиотеки кнопок указана 1.2.3. Правило в корне проекта меняет именно эту копию на 1.2.4.','ui-kit declares 1.2.3. The root override selects 1.2.4 for this copy.') :
          t('У build-tool собственная копия. Правило ограничено веткой ui-kit, поэтому под build-tool остаётся 1.2.3.','build-tool has its own copy. The rule is scoped to ui-kit, so build-tool keeps 1.2.3.');
      el('copy-path').textContent = 'npm explain '+physical;
      el('nested-tree').href=ReviewExample.link('tree.html','copies',stage,physical);
      el('nested-compare').href=ReviewExample.link('compare.html','copies',stage,physical);
      if(el('copies-case').open) sync('scope='+stage+(picked?'&parent='+parent:''));
    }
    for (const input of document.querySelectorAll('input[name=scope]')) input.addEventListener('change',()=>{
      const state=params();state.set('scope',input.value);sync(state.toString());render();
    });
    addEventListener('hashchange',()=>{if(location.hash!=='#main-content') render();});
    render();
  }
})();
