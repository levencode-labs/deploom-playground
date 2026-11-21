'use strict';
(() => {
  const url = new URL(location.href);
  let stored;
  try { stored = localStorage.getItem('deploom-lab-language'); } catch {}
  const choice = url.searchParams.get('lang') || stored || 'ru';
  const lang = choice === 'en' ? 'en' : 'ru';
  try { localStorage.setItem('deploom-lab-language',lang); } catch {}
  const t = (ru,en) => lang === 'en' ? en : ru;
  window.Lab = {lang,t};
  document.documentElement.lang = lang;
  const pages = [
    ['index.html','Обзор','Overview'], ['peers.html','Совместимость','Peer ranges'], ['runtime.html','Проверки','Runtime'],
    ['combinations.html','Сочетания','Combinations'], ['tree.html','Дерево','Tree'], ['advisories.html','Уязвимости','Advisories']
  ];
  const current = location.pathname.split('/').pop() || 'index.html';
  function link(label,href) {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    return a;
  }
  const main = document.querySelector('main');
  if (!main.id) main.id = 'main-content';
  const bar = document.createElement('div');
  bar.className='bar';
  const skip=link(t('К содержимому','Skip to content'),'#'+main.id);
  skip.className='skip';
  const brand=link('DepLoom','index.html?lang='+lang);
  brand.className='brand';
  const nav=document.createElement('nav');
  nav.setAttribute('aria-label',t('Разделы лаборатории','Lab sections'));
  for (const [file,ru,en] of pages) {
    const a=link(t(ru,en),file+'?lang='+lang);
    if (file===current) a.setAttribute('aria-current','page');
    nav.append(a);
  }
  const other=t('en','ru');
  url.searchParams.set('lang',other);
  const toggle=link(t('English','Русский'),url.href);
  toggle.lang=other;
  toggle.className='language';
  bar.append(skip,brand,nav,toggle);
  document.querySelector('[data-nav]').append(bar);
  if (lang==='en') for (const el of document.querySelectorAll('[data-en]')) el.textContent=el.dataset.en;
  for(const a of main.querySelectorAll('a[href$=".html"]')) a.href=a.getAttribute('href')+'?lang='+lang;
  document.title = (document.querySelector('h1')?.textContent || 'Migration Lab')+' · DepLoom';
})();
