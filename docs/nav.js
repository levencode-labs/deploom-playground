'use strict';
(() => {
  const currentURL = new URL(location.href);
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
      ['audit.html', t('Аудит зависимостей','Dependency audit')],
      ['plan.html', t('План обновления','Upgrade plan')],
      ['compare.html', t('Сравнить lock-файлы','Compare lockfiles')],
      ['advisories.html', t('Уязвимости','Vulnerabilities')],
    ]],
    [t('Визуализации','Visualizations'), [
      ['tree.html', t('Дерево зависимостей','Dependency tree')],
      ['tree.html#ranges', t('Диапазоны версий','Version ranges')],
    ]],
    [t('Примеры','Examples'), [
      ['peers.html', t('Почему npm вернул ERESOLVE?','Why did npm return ERESOLVE?')],
      ['runtime.html', t('Почему установка прошла, а кнопка пропала?','Why did the install pass but the button disappear?')],
      ['combinations.html', t('Почему ради плагина нужны три обновления?','Why does one plugin need three upgrades?')],
      ['ci.html', t('Почему после правки манифеста упал npm ci?','Why did npm ci fail after a manifest edit?')],
      ['override.html', t('Откуда осталась старая версия?','Where did the old copy come from?')],
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
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', t('Разделы лаборатории','Lab sections'));
  const home = link(t('Обзор','Overview'), 'index.html');
  nav.append(home);
  const page = currentURL.pathname.split('/').pop() || 'index.html';
  if (page === 'index.html') home.setAttribute('aria-current','page');
  for (const [label, items] of sections) {
    const group = document.createElement('details');
    group.className = 'nav-group';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const list = document.createElement('div');
    list.className = 'nav-links';
    for (const [path, title] of items) {
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
        event.preventDefault(); group.open = true; list.firstElementChild.focus();
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
