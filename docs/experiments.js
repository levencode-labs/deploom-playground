'use strict';
(() => {
  const { t, urlFor, setExampleState } = window.Lab;
  const form = document.querySelector('#input');
  const el = id => document.getElementById(id);
  const peer = !!document.querySelector('[data-experiment="peer"]');
  const publicState = new URLSearchParams(location.search);
  for (const radio of form.querySelectorAll('input[type="radio"]')) {
    if (radio.value === publicState.get(radio.name)) radio.checked = true;
  }
  function show(changed) {
    const data = Object.fromEntries(new FormData(form));
    if (changed) setExampleState(data);
    if (peer) {
      const { react, dom } = data;
      const range = '^' + dom;
      const ok = treeSemver.satisfies(react, range);
      el('result').dataset.status = ok ? 'pass' : 'fail';
      el('issuer').textContent = 'react-dom@' + dom;
      el('edge').textContent = t('требует ', 'requires ') + 'react@' + range + ' →';
      el('chosen').textContent = 'react@' + react;
      el('verdict').textContent = ok ? t('Обе версии можно установить', 'These versions install together') : 'npm · ERESOLVE';
      LabRangeScale.render(el('scale'), {range, selected: react, candidates:['18.2.0','18.3.1','19.0.0']});
      el('evidence').textContent = ok ? 'npm install · exit 0' :
        'peer react@"' + range + '" from react-dom@' + dom;
      el('inspect-tree').href = urlFor('tree.html?' + new URLSearchParams({ react, dom }));
      el('evidence').setAttribute('aria-pressed', 'false');
      form.closest('section').classList.remove('highlight-peer');
    } else {
      const old = data.api === 'createFactory';
      const fail = old && data.stack === '19.0.0';
      el('install').textContent = t('прошла', 'passed');
      el('call').textContent = old ? "React.createFactory('button')(null, 'OK')" : "React.createElement('button', null, 'OK')";
      el('ssr').textContent = fail ? 'TypeError: React.createFactory is not a function' : '<button>OK</button>';
      el('result').dataset.status = fail ? 'fail' : 'pass';
      el('why').textContent = fail ? t('В React 19 удалили createFactory. Ошибка возникает, когда приложение вызывает эту функцию.', 'React 19 removed createFactory. The error occurs when the app calls that function.') :
        t('Результат renderToString совпал с ожидаемым HTML.', 'The renderToString output matched the expected HTML.');
    }
  }
  if (peer) el('evidence').addEventListener('click', () => {
    const highlight = form.closest('section').classList.toggle('highlight-peer');
    el('evidence').setAttribute('aria-pressed', String(highlight));
  });
  form.addEventListener('change', () => show(true));
  show(false);
})();
