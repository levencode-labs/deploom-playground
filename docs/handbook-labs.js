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
    const engines = [1, 2, 3];
    const plugins = [
      {name: 'A', original: [1, 2], updated: [2, 3]},
      {name: 'B', original: [2, 3], updated: [1, 2]},
      {name: 'C', original: [1, 3], updated: [2, 3]}
    ];
    function selectField(caption, options) {
      const label = node('label', '', caption);
      const select = node('select');
      for (const [value, text] of options) {
        const option = node('option', '', text);
        option.value = value;
        select.append(option);
      }
      label.append(select);
      select.addEventListener('change', update);
      return {label, select};
    }
    const controls = node('div', 'host-controls');
    const target = selectField(t('Какой движок оставить?', 'Which engine should stay?'), [
      ['2', t('Версию 2', 'Version 2')], ['1', t('Версию 1', 'Version 1')],
      ['3', t('Версию 3', 'Version 3')], ['any', t('Любую версию', 'Any version')]
    ]);
    const replacement = selectField(t('Какой плагин обновить?', 'Which plugin should we update?'), [
      ['', t('Пока ни один', 'Keep all three as they are')],
      ...plugins.map(p => [p.name, t('Обновить ', 'Update ')+p.name])
    ]);
    controls.append(target.label, replacement.label);
    const table = node('table', 'host-matrix');
    const thead = table.createTHead().insertRow();
    for (const text of [t('Плагин', 'Plugin'), ...engines.map(v => t('Движок ', 'Engine ')+v)]) {
      const cell = node('th', '', text);
      cell.scope = 'col';
      thead.append(cell);
    }
    const tbody = table.createTBody();
    const rows = plugins.map(plugin => {
      const row = tbody.insertRow();
      const cap = node('th');
      cap.scope = 'row';
      const label = node('label');
      const input = node('input');
      input.type = 'checkbox';
      input.checked = true;
      label.append(input, plugin.name);
      input.addEventListener('change', update);
      const release = node('small');
      cap.append(label, release);
      row.append(cap);
      const cells = engines.map(() => row.insertCell());
      return {row, input, release, cells};
    });
    const out = result();
    function update() {
      const candidates = target.select.value === 'any' ? engines : [Number(target.select.value)];
      const domains = plugins.map(p => p.name === replacement.select.value ? p.updated : p.original);
      const active = plugins.map((p,i) => i).filter(i => rows[i].input.checked);
      const fits = candidates.filter(v => active.every(i => domains[i].includes(v)));
      const blockers = active.filter(i => !domains[i].includes(candidates[0]));
      const blockerNames = blockers.map(i => plugins[i].name).join(', ');
      rows.forEach(({row, input, release, cells}, i) => {
        const isNew = replacement.select.value === plugins[i].name;
        release.textContent = isNew ? t(' новый выпуск', ' new release') : '';
        row.classList.toggle('inactive-plugin', !input.checked);
        cells.forEach((cell, vi) => {
          const supported = domains[i].includes(engines[vi]);
          cell.textContent = supported ? '✓' : '—';
          cell.setAttribute('aria-label', supported ? t('Поддерживает', 'Supported') : t('Не поддерживает', 'Unsupported'));
        });
      });
      for (const row of table.rows) {
        Array.from(row.cells).slice(1).forEach((cell, i) => cell.classList.toggle('accepted-host', fits.includes(engines[i])));
      }
      if (!active.length) {
        out.update(t('Все плагины выключены', 'All plugins are off'), t('Включите хотя бы один, чтобы проверить его вместе с движком.', 'Enable a plugin to check it with the engine.'), 'neutral');
      } else if (fits.length) {
        out.update(t('Работает с движком ', 'Works with engine ')+fits.join(', '),
          t('У каждого включённого плагина есть галочка в выделенном столбце. В реальном проекте запустите сборку с этими версиями и проверьте, что сработали все нужные плагины.', 'Every enabled plugin has a check in the highlighted column. In a real project, build with these versions and check that each plugin does its job.'), 'ok');
      } else if (candidates.length === 1) {
        const engine = candidates[0];
        const repair = blockers.length === 1 && plugins[blockers[0]].updated.includes(engine) && replacement.select.value !== plugins[blockers[0]].name
          && active.every(i => i === blockers[0] || plugins[i].original.includes(engine));
        const summary = blockers.length === 1 ? t('Плагин '+blockerNames+' не поддерживает движок '+engine, 'Plugin '+blockerNames+' does not support engine '+engine)
          : t('Плагины '+blockerNames+' не поддерживают движок '+engine, 'Plugins '+blockerNames+' do not support engine '+engine);
        out.update(summary,
          repair ? t('В столбце «Движок '+engine+'» у '+blockerNames+' стоит прочерк. В этом примере у '+blockerNames+' вышла версия с нужной поддержкой. Выберите «Обновить '+blockerNames+'» и сравните тот же столбец.', 'Look at the dash for '+blockerNames+' under Engine '+engine+'. In this example '+blockerNames+' has a release that adds support. Choose “Update '+blockerNames+'” and compare that column.')
            : t('У выделенного вами движка в строках '+blockerNames+' есть прочерк. Попробуйте другой выпуск плагина или выберите другую версию движка.', 'The chosen engine has a dash for '+blockerNames+'. Try another plugin release or choose another engine version.'), 'bad');
      } else {
        out.update(t('Три версии движка, ни одной общей', 'None of the three engines fits'), t('В каждом столбце остался хотя бы один прочерк. Выберите движок 2 и посмотрите, какой единственный плагин мешает его оставить.', 'Every column has at least one dash. Choose engine 2 and find the one plugin that rules it out.'), 'bad');
      }
    }
    stage.append(node('p', 'host-intro', t('Движок здесь — сам редактор заметок. Галочка в таблице означает, что автор плагина указал поддержку этой версии редактора. Названия и выпуски в опыте вымышлены.', 'The engine here is the note editor itself. A check means the plugin author lists that editor version as supported. The plugins and releases in this exercise are fictional.')), controls, table, out.box);
    update();
  }

  function formik(stage) {
    const scenes = [
      {
        label: t('До отчётов', 'Before Reports'),
        ui: 'node_modules/formik · 1.5.8',
        app: 'packages/site → node_modules/formik · 1.5.8',
        value: t('Поле и сайт нашли Formik 1', 'The field and the site found Formik 1'),
        why: t('Сайт попросил Formik 1. Yarn положил его в общую папку. Поле из ui тоже нашло его там, хотя в packages/ui/package.json про Formik ничего не было.', 'Site requested Formik 1, and Yarn put it in the shared folder. The field in ui picked it up there even though packages/ui/package.json never mentioned Formik.'), tone: 'warn'
      },
      {
        label: t('Добавили отчёты', 'Add Reports'),
        ui: 'node_modules/formik · 2.1.2',
        app: 'packages/reports → node_modules/formik · 2.1.2',
        value: t('Тот же импорт теперь нашёл Formik 2', 'The same import now finds Formik 2'),
        why: t('Админка уже просила Formik 2, теперь его попросили и отчёты. При этой установке Yarn положил в общую папку 2.1.2. Старое поле по-прежнему ищет в той же папке и получает другую версию.', 'Admin already requested Formik 2 and Reports now requests it too. In this install Yarn put 2.1.2 in the shared folder. The old field looks in exactly the same place and gets a different version.'), tone: 'bad'
      },
      {
        label: t('Добавили Formik в ui', 'Pin Formik in ui'),
        ui: 'node_modules/formik · 1.5.8',
        app: 'packages/reports/node_modules/formik · 2.1.2',
        value: t('У поля версия 1, у отчётов версия 2', 'The field uses v1 and Reports uses v2'),
        why: t('Общие поля снова получили Formik 1. Но страница отчётов открывает такую форму через Formik 2. В истории автора TypeScript остановился на имени FormikActions, которого во второй версии уже не было.', 'The shared fields got Formik 1 again. But Reports opens the same form with Formik 2. In the original report TypeScript stopped at FormikActions, a name missing from the second version.'), tone: 'bad'
      },
      {
        label: t('Согласовали версии', 'Use a shared version'),
        ui: 'node_modules/formik · 1.5.8',
        app: 'packages/reports → node_modules/formik · 1.5.8',
        value: t('Страница и её поле используют одну копию', 'The page and its field use the same copy'),
        why: t('В ui записали, что полю нужен Formik 1 от приложения. В отчётах выбрали подходящую версию. Теперь страница отчётов и поле читают один и тот же Formik. Отдельная админка может оставить свою копию для собственных форм.', 'The ui package declares that its fields expect the app to supply Formik 1. Reports selects a compatible version. The page and its field now read the same Formik, while the separate Admin app can keep its own copy for its own forms.'), tone: 'ok'
      }
    ];
    const controls = node('div', 'experiment-options');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', t('Что изменилось в проекте', 'What changed in the project'));
    const trail = node('ol', 'formik-story');
    const pairs = [
      [t('Строка в packages/ui/EmailField.tsx', 'Line in packages/ui/EmailField.tsx'), "import { Field } from 'formik'"],
      [t('Откуда поле загрузило Formik', 'Where the field loaded Formik from'), ''],
      [t('Откуда приложение загрузило Formik', 'Where the app loaded Formik from'), '']
    ].map(([caption, text]) => {
      const li = node('li');
      const code = node('code', '', text);
      li.append(node('span', '', caption), code);
      trail.append(li);
      return code;
    });
    const out = result();
    const options = scenes.map((scene,i) => {
      const el = button(scene.label);
      el.addEventListener('click', () => show(i));
      return el;
    });
    function show(index) {
      const scene = scenes[index];
      options.forEach((el,i) => el.setAttribute('aria-pressed', String(i === index)));
      pairs[1].textContent = scene.ui;
      pairs[2].textContent = scene.app;
      out.update(scene.value, scene.why, scene.tone);
    }
    controls.append(...options);
    stage.append(controls, trail, out.box);
    show(0);
  }

  function render(lesson) {
    const panel = node('section', 'book-experiment');
    const head = node('div', 'experiment-head');
    head.append(node('span', 'experiment-symbol', '⌁'), node('span', '', t('Учебная модель', 'Interactive model')));
    const stage = node('div', 'experiment-stage');
    let prompt = local(lesson.lab.prompt);
    if (lesson.id === 'range-and-lock') prompt = t('Какая версия установится?', 'Which version gets installed?');
    if (lesson.id === 'shared-host') prompt = t('Как оставить все три плагина?', 'How can we keep all three plugins?');
    if (lesson.id === 'borrowed-dependency') prompt = t('Откуда форма возьмёт Formik?', 'Where will the field find Formik?');
    const title = node('h2', '', prompt);
    panel.append(head, title, stage);
    if (lesson.id === 'range-and-lock') range(stage);
    else if (lesson.id === 'shared-host') host(stage);
    else if (lesson.id === 'borrowed-dependency') formik(stage);
    else if (Object.hasOwn(DepLoomExtraLabs, lesson.id)) DepLoomExtraLabs[lesson.id](stage);
    else choices(lesson, stage);
    return panel;
  }
  return {render};
})();
