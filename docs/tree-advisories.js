'use strict';
(() => {
  const t = (ru,en) => Lab.t(ru,en);
  const unknown = reason => ({state:'unknown',entries:[],publicOrigin:false,source:'',reason});
  let pendingSnapshot, refreshAfter = 0;

  // Every graph and node shares a fixed catalog request. No project data enters its URL or body.
  function loadSnapshot() {
    if (!pendingSnapshot || Date.now() >= refreshAfter) {
      refreshAfter = Infinity;
      pendingSnapshot = LabHostedAudit.load(undefined,{publicTree:true}).then(index => {
        refreshAfter = Math.max(Date.now()+60000,index.expires*1000);
        return index;
      }, error => {
        refreshAfter = Date.now()+60000;
        throw error;
      });
    }
    return pendingSnapshot;
  }

  function distinctFindings(records) {
    // OSV aliases identify the same vulnerability, including across separately published IDs.
    const groups = new Set(), byId = new Map();
    for (const record of LabSeverity.sorted([...records.values()])) {
      const ids = [record.id,...record.aliases];
      const related = new Set(ids.map(id => byId.get(id)).filter(Boolean));
      const group = related.values().next().value || {record,ids:new Set()};
      groups.add(group);
      for (const other of related) {
        if (other === group) continue;
        group.record = LabSeverity.sorted([group.record,other.record])[0];
        for (const id of other.ids) {group.ids.add(id); byId.set(id,group);}
        groups.delete(other);
      }
      for (const id of ids) {group.ids.add(id); byId.set(id,group);}
    }
    return LabSeverity.sorted([...groups].map(({record,ids}) => ({
      ...record,aliases:[...ids].filter(id => id !== record.id)
    })));
  }

  function forLock(packages) {
    // The tree has already normalized v1–v3 npm locks. Yarn retains its descriptor index.
    const lock = {packages,lockfileVersion:3};
    const copies = new Map(), results = new WeakMap();
    async function lookup(path) {
      if (!path || !packages || !Object.hasOwn(packages,path)) {
        return unknown(t('Для проверки нужна установленная версия из lock-файла.','An installed version from the lockfile is required.'));
      }
      const record = packages[path];
      if (!copies.has(path)) {
        const local = !record || record.link || record.private || record.inBundle;
        copies.set(path,local ? null : LabAudit.localInventory(lock,path).rows[0]);
      }
      const row = copies.get(path);
      if (!row || row.localOnly) return unknown(t('У этой записи нет подтверждённой версии из реестра npm.','This entry has no identifiable npm registry version.'));
      let index;
      try {index = await loadSnapshot();}
      catch {return unknown(t('Не удалось загрузить снимок OSV с этого сайта.','The OSV snapshot could not be loaded from this site.'));}
      // A copy with unknown provenance must never inherit a public copy’s verdict.
      let cache = results.get(index);
      if (!cache) {cache = new Map(); results.set(index,cache);}
      const key = JSON.stringify([row.key,row.publicOrigin,index.fresh]);
      if (cache.has(key)) return cache.get(key);
      const records = new Map();
      LabHostedAudit.check(index,[row],records);
      const result = {
        state:row.publicOrigin ? row.state : 'unknown',
        publicOrigin:row.publicOrigin,entries:distinctFindings(records),
        source:'OSV · '+new Date(index.published*1000).toISOString().slice(0,10),
        reason:row.reason || ''
      };
      if (result.entries.length && !row.publicOrigin) {
        result.reason = [result.reason,t('Совпали имя и версия. Публичный источник этой копии не подтверждён.',
          'The name and version match, but this copy’s public origin is unconfirmed.')].filter(Boolean).join(' ');
      }
      cache.set(key,result);
      return result;
    }
    return {lookup};
  }
  window.LabTreeAdvisories = {forLock};
})();
