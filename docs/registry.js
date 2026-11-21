'use strict';
(() => {
  const defaultBase = 'https://registry.npmjs.org/';
  const t = (ru,en) => window.Lab.t(ru,en);
  const configuredBase = defaultBase;
  const hostedAudit = false;
  let cachedReleases;
  // Discard registry addresses saved by earlier public releases.
  try { sessionStorage.removeItem('deploom-lab-registry'); } catch {}
  const base = () => configuredBase;
  function url(name, version) {
    if (!/^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/i.test(name) || name.length > 214) throw Error('PACKAGE_NAME');
    return base() + encodeURIComponent(name).replace(/^%40/,'@') + (version === undefined ? '' : '/' + encodeURIComponent(version));
  }
  function message(error) {
    if (error?.message === 'STALE_RELEASES') return t('Срок действия каталога выпусков истёк. Для актуальных дат доступна локальная версия.', 'The release catalog has expired. Use the local edition for current release dates.');
    if (hostedAudit && error?.status===404) return t('В снимке нет этой записи. Проверьте её в локальной версии через реестр.', 'This record is missing from the snapshot. Check the registry with the local edition.');
    if (error?.message === 'METADATA' && hostedAudit) return t('Не удалось прочитать опубликованный каталог. Проверка не завершена.','The published catalog could not be read. The check is incomplete.');
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
      const response = await fetch(address,{...options,credentials:address==='audit-data/releases-v1.json'?'same-origin':'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});
      if (!response.ok) throw Object.assign(Error('HTTP '+response.status),{status:response.status});
      try { return await response.json(); } catch (e) { if (controller.signal.aborted) throw e; throw Error('METADATA'); }
    } finally { clearTimeout(timer); signal?.removeEventListener('abort',abort); }
  }
  function validReleaseCatalog(data) {
    if(data?.schema!==1 || !data.packages || typeof data.packages!=='object' || Array.isArray(data.packages) ||
       !Number.isSafeInteger(data.published) || data.published<=0 || data.published>Date.now()/1000+300) throw Error('METADATA');
    if(Date.now()/1000-data.published>7*86400) throw Error('STALE_RELEASES');
    return data;
  }
  async function releases(signal) {
    if(cachedReleases) return validReleaseCatalog(await cachedReleases);
    const loading=json('audit-data/releases-v1.json',{},signal).then(validReleaseCatalog);
    cachedReleases=loading;
    try { return await loading; }
    catch(error) {if(cachedReleases===loading)cachedReleases=null;throw error;}
  }
  async function packument(name,signal) {
    if(hostedAudit) {
      const catalog=await releases(signal);
      if(!Object.hasOwn(catalog.packages,name)) throw Object.assign(Error('SNAPSHOT_MISSING'),{status:404});
      const data=catalog.packages[name];
      if(data?.name!==name || !data.versions || !data.time)throw Error('METADATA');
      return data;
    }
    const value = await json(url(name),{},signal);
    if (value?.name !== name || !value.versions || typeof value.versions !== 'object') throw Error('METADATA');
    return value;
  }
  async function manifest(name,version,signal) {
    let doc;
    if (!hostedAudit && base() === defaultBase) doc = await json(url(name,version),{},signal);
    else {
      const pack = await packument(name,signal);
      if (!Object.hasOwn(pack.versions,version)) throw Object.assign(Error('HTTP 404'),{status:404});
      doc = pack.versions[version];
      if (hostedAudit && doc && !Object.hasOwn(doc,'name')) doc = {...doc,name};
    }
    if (doc?.name !== name || doc.version !== version) throw Error('METADATA');
    return doc;
  }
  function setFile(input,file) {
    const transfer = new DataTransfer(); if (file) transfer.items.add(file);
    input.files = transfer.files;
  }
  window.LabRegistry={base,url,json,packument,manifest,message,defaultBase,hostedAudit,releases,setFile};
})();
