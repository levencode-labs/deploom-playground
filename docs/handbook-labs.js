'use strict';

globalThis.DepLoomBookLabs = (() => {
  const { t } = Lab;
  const local = pair => t(...pair);
  function node(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }
  function button(text) {
    const el = node('button', 'experiment-option', text);
    el.type = 'button';
    return el;
  }
  function result() {
    const box = node('div', 'experiment-result');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-atomic', 'true');
    const value = node('strong');
    const detail = node('p');
    box.append(value, detail);
    return {box, update(outcome, reason, tone) {
      value.textContent = outcome;
      detail.textContent = reason;
      box.dataset.tone = tone;
    }};
  }
  function choices(lesson, stage) {
    const controls = node('div', 'experiment-options');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', local(lesson.lab.prompt));
    const out = result();
    const buttons = lesson.lab.states.map((state, index) => {
      const el = button(local(state.label));
      el.addEventListener('click', () => change(index));
      return el;
    });
    function change(index) {
      const state = lesson.lab.states[index];
      buttons.forEach((el, i) => el.setAttribute('aria-pressed', String(i === index)));
      out.update(local(state.value), local(state.detail), state.tone);
    }
    controls.append(...buttons);
    stage.append(controls, out.box);
    change(0);
  }
  function range(stage) {
    const releases = ['1.2.0', '1.2.4', '1.9.0', '2.0.0'];
    const pinned = '1.2.4';
    const controls = node('div', 'range-controls');
    const rangeLabel = node('label', 'range-field', t('Диапазон в package.json', 'Range in package.json'));
    const input = node('input');
    input.type = 'text';
    input.value = '^1.2.0';
    input.maxLength = 120;
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.dir = 'ltr';
    rangeLabel.append(input);
    const lockLabel = node('label', 'lock-control');
    const lock = node('input');
    lock.type = 'checkbox';
    lock.checked = true;
    lockLabel.append(lock, t('Сохранить lock с 1.2.4', 'Keep lockfile with 1.2.4'));
    controls.append(rangeLabel, lockLabel);
    const candidates = node('ol', 'release-rail');
    candidates.setAttribute('aria-label', t('Версии в учебном реестре', 'Versions in the example registry'));
    const markers = releases.map(version => {
      const mark = node('li');
      mark.append(node('i'), node('code', '', version), node('small'));
      candidates.append(mark);
      return mark;
    });
    const out = result();
    function update() {
      const req = input.value.trim();
      const valid = Boolean(req && treeSemver.validRange(req));
      input.setAttribute('aria-invalid', String(!valid));
      const allowed = releases.filter(version => valid && treeSemver.satisfies(version, req));
      const usePinned = lock.checked && allowed.includes(pinned);
      const selected = usePinned ? pinned : allowed[allowed.length - 1];
      markers.forEach((mark, i) => {
        const version = releases[i];
        const chosen = version === selected;
        const fits = allowed.includes(version);
        mark.dataset.state = chosen ? 'chosen' : fits ? 'allowed' : 'outside';
        mark.lastChild.textContent = chosen ? t('выбрана', 'selected') : fits ? t('подходит', 'in range') : valid ? t('вне диапазона', 'out of range') : '—';
      });
      if (!valid) out.update(t('Проверьте диапазон', 'Check the range'), t('Попробуйте ^1.2.0, ~1.2.0 или точную версию 2.0.0.', 'Try ^1.2.0, ~1.2.0 or the exact version 2.0.0.'), 'warn');
      else if (!selected) out.update(t('Подходящих версий в этом каталоге нет', 'No release in this catalog matches'), t('В учебном реестре четыре выпуска. Введите диапазон, в который попадает хотя бы один.', 'The example registry has four releases. Try a range that includes one of them.'), 'warn');
      else out.update(t('Установится ', 'Installs ')+selected, usePinned
        ? t('Версия из lock-файла подходит. Снимите галочку и посмотрите, какую версию выберет новая установка.', 'The locked version fits. Clear the checkbox to see which version a fresh resolution would choose.')
        : lock.checked ? t('Зафиксированная 1.2.4 вышла за границы. Обычная установка в этой модели выбирает старшую подходящую версию и обновляет lock.', 'The locked 1.2.4 is outside the range. A regular install in this model resolves the highest matching release and updates the lockfile.')
        : t('Без записи в lock-файле модель выбирает старшую подходящую версию из показанного каталога.', 'With no locked entry, the model selects the highest matching release in this catalog.'), 'ok');
    }
    stage.append(controls, candidates, out.box);
    input.addEventListener('input', update);
    lock.addEventListener('change', update);
    update();
  }
  function host(stage) {
    const domains = [[1, 2], [2, 3], [1, 3]];
    const table = node('table', 'host-matrix');
    const thead = table.createTHead().insertRow();
    for (const label of [t('Плагин', 'Plugin'), 'v1', 'v2', 'v3']) {
      const cell = node('th', '', label);
      cell.scope = 'col';
      thead.append(cell);
    }
    const tbody = table.createTBody();
    const inputs = domains.map((domain, index) => {
      const row = tbody.insertRow();
      const cap = node('th');
      cap.scope = 'row';
      const label = node('label');
      const input = node('input');
      input.type = 'checkbox';
      input.checked = index !== 2;
      label.append(input, 'ABC'[index]);
      cap.append(label);
      row.append(cap);
      for (const version of [1, 2, 3]) {
        const cell = row.insertCell();
        const supported = domain.includes(version);
        cell.textContent = supported ? '✓' : '—';
        cell.setAttribute('aria-label', supported ? t('Поддерживает', 'Supported') : t('Не поддерживает', 'Unsupported'));
      }
      input.addEventListener('change', update);
      return input;
    });
    const out = result();
    function update() {
      const active = domains.filter((domain, i) => inputs[i].checked);
      const accepted = [1, 2, 3].filter(version => active.every(domain => domain.includes(version)));
      for (const row of table.rows) {
        Array.from(row.cells).slice(1).forEach((cell, i) => {cell.classList.toggle('accepted-host', accepted.includes(i+1));});
      }
      inputs.forEach(input => {input.closest('tr').classList.toggle('inactive-plugin', !input.checked);});
      const ok = accepted.length > 0;
      out.update(ok ? t('Общий движок: ', 'Shared host: ')+accepted.map(v => 'v'+v).join(', ') : t('Общей версии нет', 'No shared version'),
        !active.length ? t('Включите плагин, чтобы увидеть его требования.', 'Enable a plugin to see its constraints.')
        : ok ? t('Выделенные столбцы подходят каждому включённому плагину. Попробуйте включить все три.', 'The highlighted columns work for every enabled plugin. Try enabling all three.')
        : t('В каждом столбце один из трёх плагинов отказывается работать. Отключите любой плагин и сравните результат.', 'In every column one plugin rules out that host. Turn off any one plugin and compare the result.'), ok ? 'ok' : 'bad');
    }
    stage.append(table, out.box);
    update();
  }
  function render(lesson) {
    const panel = node('section', 'book-experiment');
    const head = node('div', 'experiment-head');
    head.append(node('span', 'experiment-symbol', '⌁'), node('span', '', t('Учебная модель', 'Interactive model')));
    const stage = node('div', 'experiment-stage');
    let prompt = local(lesson.lab.prompt);
    if (lesson.id === 'range-and-lock') prompt = t('Какая версия установится?', 'Which version gets installed?');
    if (lesson.id === 'shared-host') prompt = t('Какой движок подойдёт всем плагинам?', 'Which host works for every plugin?');
    const title = node('h2', '', prompt);
    panel.append(head, title, stage);
    if (lesson.id === 'range-and-lock') range(stage);
    else if (lesson.id === 'shared-host') host(stage);
    else if (Object.hasOwn(DepLoomExtraLabs, lesson.id)) DepLoomExtraLabs[lesson.id](stage);
    else choices(lesson, stage);
    return panel;
  }
  return {render};
})();
