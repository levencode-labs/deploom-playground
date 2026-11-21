'use strict';

(() => {
  const { t } = window.Lab;
  const text = (tag, content) => {
    const element = document.createElement(tag);
    element.textContent = content;
    return element;
  };

  function render(container, { range, selected, candidates }) {
    const items = [...new Set([...candidates, selected].filter(version => treeSemver.valid(version)))];
    items.sort((a, b) => {
      if (treeSemver.satisfies(a, '>' + b, { includePrerelease: true })) return 1;
      if (treeSemver.satisfies(b, '>' + a, { includePrerelease: true })) return -1;
      return 0;
    });
    const known = treeSemver.validRange(range) !== null;
    const list = document.createElement('ul');
    list.className = 'range-scale';
    list.setAttribute('aria-label', t('Кандидаты по порядку версий', 'Candidates in version order'));
    for (const version of items) {
      const fits = known && treeSemver.satisfies(version, range);
      const entry = document.createElement('li');
      entry.dataset.match = known ? String(fits) : 'unknown';
      entry.dataset.selected = String(version === selected);
      entry.append(text('code', version), text('span', known ?
        (fits ? t('подходит', 'matches') : t('вне диапазона', 'outside range')) :
        t('нет оценки', 'unverified')));
      if (version === selected) entry.append(text('strong', t('выбрана', 'selected')));
      list.append(entry);
    }
    const message = !known || !treeSemver.valid(selected) ?
      t('Для проверки нужны диапазон npm semver и точная версия.', 'A valid npm semver range and an exact version are required.') :
      selected + (treeSemver.satisfies(selected, range) ? t(' входит в ', ' matches ') : t(' вне диапазона ', ' is outside ')) + range + '.';
    const verdict = text('p', message);
    verdict.className = 'range-verdict';
    container.replaceChildren(list, verdict);
  }

  const examples = {
    '^0.2.3': ['0.2.2', '0.2.3', '0.2.4', '0.3.0', '1.0.0'],
    '~0.2.3': ['0.2.2', '0.2.3', '0.2.4', '0.3.0', '1.0.0'],
    '^1.2.3': ['1.2.2', '1.2.3', '1.2.4', '1.3.0', '2.0.0'],
  };
  function practice(container) {
    const form = document.createElement('div');
    form.className = 'range-controls';
    const range = document.createElement('select');
    const selected = document.createElement('select');
    for (const value of Object.keys(examples)) range.add(new Option(value, value));
    for (const [control, caption] of [[range, t('Требование', 'Requirement')], [selected, t('Выбранная версия', 'Selected version')]]) {
      const label = text('label', caption + ' ');
      label.className = 'field'; label.append(control); form.append(label);
    }
    const plot = document.createElement('div');
    plot.setAttribute('aria-live', 'polite');
    const explanation = document.createElement('p');
    explanation.className = 'hint';
    function redraw() {
      render(plot, { range: range.value, selected: selected.value, candidates: examples[range.value] });
      explanation.textContent = range.value === '^1.2.3' ?
        t('Для стабильных кандидатов ^1.2.3 допускает изменения до 2.0.0, начиная с 1.2.3.', 'For stable candidates, ^1.2.3 accepts 1.2.3 and subsequent versions below 2.0.0.') :
        t('Для стабильных кандидатов ^0.2.3 и ~0.2.3 совпадают. Обе записи допускают версии от 0.2.3 до 0.3.0, исключая 0.3.0.', 'For stable candidates, ^0.2.3 and ~0.2.3 coincide. Both accept 0.2.3 and subsequent versions below 0.3.0.');
    }
    function refill() {
      const prior = selected.selectedIndex;
      selected.replaceChildren(...examples[range.value].map(v => new Option(v, v)));
      selected.selectedIndex = prior >= 0 ? prior : 3;
      redraw();
    }
    range.addEventListener('change', refill);
    selected.addEventListener('change', redraw);
    container.replaceChildren(form, plot, explanation);
    refill();
  }
  window.LabRangeScale = { render };
  document.querySelectorAll('[data-range-practice]').forEach(practice);
})();
