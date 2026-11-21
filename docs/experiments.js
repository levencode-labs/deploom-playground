'use strict';
(() => {
  const t = window.Lab.t;
  const form = document.querySelector('#input');
  const peer = document.querySelector('[data-experiment]').dataset.experiment === 'peer';
  const el = id => document.getElementById(id);
  function show() {
    const data=new FormData(form);
    const react = data.get('react');
    const dom = data.get('dom');
    const old = data.get('factory')==='old';
    const removed = data.get('stack')==='19.0.0';
    const badPeer = peer && react==='18.2.0' && dom==='18.3.1';
    const badCall = !peer && removed && old;
    el('result').dataset.status=badPeer||badCall?'fail':'pass';
    el('install').textContent = badPeer ? 'ERESOLVE' : t('Прошла','Passed');
    el('render').textContent = badPeer ? t('Не запускался','Not run') : badCall ? 'TypeError' : t('Прошёл','Passed');
    if (peer) {
      const min = dom==='18.3.1'?'18.3.1':'18.2.0';
      el('verdict').textContent = badPeer?t('npm отклонил сочетание','npm rejected the pair'):t('Установка и рендер прошли','Install and render passed');
      el('why').textContent = t('React DOM '+dom+' требует react@^'+min+'. Версия '+react+(badPeer?' ниже нижней границы.':' входит в этот диапазон.'),'React DOM '+dom+' requires react@^'+min+'. Version '+react+(badPeer?' is below the lower bound.':' satisfies that range.'));
      el('evidence').textContent=badPeer?'npm error code ERESOLVE\npeer react@"^18.3.1" from react-dom@18.3.1':'renderToString → <p>DepLoom</p>';
    } else {
      el('verdict').textContent=badCall?t('Установка прошла, рендер упал','Install passed, render failed'):t('Кнопка отрендерилась','The button rendered');
      el('why').textContent=old ? (removed?t('В React 19 удалили createFactory. Обе библиотеки установились, но приложение упало при создании элемента.','React 19 removed createFactory. Both packages installed, but creating the element failed.'):t('В React 18 вызов ещё работает. В режиме разработки React предупреждает, что createFactory устарел.','React 18 still supports this call and prints a deprecation warning in development.')) :t('createElement доступен в обеих версиях. Проверка сравнила итоговую HTML-строку с ожидаемой.','Both versions provide createElement. The check compared the resulting HTML with the expected string.');
      el('evidence').textContent=(old?"React.createFactory('button')(null, 'OK')":"React.createElement('button', null, 'OK')")+'\n'+(badCall?'TypeError: React.createFactory is not a function':'renderToString → <button>OK</button>');
    }
  }
  form.addEventListener('change',show);
  show();
})();
