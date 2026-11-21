'use strict';
(() => {
  const {t} = window.Lab;
  const el = id => document.getElementById(id);
  function sync(hash) {
    try {history.replaceState(null,'','#'+hash);} catch {}
  }

  const platforms = [...document.querySelectorAll('input[name=platform]')];
  const fromURL = new URLSearchParams(location.search).get('platform');
  for (const radio of platforms) {
    if (fromURL === radio.value) radio.checked = true;
    radio.addEventListener('change', () => {
      Lab.setExampleState({platform:radio.value});
      inspectPlatform();
    });
  }
  function inspectPlatform() {
    const platform = platforms.find(radio => radio.checked).value;
    const pkg = '@rollup/rollup-' + platform;
    const path = 'node_modules/' + pkg;
    const presence = lock => lock.packages[path]?.version || t('запись отсутствует','entry missing');
    el('platform-row').textContent = pkg + '\n' + t('Первый lock: ', 'First lock: ') + presence(RollupLab.before) +
      '\n' + t('Второй lock: ', 'Second lock: ') + presence(RollupLab.after);
    el('platform-why').textContent = RollupLab.after.packages[path] ?
      t('Запись для этого Mac сохранилась. Успешная сборка здесь не проверяет Linux.', 'The entry for this Mac survived. A successful build here does not exercise Linux.') :
      t('Во втором файле исчезла запись для этого Linux. Проверьте запуск Rollup в CI на том же образе.', 'The entry for this Linux target disappeared from the second file. Run Rollup on the same CI image to check the effect.');
    const focus = platform === 'linux-x64-gnu' ? '&focus=linux-gnu' : platform === 'linux-x64-musl' ? '&focus=linux-musl' : '&focus=darwin-arm64';
    el('platform-diff').href = Lab.urlFor('compare.html?example=rollup' + focus);
  }
  inspectPlatform();
  {
    const steps = {
      base: ['18.3.1','18.3.1',t('Версия в манифесте совпала с зафиксированной. npm ci поставил React 18.3.1.','The manifest and the lock agreed. npm ci installed React 18.3.1.')],
      mismatch: ['19.0.0','18.3.1',t('Манифест требует 19.0.0, а lock-файл содержит 18.3.1. npm ci остановился.','The manifest requires 19.0.0 but the lockfile records 18.3.1. npm ci stopped.')],
      fixed: ['19.0.0','19.0.0',t('После npm install --package-lock-only в lock-файле появилась 19.0.0. Повторный npm ci установил её.','npm install --package-lock-only recorded 19.0.0. Running npm ci again installed that release.')],
    };
    function render() {
      const candidate = location.hash.slice(1);
      const stage = Object.hasOwn(steps,candidate) ? candidate : 'base';
      const [requested,locked,why] = steps[stage];
      document.querySelector('input[value="'+stage+'"]').checked = true;
      el('manifest-line').textContent = '"dependencies": { "react": "'+requested+'" }';
      el('lock-line').textContent = '"version": "'+locked+'"';
      const failed = stage === 'mismatch';
      el('ci-result').dataset.status = failed ? 'fail' : 'pass';
      for (const id of ['lock-line','manifest-line']) el(id).classList.toggle('ci-conflict',failed);
      el('ci-verdict').textContent = failed ? t('npm ci остановился','npm ci stopped') : t('Установка прошла','Installation passed');
      el('ci-why').textContent = why;
      el('ci-log').textContent = failed ? "$ npm ci --ignore-scripts\nnpm error code EUSAGE\nnpm error Invalid: lock file's react@18.3.1 does not satisfy react@19.0.0" : '$ npm ci --ignore-scripts\nexit 0\n$ node -p "require(\'react\').version"\n'+locked;
      const next = stage==='base'?'mismatch':stage==='mismatch'?'fixed':'base';
      el('ci-next').textContent={base:t('Изменить одну строку в package.json →','Edit one line in package.json →'),mismatch:t('Обновить lock и повторить npm ci →','Update the lock and retry npm ci →'),fixed:t('Вернуться к исходной ветке','Back to the original branch')}[stage];
      el('ci-next').onclick=()=>{sync(next);render();};
      if (Object.hasOwn(steps,candidate) && !el('manifest-case').open) {
        el('manifest-case').open = true;
        el('manifest-case').scrollIntoView();
      }
    }
    for (const input of document.querySelectorAll('input[name=stage]')) input.addEventListener('change',()=>{sync(input.value);render();});
    addEventListener('hashchange',()=>{if(location.hash!=='#main-content') render();});
    render();
  }
})();
