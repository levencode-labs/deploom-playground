'use strict';

(() => {
  const { t } = window.Lab;
  const text = (tag, content) => {
    const element = document.createElement(tag);
    element.textContent = content;
    return element;
  };

  function compare(a,b) {
    if (treeSemver.satisfies(a,'>'+b,{includePrerelease:true})) return 1;
    if (treeSemver.satisfies(b,'>'+a,{includePrerelease:true})) return -1;
    return 0;
  }
  // The sorted registry list can contain thousands of pre-releases. Show the
  // candidate's neighbours and the two ends of the set accepted by this range.
  function nearby(versions, range, selected) {
    if (versions.length <= 6) return versions;
    const candidates = versions.filter(v=>!v.split('+')[0].includes('-') ||
      v===selected || treeSemver.satisfies(v,range));
    const sorted = candidates.length ? candidates : versions;
    const index=sorted.findIndex(v=>compare(v,selected)>=0);
    const at=index<0 ? sorted.length : index;
    const matches=sorted.filter(v=>treeSemver.satisfies(v,range));
    const boundary=matches.length ? sorted.indexOf(matches.at(-1))+1 : -1;
    return [...new Set([sorted[at-1],sorted[at],sorted[at+1],matches[0],matches.at(-1),sorted[boundary]].filter(Boolean))].sort(compare);
  }
  function render(container, { range, selected, candidates, onSelect }) {
    const items = [...new Set([...candidates, selected].filter(version => treeSemver.valid(version)))];
    items.sort(compare);
    const known = treeSemver.validRange(range) !== null;
    const list = document.createElement('ul');
    list.className = 'range-scale';
    list.setAttribute('aria-label', t('Кандидаты по порядку версий', 'Candidates in version order'));
    for (const version of items) {
      const fits = known && treeSemver.satisfies(version, range);
      const entry = document.createElement('li');
      entry.dataset.match = known ? String(fits) : 'unknown';
      entry.dataset.selected = String(version === selected);
      const value = text(onSelect && candidates.includes(version) ? 'button' : 'code', version);
      if(value.tagName==='BUTTON') {
        value.type='button';
        value.setAttribute('aria-label',t('Проверить версию ','Check version ')+version);
        value.addEventListener('click',()=>onSelect(version));
      }
      entry.append(value, text('span', known ?
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

  window.LabRangeScale = { render, compare, nearby };
})();
