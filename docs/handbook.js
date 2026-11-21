'use strict';

(() => {
  const {t, urlFor} = Lab;
  const local = pair => t(...pair);
  const chapters = globalThis.DepLoomBookChapters;
  const lessons = chapters.flatMap((chapter, ci) => chapter.lessons.map((lesson, li) => ({chapter, ci, lesson, li})));
  const locationFor = id => '#' + id;
  const book = document.querySelector('.book');
  const menu = document.querySelector('#book-contents');
  const chapterList = document.querySelector('#chapters');
  const toggle = document.querySelector('#book-menu-toggle');
  const article = document.querySelector('#book-lesson');
  const narrow = matchMedia('(max-width: 52rem)');
  const entries = new Map();
  const groups = [];
  let current;
  let mobileOpen = false;
  let desktopOpen = true;
  try { desktopOpen = localStorage.getItem('deploom-book-contents') !== 'closed'; } catch {}

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function link(text, href, className) {
    const el = make('a', className, text);
    el.href = href;
    return el;
  }
  function sectionNumber(ci, li) { return (ci + 1) + '.' + (li + 1); }
  function syncMenu() {
    const open = narrow.matches ? mobileOpen : desktopOpen;
    menu.hidden = !open;
    book.classList.toggle('reading-only', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? t('Свернуть оглавление', 'Hide contents') : t('Оглавление', 'Show contents');
  }
  toggle.addEventListener('click', () => {
    if (narrow.matches) mobileOpen = !mobileOpen;
    else {
      desktopOpen = !desktopOpen;
      try { localStorage.setItem('deploom-book-contents', desktopOpen ? 'open' : 'closed'); } catch {}
    }
    syncMenu();
    if (narrow.matches && mobileOpen) groups[current.ci].querySelector('summary').focus();
  });
  narrow.addEventListener('change', syncMenu);
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches) {
      mobileOpen = false;
      syncMenu();
      toggle.focus();
    }
  });
  // Keep a skip-to-content action from changing the current lesson's fragment.
  document.querySelector('.bar .skip').addEventListener('click', event => {
    event.preventDefault();
    article.querySelector('h1').focus();
  });

  for (const [ci, chapter] of chapters.entries()) {
    const group = make('details', 'book-chapter');
    const summary = make('summary');
    summary.append(make('span', 'chapter-number', String(ci+1).padStart(2, '0')), make('span', '', local(chapter.title)));
    const list = make('ol', 'book-paragraphs');
    for (const [li, lesson] of chapter.lessons.entries()) {
      const item = make('li');
      const anchor = link('', locationFor(lesson.id));
      anchor.append(make('span', 'paragraph-number', sectionNumber(ci, li)), make('span', '', local(lesson.title)));
      item.append(anchor);
      list.append(item);
      entries.set(lesson.id, anchor);
    }
    group.append(summary, list);
    chapterList.append(group);
    groups.push(group);
  }

  const practice = {
    'range-and-lock': [['ranges.html?pkg=react','Проверить диапазон React DOM','Test the React DOM range'], ['compare.html?example=root-range','Сравнить диапазон и запись в lock','Compare a range and its lock entry']],
    'shared-host': [['peers.html','Разобрать ERESOLVE у React DOM','Read a React DOM ERESOLVE']],
    'upgrade-cohorts': [['tree.html?example=webpack-groups&view=packages','Найти группы инструментов webpack','Explore webpack tool groups'], ['combinations.html#build-mr','Собрать свой MR с webpack','Build your own webpack MR']],
    'merged-branches': [['examples.html#quick-merge','Объединить две ветки webpack','Merge two webpack branches'], ['combinations.html','Разобрать изменения по шагам','Walk through both branches']],
    'nested-copies': [['compare.html?example=copies&rev=after','Найти неизменённую копию в lock','Find the unchanged copy in the lockfile']],
    'react-instance': [['peers.html','Проверить версии React и renderer','Check the React and renderer versions']],
    'rollup-platform': [['ci.html','Сравнить варианты Rollup для macOS и Linux','Compare Rollup on macOS and Linux']],
    'audit-and-api': [['override.html','Запустить проверку SVG-селектора','Try the SVG selector'], ['compare.html?example=selector&rev=override','Посмотреть diff после override','Inspect the override diff']],
    'user-actions': [['runtime.html','Открыть подсказку мышью и клавиатурой','Open the hint with a mouse and keyboard']],
    'browser-and-server': [['runtime.html#ssr-case','Проверить renderToString','Check renderToString']],
    'audit-coverage': [['audit.html?example=vitest','Разобрать находки Tinypool','Inspect the Tinypool advisories'], ['audit.html?example=selector&rev=base','Проследить путь к nth-check','Trace the path to nth-check']],
    'search-bounds': [['plan.html?example=freshness','Проверить критерий Yellow','Explore the Yellow criterion']]
  };

  function readingLinks(data) {
    const links = practice[data.id] || [];
    if (!links.length) return;
    const section = make('section', 'book-practice');
    section.append(make('h2', '', t('В плейграунде', 'In the playground')));
    for (const [url, ru, en] of links) section.append(link(t(ru,en), urlFor(url), 'practice-link'));
    return section;
  }

  function pageTurn(entry, direction) {
    const label = direction === 'back' ? t('Предыдущий параграф', 'Previous lesson') : t('Следующий параграф', 'Next lesson');
    const el = link('', locationFor(entry.lesson.id), 'page-turn');
    el.rel = direction === 'back' ? 'prev' : 'next';
    el.append(make('small', '', label + ' · ' + sectionNumber(entry.ci, entry.li)), make('strong', '', local(entry.lesson.title)));
    return el;
  }
  function codeBlock(code) {
    const pre = make('pre', 'book-code');
    pre.append(make('code', '', Array.isArray(code) ? local(code) : code));
    return pre;
  }

  function projectLayout(layout) {
    const section = make('section', 'book-layout-example');
    section.append(make('h2', '', t('Где лежат файлы', 'Where the files live')), make('p', '', local(layout.intro)));
    const list = make('ul', 'project-paths');
    for (const item of layout.paths) {
      const row = make('li', 'path-level-' + item.depth);
      row.append(make('code', '', item.path), make('span', '', local(item.note)));
      list.append(row);
    }
    section.append(list);
    return section;
  }

  function blocks(items) {
    return items.map(item => {
      const block = make('div', 'worked-example');
      block.append(make('h3', '', local(item.title)), make('p', '', local(item.body)));
      if (item.file) block.append(make('p','book-code-file',local(item.file)));
      if (item.code) block.append(codeBlock(item.code));
      return block;
    });
  }

  function render(focus) {
    const requested = location.hash.slice(1);
    const index = Math.max(0, lessons.findIndex(entry => entry.lesson.id === requested));
    const entry = lessons[index];
    if (!entry) return;
    const {lesson, chapter, ci, li} = entry;
    if (current) {
      entries.get(current.lesson.id).removeAttribute('aria-current');
      if (current.ci !== ci) groups[current.ci].open = false;
    }
    current = entry;
    const active = entries.get(lesson.id);
    active.setAttribute('aria-current', 'page');
    groups[ci].open = true;
    if (focus && narrow.matches) mobileOpen = false;
    syncMenu();
    document.title = local(lesson.title) + t(' · Учебник DepLoom', ' · DepLoom Handbook');
    const head = make('header', 'lesson-head');
    const path = make('div', 'lesson-path');
    path.append(make('span', '', t('Глава ', 'Chapter ') + (ci + 1)), make('i'), make('span', '', local(chapter.title)));
    const title = make('h1', '', local(lesson.title));
    title.id = 'lesson-title';
    title.tabIndex = -1;
    path.append(make('span','lesson-progress', t('Урок ', 'Lesson ') + (index+1) + ' / ' + lessons.length));
    if (lesson.level) path.append(make('span', 'lesson-level',
      lesson.level === 1 ? t('Начальный', 'Beginner') :
      lesson.level === 2 ? t('Продолжение', 'Intermediate') : t('Сложнее', 'Advanced')));
    head.append(path, title, make('p', 'lesson-lead', local(lesson.lead)));
    if (index === 0) head.append(make('p','book-beginner-note',
      t('Для начала достаточно уметь npm install и npm ci. Термины будем объяснять по мере появления. Не обязательно читать всё сразу.',
        'You only need to know npm install and npm ci to start. Each new term is explained when it appears. Read at your own pace.')));
    const examples = make('section', 'worked-examples');
    examples.append(make('h2', '', t('Разберём на примерах', 'Worked examples')));
    examples.append(...blocks(lesson.examples));
    const solutions = make('section', 'book-solutions');
    if (lesson.solutions?.length) {
      const solutionTitle = make('h2', '', t('Как исправить', 'Ways to fix it'));
      solutionTitle.tabIndex = -1;
      solutions.append(solutionTitle, ...blocks(lesson.solutions));
      const shortcut = make('button', 'book-jump', t('Перейти к решениям', 'Jump to the fixes'));
      shortcut.type = 'button';
      shortcut.addEventListener('click', () => {
        solutionTitle.focus({preventScroll:true});
        solutions.scrollIntoView({block:'start'});
      });
      head.append(shortcut);
    }
    const check = make('section', 'book-check');
    check.append(make('h2', '', t('Как проверить результат', 'How to check the fix')), make('p', '', local(lesson.check)));
    const experiment = DepLoomBookLabs.render(lesson);
    const elements = [head];
    if (lesson.layout) elements.push(projectLayout(lesson.layout));
    if (lesson.steps?.length) {
      const steps = make('section','book-steps');
      steps.append(make('h2','',t('Разберём по шагам','Let’s walk through it')));
      const list = make('ol');
      for (const sentence of lesson.steps) list.append(make('li','',local(sentence)));
      steps.append(list);
      elements.push(steps);
    }
    // Always explain the input files before showing the experiment.
    elements.push(examples, experiment);
    if (lesson.solutions?.length) elements.push(solutions);
    elements.push(check);
    if (lesson.terms?.length) {
      const glossary = make('section','book-glossary');
      glossary.append(make('h2','',t('Если встретилось незнакомое слово','Terms explained')));
      const definitions = make('dl');
      for (const term of lesson.terms) definitions.append(make('dt','',local(term.term)),make('dd','',local(term.meaning)));
      glossary.append(definitions);
      elements.push(glossary);
    }
    const related = readingLinks(lesson);
    if (related) elements.push(related);
    if (lesson.sources?.length) {
      const sources = make('div', 'book-sources');
      sources.append(make('h2', '', t('Источники', 'Sources')));
      const list = make('ul');
      for (const source of lesson.sources) {
        const item = make('li');
        item.append(link(local(source.label), source.url));
        list.append(item);
      }
      sources.append(list);
      elements.push(sources);
    }
    const turns = make('nav', 'page-turns');
    turns.setAttribute('aria-label', t('Страницы учебника', 'Handbook pages'));
    if (index) turns.append(pageTurn(lessons[index - 1], 'back'));
    if (index < lessons.length - 1) turns.append(pageTurn(lessons[index + 1], 'next'));
    elements.push(turns);
    article.replaceChildren(...elements);
    if (focus) {
      title.focus({preventScroll:true});
      article.scrollIntoView({block:'start'});
    }
  }
  addEventListener('hashchange', () => render(true));
  chapterList.addEventListener('click', event => {
    if (event.target.closest('a') === entries.get(current.lesson.id)) {
      mobileOpen = false;
      syncMenu();
      article.querySelector('h1').focus();
    }
  });
  render(false);
})();
