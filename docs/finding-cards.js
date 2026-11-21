'use strict';
(() => {
  const {t} = Lab;
  const labelDate = new Intl.DateTimeFormat(t('ru-RU','en-GB'), {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});

  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function timestamp(value) {
    const iso = LabAudit.advisoryDate(value);
    if (!iso) return null;
    const time = element('time',labelDate.format(new Date(iso)));
    time.dateTime = iso;
    time.title = iso;
    return time;
  }

  function metadataLine(parent, label, value) {
    parent.append(element('dt',label),element('dd',value));
  }

  function card(item, affected, project, mode, grouped=false) {
    const li = element('li'), details = element('details'), header = element('summary');
    const label = element('span','','finding-label');
    // A compact hosted snapshot may omit titles. These pinned first-party examples also
    // supply a few known OSV titles offline; unrecognized IDs keep an explicit fallback.
    const captured=window.LabAuditCapture?.details?.[item.id] || window.LabVitestCapture?.details?.[item.id];
    const availableTitle=[item.summary,captured?.summary].find(value=>typeof value==='string' && value.trim() && value!==item.id && !/^(?:GHSA|CVE)-[a-z0-9-]+$/i.test(value.trim()));
    const fullTitle=availableTitle || t('Уязвимость в пакете ','Advisory for ')+affected[0].name;
    let title=fullTitle;
    if(grouped && affected.every(row=>row.name===affected[0].name) && title.toLowerCase().startsWith(affected[0].name.toLowerCase()+': ')) {
      title=title.slice(affected[0].name.length+2);
    }
    label.append(LabSeverity.badge({...item,score:null}),element('strong',title));
    const description = element('span','','finding-info');
    if(!grouped && project) {
      const keys=affected.slice(0,2).map(row=>row.key);
      if(affected.length>keys.length)keys.push('+'+(affected.length-keys.length));
      description.append(element('span',keys.join(' · ')));
    }
    const source = item.source || (mode==='registry'?'npm registry':'OSV');
    const published = timestamp(item.published);
    if (published) {
      const date = element('span');
      date.append(t('Опубликовано в ','Published in ')+source+' · ',published);
      description.append(date);
    } else {
      description.append(element('span',t('Дата публикации неизвестна','Publication date unavailable')));
    }
    header.append(label,description);
    details.append(header);
    // The closed list stays cheap even for repeated findings with many install locations.
    details.addEventListener('toggle',()=>{
      if (!details.open || details.childElementCount!==1) return;
      const body = element('div','','finding-body'), meta = element('dl','','finding-metadata');
      metadataLine(meta,t('Идентификатор','Identifier'),item.id);
      const aliases = Array.isArray(item.aliases) ? item.aliases.filter(alias => alias!==item.id) : [];
      if (aliases.length) metadataLine(meta,t('Другие ID','Aliases'),aliases.join(' · '));
      metadataLine(meta,t('Источник','Source'),source);
      const modified = timestamp(item.modified);
      if (modified) {
        const value = element('dd'); value.append(modified);
        meta.append(element('dt',t('Обновлено источником','Updated by source')),value);
      }
      if (Number.isFinite(item.score)) metadataLine(meta,'CVSS',item.score.toFixed(1));
      body.append(meta);
      if (!availableTitle) {
        body.append(element('p',t('В загруженных данных нет названия этой записи.',
          'The loaded data has no title for this finding.'),'hint'));
      }
      if (item.href) {
        const link=element('a',t('Открыть запись источника','Open source advisory'));
        link.href=item.href; body.append(link);
      }
      if(!project){details.append(body);return;}
      body.append(element('h4',t('Откуда в проекте этот пакет','How the package entered the project')));
      for (const row of affected) {
        const section=element('section','','finding-package');
        section.append(element('strong',row.key));
        if (row.state==='unknown' && row.reason) section.append(element('p',row.reason,'hint'));
        if (mode!=='registry' && row.publicPaths && row.publicPaths.size < row.paths.length) {
          const count=row.paths.length-row.publicPaths.size;
          section.append(element('p',t('Совпадение по имени и версии. Публичное происхождение не подтверждено для записей: ',
            'Match by name and version. Entries without confirmed public provenance: ')+count+' / '+row.paths.length+'.','hint'));
        }
        LabFindingPaths.render(section,{lock:project.lock,manifest:project.manifest,row,t});
        body.append(section);
      }
      details.append(body);
    });
    li.append(details);
    return li;
  }

  function filter(item, affected, term, level) {
    if (level && item.level!==level) return false;
    if (!term) return true;
    const matches = text=>typeof text==='string' && text.toLowerCase().includes(term);
    return matches(item.id) || matches(item.summary) || (item.aliases || []).some(matches) ||
      affected.some(row=>matches(row.key));
  }

  window.LabFindingCards = {card,filter};
})();
