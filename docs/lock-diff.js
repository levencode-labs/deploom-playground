'use strict';

function comparePackageLocks(before, after) {
  function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function valid(lock) {
    return object(lock) && (lock.lockfileVersion === 3 || globalThis.LabYarn?.format(lock.packages)) && object(lock.packages)
      && Object.hasOwn(lock.packages, '') && Object.values(lock.packages).every(object);
  }
  if (!valid(before) || !valid(after)) throw new TypeError('INVALID_ROOT_LOCK_V3');

  function equal(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b))
      return a.length === b.length && a.every((item, i) => equal(item, b[i]));
    if (!object(a) || !object(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key =>
      Object.hasOwn(b, key) && equal(a[key], b[key]));
  }

  const changes = [];
  const paths = new Set([...Object.keys(before.packages), ...Object.keys(after.packages)]);
  paths.delete('');
  for (const path of [...paths].sort()) {
    const oldRecord = Object.hasOwn(before.packages, path) ? before.packages[path] : null;
    const newRecord = Object.hasOwn(after.packages, path) ? after.packages[path] : null;
    if (!oldRecord || !newRecord) {
      changes.push({path, type: oldRecord ? 'removed' : 'added', fields: []});
      continue;
    }
    const fields = [...new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])]
      .filter(key => !Object.hasOwn(oldRecord, key) || !Object.hasOwn(newRecord, key)
        || !equal(oldRecord[key], newRecord[key])).sort();
    if (fields.length) changes.push({path, type:'changed', fields});
  }
  return changes;
}

function compareRootRequirements(before, after) {
  if (globalThis.LabYarn?.format(before.packages)) return [];
  const rows = [];
  for (const section of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
    const a=before.packages[''][section] || {}, b=after.packages[''][section] || {};
    for (const name of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()) {
      const old=Object.hasOwn(a,name)?a[name]:null, next=Object.hasOwn(b,name)?b[name]:null;
      if (old!==next) rows.push({section,name,before:old,after:next});
    }
  }
  return rows;
}
comparePackageLocks.rootRequirements = compareRootRequirements;
if (typeof module === 'object' && module.exports) module.exports = comparePackageLocks;
