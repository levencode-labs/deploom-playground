'use strict';
function combinationIssues(plugin,bundler,adapter,allowAdapter) {
  const failures = [];
  if (plugin !== 2) failures.push('goal');
  if (plugin === 2 && bundler === 1) failures.push('bundler');
  if (adapter === 1 && bundler === 2) failures.push('adapter');
  if (adapter === 2 && !allowAdapter) failures.push('pinned');
  return failures;
}
if (typeof module === 'object' && module.exports) {
  module.exports = combinationIssues;
} else {
  const {t} = window.Lab;
  const byId = id => document.getElementById(id);
  const allowed = byId('allow-adapter');
  allowed.checked = new URLSearchParams(location.search).get('adapter') === '2';

  const rules = {
    goal:t('Цель — плагин v2.','The goal is plugin v2.'),
    bundler:t('Плагину v2 нужен сборщик v2.','Plugin v2 needs bundler v2.'),
    adapter:t('Адаптер v1 поддерживает только сборщик v1.','Adapter v1 supports only bundler v1.'),
    pinned:t('Адаптер закреплён на v1.','The adapter is pinned to v1.'),
  };
  function render() {
    const matrix = byId('matrix');
    matrix.replaceChildren();
    const fits = [];
    for (const plugin of [1,2]) for (const bundler of [1,2]) for (const adapter of [1,2]) {
      const row = matrix.insertRow();
      for (const v of [plugin,bundler,adapter]) row.insertCell().textContent = 'v'+v;
      const why = combinationIssues(plugin,bundler,adapter,allowed.checked).map(code=>rules[code]);
      const result = row.insertCell();
      result.dataset.valid = String(!why.length);
      result.textContent = why.join(' ') || t('Все условия выполнены.','Meets every constraint.');
      if (!why.length) fits.push([plugin,bundler,adapter]);
    }
    byId('adapter-node').dataset.blocked = String(!fits.length);
    byId('adapter-version').textContent = t('Адаптер','Adapter')+(allowed.checked ? ' · v2' : ' · v1');
    byId('adapter-reason').textContent = allowed.checked
      ? t('Обновление разрешено. Версия 2 поддерживает новый сборщик.','Upgrade allowed. Version 2 supports the new bundler.')
      : t('Закреплён на v1. Поддерживает только сборщик v1.','Held at v1. Only supports bundler v1.');
    const heading = document.createElement('strong');
    const explanation = document.createElement('p');
    if (fits.length) {
      const versions = fits[0].map(v=>'v'+v).join(' / ');
      const changes = fits[0].filter(v=>v!==1).length;
      heading.textContent = t('Подходит 1 из 8 сочетаний','1 of 8 combinations fits');
      explanation.textContent = t('Плагин / сборщик / адаптер — '+versions+'. Изменений относительно исходных версий — '+changes+'.',
        'Plugin / bundler / adapter — '+versions+'. Changes from the original versions: '+changes+'.');
    } else {
      heading.textContent = t('Подходит 0 из 8 сочетаний','0 of 8 combinations fit');
      explanation.textContent = t('Плагин требует новый сборщик, а закреплённый адаптер требует старый. Менять только плагин и сборщик недостаточно.',
        'The plugin needs the new bundler while the pinned adapter needs the old one. Upgrading only the plugin and bundler cannot satisfy both.');
    }
    const outcome = byId('outcome');
    outcome.dataset.valid = String(!!fits.length);
    outcome.replaceChildren(heading,explanation);
  }
  allowed.addEventListener('change',()=>{
    Lab.setExampleState({adapter:allowed.checked ? '2' : '1'});
    render();
  });
  byId('prompt').value = t(
    'Подготовь план обновления [пакет] до [версия] через get_upgrade_plan. Какие ещё пакеты придётся изменить и почему? Покажи требования и перечисли проверки после обновления. Пока только план.',
    'Use get_upgrade_plan to plan an upgrade of [package] to [version]. Which other packages must change and why? Show the requirements and list the checks to run after upgrading. Plan only.');
  byId('copy').addEventListener('click',async()=>{
    const prompt = byId('prompt');
    try {
      await navigator.clipboard.writeText(prompt.value);
      byId('copied').textContent = t('Запрос скопирован.','Request copied.');
    } catch {
      prompt.focus();
      prompt.select();
      byId('copied').textContent = t('Запрос выделен. Скопируйте текст с клавиатуры.','Request selected. Copy it with your keyboard.');
    }
  });
  render();
}
