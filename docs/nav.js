'use strict';
(() => {
  const currentURL = new URL(location.href);
  const page = currentURL.pathname.split('/').pop() || 'index.html';
  if (page === 'override.html' && currentURL.hash.startsWith('#scope=')) {
    const old = new URLSearchParams(currentURL.hash.slice(1));
    currentURL.searchParams.set('rev', old.get('scope') === 'before' ? 'base' : 'override');
    currentURL.hash = '#selector-review';
    history.replaceState(null, '', currentURL);
  }
  if (['peers.html', 'tree.html'].includes(page)) {
    const followOldRangeLink = () => {
      if (location.hash !== '#ranges') return;
      const target = new URL('ranges.html', location.href);
      target.search = location.search;
      location.replace(target);
    };
    addEventListener('hashchange', followOldRangeLink);
    followOldRangeLink();
  }
  let saved;
  try { saved = localStorage.getItem('deploom-lab-language'); } catch {}
  const lang = (currentURL.searchParams.get('lang') || saved) === 'en' ? 'en' : 'ru';
  const t = (ru, en) => lang === 'en' ? en : ru;
  try { localStorage.setItem('deploom-lab-language', lang); } catch {}
  document.documentElement.lang = lang;

  function urlFor(path) {
    const url = new URL(path, location.href);
    url.searchParams.set('lang', lang);
    return url.href;
  }
  function link(label, path) {
    const anchor = document.createElement('a');
    anchor.textContent = label;
    anchor.href = urlFor(path);
    return anchor;
  }
  const sections = [
    [t('Инструменты','Tools'), [
      ['audit.html', t('Аудит проекта по папке','Audit a project folder')],
      ['plan.html', t('План для Yellow, Green или пакета','Plan for Yellow, Green, or a package')],
      ['compare.html', t('Сравнить lock-файлы','Compare lockfiles')],
      ['advisories.html', t('Уязвимости','Vulnerabilities')],
    ]],
    [t('Визуализации','Visualizations'), [
      ['tree.html', t('Дерево зависимостей','Dependency tree')],
      ['ranges.html', t('Диапазоны версий npm','npm version ranges')],
    ]],
    [t('Примеры','Examples'), [
      [null, t('Установка и CI','Installation and CI')],
      ['peers.html', t('Конфликт React и React DOM','React and React DOM conflict')],
      ['combinations.html', t('Слияние веток с webpack','Merging webpack branches')],
      ['ci.html', t('Rollup на Linux после сборки на Mac','Rollup on Linux after a Mac build')],
      [null, t('Запуск кода','Running the code')],
      ['override.html', t('CSS-селектор после override','CSS selector after an override')],
      ['runtime.html#ssr-case', t('Кнопка при серверном рендеринге','Server-rendered button')],
      [null, t('Работа с интерфейсом','Using the interface')],
      ['runtime.html', t('Подсказка после перехода на React 19','A missing hint after upgrading to React 19')],
    ]],
  ];
  const main = document.querySelector('main');
  main.id ||= 'main-content';
  const bar = document.createElement('div');
  bar.className = 'bar';
  const skip = document.createElement('a');
  skip.href = '#' + main.id;
  skip.className = 'skip';
  skip.textContent = t('К содержимому','Skip to content');
  const brand = link('DepLoom', 'index.html');
  brand.className = 'brand';
  const mark=document.createElement('img'); mark.src='deploom-mark.svg'; mark.alt='';brand.prepend(mark);
  const favicon=document.createElement('link'); favicon.rel='icon'; favicon.href=mark.src;document.head.append(favicon);
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', t('Разделы лаборатории','Lab sections'));
  const home = link(t('Обзор','Overview'), 'index.html');
  nav.append(home);
  if (page === 'index.html') home.setAttribute('aria-current','page');
  for (const [label, items] of sections) {
    const group = document.createElement('details');
    group.className = 'nav-group';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const list = document.createElement('div');
    list.className = 'nav-links';
    for (const [path, title] of items) {
      if (!path) {
        const heading = document.createElement('strong');
        heading.textContent = title;
        list.append(heading);
        continue;
      }
      const anchor = link(title, path);
      const target = new URL(anchor.href);
      if (target.pathname.endsWith('/' + page) && target.hash === currentURL.hash &&
          target.searchParams.get('tool') === currentURL.searchParams.get('tool')) {
        anchor.setAttribute('aria-current','page');
      }
      list.append(anchor);
    }
    group.append(summary, list);
    nav.append(group);
    group.addEventListener('toggle', () => {
      if (group.open) for (const other of nav.querySelectorAll('details[open]')) {
        if (other !== group) other.open = false;
      }
    });
    group.addEventListener('keydown', event => {
      if (event.key === 'Escape') { group.open = false; summary.focus(); }
      if (event.key === 'ArrowDown' && event.target === summary) {
        event.preventDefault(); group.open = true; list.querySelector('a').focus();
      }
    });
    group.addEventListener('focusout', event => {
      if (event.relatedTarget && !group.contains(event.relatedTarget)) group.open = false;
    });
    document.addEventListener('click', event => { if (!group.contains(event.target)) group.open = false; });
  }
  const language = document.createElement('a');
  language.lang = t('en','ru');
  language.textContent = t('English','Русский');
  language.className = 'language';
  function refreshLanguageLink() {
    const url = new URL(location.href);
    url.searchParams.set('lang', language.lang);
    language.href = url.href;
  }
  function setExampleState(fields) {
    const url = new URL(location.href);
    for (const [name, value] of Object.entries(fields)) url.searchParams.set(name, value);
    try { history.replaceState(null, '', url); } catch {}
    refreshLanguageLink();
  }
  refreshLanguageLink();
  language.addEventListener('click', refreshLanguageLink);
  bar.append(skip, brand, nav, language);
  window.Lab = { lang, t, urlFor, setExampleState };
  document.querySelector('[data-nav]').append(bar);
  if (lang === 'en') for (const element of main.querySelectorAll('[data-en]')) element.textContent = element.dataset.en;
  for (const anchor of main.querySelectorAll('a[href]')) {
    if (/^[\w-]+\.html(?:[?#]|$)/.test(anchor.getAttribute('href'))) anchor.href = urlFor(anchor.getAttribute('href'));
  }
  document.title = (main.querySelector('h1')?.textContent || 'Migration Lab') + ' · DepLoom';
})();
