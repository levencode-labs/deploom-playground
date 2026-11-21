'use strict';

globalThis.DepLoomExtraLabs = (() => {
  const {t} = Lab;

  function node(tag, className = '', text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function status() {
    const box = node('div', 'experiment-result');
    const value = node('strong');
    const detail = node('p');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-atomic', 'true');
    box.append(value, detail);
    return {box, update(summary, explanation, tone) {
      value.textContent = summary;
      detail.textContent = explanation;
      box.dataset.tone = tone;
    }};
  }

  function reactInstance(stage) {
    // Separate paths bind to separate objects, even though both report 18.2.0.
    const modules = [
      {version: '18.2.0', path: 'app/node_modules/react'},
      {version: '18.2.0', path: 'ui/node_modules/react'}
    ];
    const routeNames = [t('Из приложения', 'App copy'), t('Из библиотеки UI', 'UI library copy')];
    const roles = [t('Компонент UI', 'UI component'), t('Рендерер React DOM', 'React DOM renderer')];
    const selections = [1, 0];
    const group = node('div', 'book-module-routes');
    const out = status();
    const routes = roles.map((role, index) => {
      const card = node('fieldset', 'book-module-route');
      const path = node('code', 'book-module-path');
      const buttons = routeNames.map((name, route) => {
        const button = node('button', 'experiment-option', name);
        button.type = 'button';
        button.addEventListener('click', () => {
          selections[index] = route;
          update();
        });
        return button;
      });
      const controls = node('div', 'experiment-options');
      controls.append(...buttons);
      card.append(node('legend', '', role), controls, path);
      group.append(card);
      return {path, buttons};
    });

    function update() {
      const [componentReact, rendererReact] = selections.map(index => modules[index]);
      routes.forEach(({path, buttons}, i) => {
        const selected = selections[i];
        const mod = modules[selected];
        path.textContent = mod.path + ' · ' + mod.version;
        buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === selected)));
      });
      const same = componentReact === rendererReact;
      out.update(
        same ? 'componentReact === rendererReact' : 'componentReact !== rendererReact',
        same ? t('Оба пути ведут к одному объекту React. При такой связи у хука и рендерера общий экземпляр.', 'Both imports resolve to one React object. The Hook and the renderer share that instance.')
          : t('Версия в обоих каталогах одна, но объекты разные. Хук библиотеки обращается к другой копии, чем рендерер. Направьте один импорт туда же, куда другой.', 'Both directories report the same version, but their objects differ. The library’s Hook uses a different copy from its renderer. Route either import to the same location as the other.'),
        same ? 'ok' : 'bad'
      );
    }

    stage.append(group, out.box);
    update();
  }

  function repeatCodemod(stage) {
    // MUI X v8.0.0 rename-adapter-date-fns-imports matches these two endpoints.
    const renames = new Map([
      ['AdapterDateFnsV3', 'AdapterDateFns'],
      ['AdapterDateFns', 'AdapterDateFnsV2']
    ]);
    let adapter = 'AdapterDateFnsV3';
    let runs = 0;
    const file = node('div', 'book-adapter-file');
    const header = node('div', 'book-adapter-head');
    const counter = node('span');
    header.append(node('strong', '', 'DateField.tsx'), counter);
    const code = node('code', 'book-adapter-import');
    const path = node('b');
    code.append("import { AdapterDateFns } from\n  '@mui/x-date-pickers/", path, "'");
    file.append(header, code);
    const actions = node('div', 'experiment-options');
    const apply = node('button', 'experiment-option book-run-codemod', t('Применить codemod', 'Apply codemod'));
    const reset = node('button', 'experiment-option', t('Вернуть исходник', 'Reset source'));
    apply.type = reset.type = 'button';
    const out = status();

    function showSummary() {
      path.textContent = adapter;
      counter.textContent = t('Запусков: ', 'Runs: ') + runs;
      reset.disabled = runs === 0;
      if (runs === 0) {
        out.update(t('Исходник для MUI X v7', 'Starting source for MUI X v7'),
          t('У приложения установлен date-fns 3.6.0. В v7 подходящий адаптер импортировали из пути с окончанием V3. Примените переименование для перехода на v8.', 'The app uses date-fns 3.6.0. With MUI X v7 its adapter came from the path ending in V3. Apply the rename for the move to v8.'), 'neutral');
      } else if (adapter === 'AdapterDateFns') {
        out.update(t('Путь v8 подходит для date-fns 3.6.0', 'The v8 path fits date-fns 3.6.0'),
          t('Первый проход убрал V3. Этот адаптер v8 поддерживает date-fns начиная с 3.2 в ветке 3.x, а также 4.x. Что сделает то же правило с этим новым путём?', 'The first pass removed V3. This v8 adapter supports date-fns 3.x from 3.2 and also 4.x. What will the same rule do to this new path?'), 'ok');
      } else {
        out.update(t('Выбран адаптер для date-fns 2.x', 'Selected the adapter for date-fns 2.x'),
          runs === 2
            ? t('Второй проход принял уже исправленный импорт за прежнее имя и добавил V2. В проекте по-прежнему date-fns 3.6.0. Правильный результат был после первого прохода.', 'The second pass treated the migrated import as an old name and appended V2. The app still uses date-fns 3.6.0. The first pass had produced the right result.')
            : t('Этот проход ничего не изменил. В показанном правиле нет переименования для пути с V2. Несовместимый импорт сохранится при следующих запусках.', 'This pass made no change. The illustrated transform has no rename for a path ending in V2. Further runs keep the incompatible import.'), 'bad');
      }
    }

    apply.addEventListener('click', () => {
      adapter = renames.get(adapter) || adapter;
      runs++;
      showSummary();
    });
    reset.addEventListener('click', () => {
      adapter = 'AdapterDateFnsV3';
      runs = 0;
      showSummary();
    });
    actions.append(apply, reset);
    stage.append(file, actions, out.box);
    showSummary();
  }

  return {'react-instance': reactInstance, 'repeat-codemod': repeatCodemod};
})();
