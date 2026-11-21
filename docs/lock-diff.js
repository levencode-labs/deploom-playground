'use strict';

function comparePackageLocks(before, after) {
  function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function valid(lock) {
    return object(lock) && lock.lockfileVersion === 3 && object(lock.packages)
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

if (typeof module === 'object' && module.exports) module.exports = comparePackageLocks;
