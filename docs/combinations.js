'use strict';
(() => {
  const { t } = window.Lab;
  document.title = t('Сочетания версий · DepLoom', 'Version combinations · DepLoom');
  const form = document.querySelector('#scope');
  const target = document.querySelector('#target');
  const bundler = document.querySelector('#bundler');
  const companion = document.querySelector('#companion');
  const summary = document.querySelector('#summary');
  const selection = document.querySelector('#selection');
  const grids = document.querySelector('#grids');
  const pluginName = t('Плагин', 'Plugin');
  const bundlerName = t('Сборщик', 'Bundler');
  const adapterName = t('Адаптер', 'Adapter');

  function element(tag, value) {
    const node = document.createElement(tag);
    node.textContent = value;
    return node;
  }

  function verdict(pair) {
    const reasons = [];
    if (pair[target.value] !== 2) {
      reasons.push(target.value === 'plugin'
        ? t('Цель требует плагин версии 2.', 'The goal requires plugin v2.')
        : t('Цель требует адаптер версии 2.', 'The goal requires adapter v2.'));
    }
    if (!bundler.checked && pair.bundler !== 1) {
      reasons.push(t('Сборщик закреплён на версии 1.', 'The bundler is held at v1.'));
    }
    const other = target.value === 'plugin' ? 'adapter' : 'plugin';
    if (!companion.checked && pair[other] !== 1) {
      reasons.push(other === 'plugin'
        ? t('Плагин закреплён на версии 1.', 'The plugin is held at v1.')
        : t('Адаптер закреплён на версии 1.', 'The adapter is held at v1.'));
    }
    if (pair.plugin === 2 && pair.bundler === 1) {
      reasons.push(t('Плагину версии 2 нужен сборщик версии 2.', 'Plugin v2 requires bundler v2.'));
    }
    if (pair.adapter === 1 && pair.bundler === 2) {
      reasons.push(t('Старый адаптер поддерживает только сборщик версии 1.', 'Adapter v1 supports only bundler v1.'));
    }
    return reasons;
  }

  function describe(p) {
    return [pluginName+' '+p.plugin, bundlerName+' '+p.bundler, adapterName+' '+p.adapter].join(' · ');
  }

  const pairs = [];
  for (const b of [1, 2]) {
    const table = document.createElement('table');
    table.createCaption().textContent = bundlerName+' '+b;
    const head = table.createTHead().insertRow();
    for (const label of ['', pluginName+' 1', pluginName+' 2']) {
      const th = element('th', label);
      if (label) th.scope = 'col';
      head.append(th);
    }
    const body = table.createTBody();
    for (const a of [1, 2]) {
      const row = body.insertRow();
      const rowTitle = element('th', adapterName+' '+a);
      rowTitle.scope = 'row';
      row.append(rowTitle);
      for (const p of [1, 2]) {
        const pair = { plugin:p, bundler:b, adapter:a, changes:(p-1)+(b-1)+(a-1) };
        pair.button = element('button','');
        pair.button.type = 'button';
        pair.button.className = 'combo-cell';
        pair.button.addEventListener('click', () => select(pair));
        row.insertCell().append(pair.button);
        pairs.push(pair);
      }
    }
    grids.append(table);
  }

  let selected = pairs.find(p => p.plugin === 2 && p.bundler === 2 && p.adapter === 1);
  function select(pair) {
    selected = pair;
    for (const p of pairs) p.button.setAttribute('aria-pressed', String(p === pair));
    const reasons = verdict(pair);
    const title = element('strong', describe(pair));
    title.className = 'combo-state';
    selection.replaceChildren(title);
    if (reasons.length) {
      const list = document.createElement('ul');
      for (const reason of reasons) list.append(element('li',reason));
      selection.append(list);
    } else {
      selection.append(element('p',t('Все условия выполнены. Изменений относительно исходного проекта — ', 'All constraints are met. Changes from the original project: ')+pair.changes+'.'));
    }
  }

  function update() {
    document.querySelector('#companion-label').textContent = target.value === 'plugin' ? adapterName : pluginName;
    const allowed = [];
    for (const pair of pairs) {
      const valid = verdict(pair).length === 0;
      if (valid) allowed.push(pair);
      pair.button.textContent = valid ? '✓' : '×';
      pair.button.dataset.valid = String(valid);
      pair.button.setAttribute('aria-label',describe(pair)+' — '+(valid ? t('подходит','fits') : t('не подходит','ruled out')));
    }
    summary.dataset.valid = String(allowed.length > 0);
    summary.replaceChildren(element('strong',t('Подходящих сочетаний — '+allowed.length+' из 8',allowed.length+' of 8 combinations fit')));
    if (allowed.length) {
      const best = allowed.reduce((a,b)=>a.changes <= b.changes ? a : b);
      summary.append(element('p',t('Минимум изменений — '+best.changes+'. ', 'Fewest changes: '+best.changes+'. ')+describe(best)+'.'));
    } else {
      const fixed = [];
      if (!bundler.checked) fixed.push(t('сборщик','bundler'));
      if (!companion.checked) fixed.push(t('адаптер','adapter'));
      const names = fixed.join(t(' и ',' and '));
      summary.append(element('p',t('Плагину 2 нужен сборщик 2, а ему подходит только адаптер 2. Чтобы продолжить, разрешите менять '+names+'.', 'Plugin v2 needs bundler v2, which only works with adapter v2. Allow changes to the '+names+' to continue.')));
    }
    select(selected);
  }
  form.addEventListener('change',update);
  update();
})();
