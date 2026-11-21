'use strict';

(() => {
  const pageSize = 10;

  // Rows have a unique key (package or exact release). Keep the selection across
  // pages, independent of the subset that currently has a checkbox in the DOM.
  function mount(container, {items, publicDestination, exactReleases = false, onChange}) {
    const {t} = Lab;
    container.replaceChildren();
    container.classList.add('package-picker');
    const element = (parent, tag, text = '') => {
      const node = document.createElement(tag);
      node.textContent = text;
      parent.append(node);
      return node;
    };
    const button = (parent, text) => {
      const node = element(parent, 'button', text);
      node.type = 'button';
      return node;
    };

    const selected = new Set(items.filter(item => item.selected).map(item => item.key));
    const confirmedCount = items.filter(item => item.publicOrigin).length;
    let matches = items, page = 0;
    const details = element(container, 'details');
    const caption = element(details, 'summary');
    const controls = element(details, 'div');
    controls.className = 'picker-filters';
    const searchLabel = element(controls, 'label', t('Найти пакет', 'Find a package'));
    const search = element(searchLabel, 'input');
    search.type = 'search';
    search.spellcheck = false;
    const modeLabel = element(controls, 'label', t('Показать', 'Show'));
    const mode = element(modeLabel, 'select');
    const modes = [
      ['all', t('Все пакеты', 'All packages')],
      ['selected', t('Выбранные', 'Selected packages')],
    ];
    if (publicDestination) {
      modes.push(['public', t('Подтверждён публичный источник', 'Confirmed public source')],
        ['unconfirmed', t('Источник не подтверждён', 'Unconfirmed source')]);
    }
    for (const [value, label] of modes) element(mode, 'option', label).value = value;

    const actions = element(details, 'div');
    actions.className = 'picker-actions';
    const masterLabel = element(actions, 'label');
    const master = element(masterLabel, 'input');
    master.type = 'checkbox';
    const masterText = element(masterLabel, 'span');
    const clear = button(actions, t('Снять весь выбор', 'Clear selection'));
    const list = element(details, 'ul');
    list.className = 'picker-list';
    const empty = element(details, 'p', t('Подходящих пакетов нет.', 'No matching packages.'));
    const pager = element(details, 'div');
    pager.className = 'picker-page';
    const previous = button(pager, t('Назад', 'Previous'));
    const interval = element(pager, 'span');
    const next = button(pager, t('Дальше', 'Next'));
    const consentLabel = element(container, 'label');
    consentLabel.className = 'picker-consent';
    const consent = element(consentLabel, 'input');
    consent.type = 'checkbox';
    const consentText = element(consentLabel, 'span');

    const status = element(container, 'span');
    status.className = 'picker-sr';
    status.setAttribute('role', 'status');
    let unconfirmed = 0;
    const ready = () => selected.size > 0 && (!unconfirmed || consent.checked);

    function updateCounts() {
      unconfirmed = publicDestination
        ? items.filter(item => !item.publicOrigin && selected.has(item.key)).length : 0;
      consentLabel.hidden = unconfirmed === 0;
      if (unconfirmed) {
        consentText.textContent = exactReleases ? t(
          'Разрешаю отправить имена и версии выбранных пакетов без подтверждённого источника (' + unconfirmed + ') указанным получателям: ' + publicDestination + '.',
          'Allow the selected names and versions with unconfirmed sources (' + unconfirmed + ') to be sent to the listed recipients: ' + publicDestination + '.') : t(
          'Разрешаю отправить выбранные имена без подтверждённого источника (' + unconfirmed + ') в ' + publicDestination + '.',
          'Allow the selected names with unconfirmed sources (' + unconfirmed + ') to be sent to ' + publicDestination + '.');
      }
      const count = (exactReleases ? t('Выбрано пар «пакет + версия»', 'Package/version pairs selected') : t('Выбрано пакетов', 'Packages selected')) + ' · ' + selected.size + ' / ' + items.length;
      caption.textContent = count;
      if (publicDestination && confirmedCount < items.length) {
        caption.textContent += t(' · без подтверждённого источника ', ' · source unconfirmed for ') + (items.length - confirmedCount);
      }
      status.textContent = count + ' · ' + t('Найдено', 'Matches') + ' ' + matches.length;
      let checked = 0;
      for (const item of matches) if (selected.has(item.key)) checked++;
      master.indeterminate = checked > 0 && checked < matches.length;
      master.checked = matches.length > 0 && checked === matches.length;
      master.disabled = !matches.length;
      const filtered = search.value.trim() !== '' || mode.value !== 'all';
      masterText.textContent = (filtered ? t('Выбрать все найденные', 'Select all matches') : t('Выбрать все', 'Select all')) + ' (' + matches.length + ')';
      clear.disabled = !selected.size;
    }

    function renderPage() {
      page = Math.min(page, Math.max(0, Math.ceil(matches.length / pageSize) - 1));
      const start = page * pageSize;
      const visible = matches.slice(start, start + pageSize);
      list.replaceChildren();
      for (const item of visible) {
        const row = element(list, 'li');
        const label = element(row, 'label');
        const box = element(label, 'input');
        box.type = 'checkbox';
        box.checked = selected.has(item.key);
        const name = element(label, 'span', item.label);
        name.className = 'picker-name';
        if (publicDestination) {
          const origin = element(label, 'small', item.publicOrigin
            ? t('Публичный источник', 'Public source') : t('Не подтверждён', 'Unconfirmed'));
          origin.className = 'picker-origin';
        }
        box.onchange = () => {
          if (box.checked) selected.add(item.key); else selected.delete(item.key);
          if (!item.publicOrigin) consent.checked = false;
          if (mode.value === 'selected') {
            filter(false);
            // The removed focused row is gone. Return keyboard users to the list.
            (list.querySelector('input') || mode).focus();
          } else updateCounts();
          onChange(ready());
        };
      }
      empty.hidden = matches.length > 0;
      previous.disabled = page === 0;
      next.disabled = start + pageSize >= matches.length;
      pager.hidden = matches.length <= pageSize;
      interval.textContent = (start + 1) + '–' + (start + visible.length) + ' / ' + matches.length;
      updateCounts();
    }

    function filter(firstPage = true) {
      const term = search.value.trim().toLowerCase();
      matches = items.filter(item => item.label.toLowerCase().includes(term) &&
        (mode.value === 'all' || (mode.value === 'selected' && selected.has(item.key)) ||
         (mode.value === 'public' && item.publicOrigin) || (mode.value === 'unconfirmed' && !item.publicOrigin)));
      if (firstPage) page = 0;
      renderPage();
    }

    search.oninput = () => filter();
    mode.onchange = () => filter();
    master.onchange = () => {
      for (const item of matches) {
        if (selected.has(item.key) === master.checked) continue;
        if (!item.publicOrigin) consent.checked = false;
        if (master.checked) selected.add(item.key); else selected.delete(item.key);
      }
      filter(false);
      onChange(ready());
    };
    clear.onclick = () => { selected.clear(); consent.checked = false; filter(); onChange(ready()); };
    previous.onclick = () => { page--; renderPage(); };
    next.onclick = () => { page++; renderPage(); };
    consent.onchange = () => { updateCounts(); onChange(ready()); };
    renderPage();
    onChange(ready());
    return {
      ready,
      has: key => selected.has(key),
      // A caller must not send an unconfirmed selection even if invoked directly.
      values: () => ready() ? items.filter(item => selected.has(item.key)) : [],
    };
  }
  window.LabPackagePicker = {mount};
})();
