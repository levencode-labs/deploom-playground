'use strict';
(() => {
  const { t, urlFor, setExampleState } = window.Lab;
  const form = document.querySelector('#input');
  const el = id => document.getElementById(id);
  const peer = !!document.querySelector('[data-experiment="peer"]');
  const publicState = new URLSearchParams(location.search);
  const rangeForm = el('range-form');
  if (rangeForm) {
    const fields = rangeForm.elements;
    const cases = {
      scheduler: { section: 'dependencies', versions: ['0.23.0','0.23.2','0.25.0'] },
      react: { section: 'peerDependencies', versions: ['18.2.0','18.3.1','19.0.0'] },
    };
    const operators = { caret: '^', tilde: '~', exact: '' };
    if (Object.hasOwn(cases, publicState.get('pkg'))) fields.pkg.value = publicState.get('pkg');
    if (Object.hasOwn(operators, publicState.get('op'))) fields.op.value = publicState.get('op');
    function refill(candidate) {
      const { versions } = cases[fields.pkg.value];
      fields.v.replaceChildren(...versions.map(v => new Option(v, v)));
      fields.v.value = versions.includes(candidate) ? candidate : versions[1];
    }
    function draw(save) {
      const pkg = fields.pkg.value;
      const { versions, section } = cases[pkg];
      const base = versions[0];
      const op = fields.op.value;
      const range = operators[op] + base;
      el('range-source').textContent = 'react-dom@18.2.0\n' + section + '.' + pkg + ' = "^' + base + '"';
      LabRangeScale.render(el('range-scale'), {range, selected:fields.v.value, candidates:versions});
      const max = (op === 'caret' && pkg === 'react') ? '19.0.0' : (pkg === 'react' ? '18.3.0' : '0.24.0');
      el('range-reason').textContent = op === 'exact' ? t('При точной записи подходит только ', 'An exact pin only accepts ') + base + '.' :
        t('Для стабильных версий ', 'For stable versions, ') + range + ' = >=' + base + ' <' + max + '.';
      if (save) setExampleState({pkg,op,v:fields.v.value});
    }
    rangeForm.addEventListener('change', event => {
      if (event.target === fields.pkg) refill();
      draw(true);
    });
    refill(publicState.get('v'));
    draw(false);
    return;
  }
  for (const radio of form.querySelectorAll('input[type="radio"]')) {
    if (radio.value === publicState.get(radio.name)) radio.checked = true;
  }
  if (!peer) {
    const ssr = el('ssr-case');
    if (location.hash === '#ssr-case' || publicState.has('api') || publicState.has('stack')) ssr.open = true;
    addEventListener('hashchange', () => {
      if (location.hash === '#ssr-case') ssr.open = true;
    });
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
