'use strict';
(() => {
  const defaultBase = 'https://registry.npmjs.org/';
  const t = (ru,en) => window.Lab.t(ru,en);
  const configuredBase = defaultBase;
  // Discard registry addresses saved by earlier public releases.
  try { sessionStorage.removeItem('deploom-lab-registry'); } catch {}
  const base = () => configuredBase;
  function url(name, version) {
    if (!/^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name) || name.length > 214) throw Error('PACKAGE_NAME');
    return base() + encodeURIComponent(name).replace(/^%40/,'@') + (version === undefined ? '' : '/' + encodeURIComponent(version));
  }
  function message(error) {
    if (error?.status === 401 || error?.status === 403) return 'HTTP '+error.status+' · '+t('реестр ограничил доступ. Браузер не читает учётные данные из .npmrc.','the registry denied access. The browser cannot use credentials from .npmrc.');
    if (error?.status === 404) return t('HTTP 404 · запись или API отсутствует по этому адресу.','HTTP 404 · the record or API is missing at this address.');
    if (error?.status) return 'HTTP '+error.status+' · '+t('сервер отклонил запрос.','the server rejected the request.');
    if (error?.name === 'TimeoutError') return t('Истекло время ожидания ответа.','The request timed out.');
    if (error?.name === 'AbortError') return t('Запрос остановлен.','Request stopped.');
    if (error?.message === 'METADATA') return t('Ответ получен, но в нём нет ожидаемых метаданных npm.','The response did not contain the expected npm metadata.');
    return t('Браузер не получил читаемый ответ. Проверьте сеть, VPN и разрешение CORS для адреса этой страницы.','The browser could not read a response. Check connectivity, VPN and CORS for this page’s origin.');
  }
  async function json(address, options = {}, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort',abort,{once:true});
    const timer = setTimeout(()=>controller.abort(new DOMException('Timeout','TimeoutError')),20000);
    try {
      const response = await fetch(address,{...options,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
      if (!response.ok) throw Object.assign(Error('HTTP '+response.status),{status:response.status});
      try { return await response.json(); } catch (e) { if (controller.signal.aborted) throw e; throw Error('METADATA'); }
    } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
  }
  async function packument(name,signal) {
    const value = await json(url(name),{},signal);
    if (value?.name !== name || !value.versions || typeof value.versions !== 'object') throw Error('METADATA');
    return value;
  }
  async function manifest(name,version,signal) {
    let doc;
    if (base() === defaultBase) doc = await json(url(name,version),{},signal);
    else {
      const pack = await packument(name,signal);
      if (!Object.hasOwn(pack.versions,version)) throw Object.assign(Error('HTTP 404'),{status:404});
      doc = pack.versions[version];
    }
    if (doc?.name !== name || doc.version !== version) throw Error('METADATA');
    return doc;
  }
  function setFile(input,file) {
    const transfer = new DataTransfer(); if (file) transfer.items.add(file);
    input.files = transfer.files;
  }
  async function projectFiles(source) {
    const names = ['package.json','package-lock.json','yarn.lock'];
    const files = new Map();
    if (source?.kind === 'directory') {
      for (const name of names) {
        try { files.set(name,await (await source.getFileHandle(name)).getFile()); }
        catch (e) { if (e.name !== 'NotFoundError') throw e; }
      }
    } else {
      for (const file of source) {
        const parts = file.webkitRelativePath?.split('/');
        if ((!file.webkitRelativePath || parts.length === 2) && names.includes(file.name)) files.set(file.name,file);
      }
    }
    const manifest = files.get('package.json') || null;
    let lock = files.get('package-lock.json') || files.get('yarn.lock') || null;
    if (files.has('yarn.lock') && files.has('package-lock.json')) {
      let manager;
      if (manifest && manifest.size < 8*1024*1024) {try {manager=JSON.parse(await manifest.text()).packageManager;} catch {}}
      if (/^yarn@/.test(manager)) lock=files.get('yarn.lock');
      else if (!/^npm@/.test(manager)) throw Error(t('В папке два lock-файла. Выберите нужный через поля файлов.','Two lockfiles found. Choose the intended one with the individual file inputs.'));
    }
    if (!manifest && !lock) throw Error(t('В корне выбранной папки нет package.json или lock-файла.','The chosen folder has no package.json or lockfile at its root.'));
    return {manifest,lock};
  }
  window.LabRegistry={base,url,json,packument,manifest,message,defaultBase,projectFiles,setFile};
})();
