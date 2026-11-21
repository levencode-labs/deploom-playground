'use strict';
(() => {
  let nextId = 0;
  const groups = ['dependencies','devDependencies','optionalDependencies','peerDependencies'];
  function direct(manifest) {
    const entries = [];
    for (const group of groups) {
      const map = manifest?.[group];
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue;
      for (const [name,range] of Object.entries(map)) {
        if (typeof range === 'string') entries.push({name,range,group});
      }
    }
    return entries;
  }

  function findMatches(items, term) {
    if (!term) return items;
    const exact = [], prefix = [], partial = [], other = [];
    for (const entry of items) {
      if (entry.name === term) exact.push(entry);
      else if (entry.name.startsWith(term)) prefix.push(entry);
      else if (entry.name.includes(term)) partial.push(entry);
      else if (entry.search.includes(term)) other.push(entry);
    }
    return exact.concat(prefix, partial, other);
  }

  function attach(input,{onSelect,onInput} = {}) {
    const host = document.createElement('span'), menu = document.createElement('span');
    const list = document.createElement('span'), note = document.createElement('span');
    host.className = 'package-combo'; menu.className = 'package-combo-menu'; menu.hidden = true;
    list.id = 'package-options-'+(++nextId); list.setAttribute('role','listbox');
    note.className = 'package-combo-note'; note.setAttribute('role','status');
    input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('role','combobox'); input.setAttribute('aria-autocomplete','list');
    input.setAttribute('aria-controls',list.id); input.setAttribute('aria-expanded','false');
    input.before(host); host.append(input,menu); menu.append(list,note);

    let items = [], shown = [], active = -1, looking = false;
    const t = (ru,en)=>Lab.t(ru,en);
    function close() {
      menu.hidden = true; looking = false; active = -1;
      input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant');
    }
    function highlight(index) {
      if (active >= 0) list.children[active]?.setAttribute('aria-selected','false');
      active = index;
      const option = list.children[active];
      if (!option) {input.removeAttribute('aria-activedescendant'); return;}
      option.setAttribute('aria-selected','true');
      input.setAttribute('aria-activedescendant',option.id);
      if (index === 0) menu.scrollTop = 0;
      else option.scrollIntoView({block:'nearest'});
    }
    function select(index) {
      const item = shown[index];
      if (!item) return;
      input.value = item.value;
      close();
      onSelect?.(item);
    }
    function show() {
      if (input.disabled || !items.length) {close(); return;}
      // Focusing a committed value opens the alternatives; typing filters the whole data set.
      const term = looking ? input.value.trim().toLowerCase() : '';
      const matches = findMatches(items, term);
      shown = matches.slice(0,24).map(entry=>entry.item);
      list.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
      for (const [index,item] of shown.entries()) {
        const option = document.createElement('span');
        option.id = list.id+'-'+index; option.setAttribute('role','option');
        option.setAttribute('aria-selected','false');
        const label = document.createElement('span'); label.textContent=item.label || item.value; option.append(label);
        if (item.detail) {const detail=document.createElement('small'); detail.textContent=item.detail; option.append(detail);}
        option.addEventListener('mousedown',event=>event.preventDefault());
        option.addEventListener('click',event=>{event.preventDefault();select(index);});
        list.append(option);
      }
      note.textContent = !matches.length ? t('Нет совпадений','No matches') :
        matches.length > shown.length ? t('Показано ','Showing ')+shown.length+t(' из ',' of ')+matches.length+t('. Уточните имя.','. Refine your search.') : '';
      note.hidden = !note.textContent;
      menu.hidden = false; input.setAttribute('aria-expanded','true');
      menu.scrollTop = 0;
      if (term && matches[0]?.name === term) highlight(0);
    }
    input.addEventListener('focus',()=>{looking=false;show();});
    input.addEventListener('click',()=>{if(menu.hidden)show();});
    input.addEventListener('input',()=>{looking=true;show();onInput?.(input.value);});
    input.addEventListener('blur',()=>close());
    input.addEventListener('keydown',event=>{
      if (event.isComposing) return;
      if (event.key === 'Escape') {if(!menu.hidden){event.preventDefault();event.stopPropagation();close();} return;}
      if (event.key === 'Enter') {
        if (!menu.hidden && active >= 0) {event.preventDefault();select(active);}
        else close();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault(); if (menu.hidden) show();
      if (menu.hidden || !shown.length) return;
      const last = shown.length-1;
      highlight(event.key==='ArrowDown' ? Math.min(active+1,last) : (active<0 ? last : Math.max(active-1,0)));
    });
    return {
      setItems(values) {
        items = values.map(item=>({
          item,
          name:(item.label || item.value).toLowerCase(),
          search:[item.value,item.label,item.detail].filter(Boolean).join(' ').toLowerCase()
        }));
        if (document.activeElement === input && !menu.hidden) show(); else close();
      },
      setValue(value) { input.value=value ?? ''; close(); },
      close
    };
  }
  window.LabPackageCombo = {attach,direct};
})();
