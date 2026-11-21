'use strict';
(() => {
  const {t,page}=Lab;
  const scope=new URL('.',location.href).pathname;
  const params=new URLSearchParams(location.search);
  const requestedExample=Boolean(params.get('example')) || (page==='tree.html' && ['yarn','react','dom'].some(k=>params.has(k))) ||
    (page==='ranges.html' && ['scheduler','react'].includes(params.get('pkg')));
  const tool=['audit.html','plan.html','tree.html','compare.html','advisories.html','ranges.html'].includes(page);
  const create=(tag,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
  const bar=create('section');bar.className='project-bar';
  bar.setAttribute('aria-label',t('Файлы проекта','Project files'));
  const ownLink=create('a',t('К файлам моего проекта','Use my project files'));
  ownLink.hidden=true;
  if(tool)ownLink.href=Lab.urlFor(page);
  const notice=create('small');notice.id='shared-status';
  notice.textContent=t('Файлы хранятся в этом браузере до удаления.','Files stay in this browser until removed.');
  const slots={};
  const revisions={manifest:0,lock:0};
  const scripts=new Map();
  let opened, sync=0, hasFiles=false, previousManifest=null;
  function script(globalName,filename) {
    if(window[globalName])return Promise.resolve();
    if(!scripts.has(filename))scripts.set(filename,new Promise((resolve,reject)=>{
      const s=document.createElement('script');s.src=filename;s.onload=resolve;s.onerror=reject;document.head.append(s);
    }).catch(error=>{scripts.delete(filename);throw error;}));
    return scripts.get(filename);
  }
  function database() {
    if(!opened)opened=new Promise((resolve,reject)=>{
      const r=indexedDB.open('deploom-lab-project',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('selected');
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    }).catch(error=>{opened=null;throw error;});
    return opened;
  }
  // Merge a single slot inside the transaction so another tab's other file survives.
  async function snapshot(kind,file,revision) {
    const db=await database();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('selected','readwrite'), store=tx.objectStore('selected'), req=store.get(scope);
      let files,changed=false;
      req.onsuccess=()=>{
        const saved=req.result;
        files=saved && !saved.handle ? {manifest:saved.manifest || null, lock:saved.lock || null} : {manifest:null,lock:null};
        if(kind && revisions[kind]===revision){files[kind]=file;changed=true;}
        if(changed || saved?.handle){
          if(files.manifest || files.lock)store.put(files,scope);
          else store.delete(scope);
        }
      };
      tx.oncomplete=()=>resolve({files,changed});
      tx.onabort=tx.onerror=()=>reject(tx.error);
    });
  }
  let channel;
  try {channel=new BroadcastChannel('deploom-lab-project:'+scope);} catch {}
  const plain=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  async function validate(kind,file) {
    if(!file || !((kind==='manifest' && file.name==='package.json') || (kind==='lock' && ['package-lock.json','yarn.lock'].includes(file.name))))
      throw Error(kind==='manifest'?t('Выберите package.json.','Choose package.json.'):t('Выберите package-lock.json или yarn.lock.','Choose package-lock.json or yarn.lock.'));
    if(file.size>8_000_000)throw Error(t('Файл больше 8 МБ.','File exceeds 8 MB.'));
    const text=(await file.text()).replace(/^\uFEFF/,'');
    try {
      if(file.name==='yarn.lock'){
        if(text.trimStart().startsWith('{'))throw Error();
        await script('LabLockGraph','lock-graph.js');
        await Promise.all([script('LabClassic','vendor/yarn-classic.js'),script('jsyaml','vendor/js-yaml.min.js')]);
        await script('LabYarn','yarn-lock.js');LabYarn.read(text);
      } else {
        const data=JSON.parse(text);
        if(!plain(data))throw Error();
        if(kind==='manifest'){
          if(Object.hasOwn(data,'lockfileVersion'))throw Error();
          for(const k of ['dependencies','devDependencies','optionalDependencies','peerDependencies']) {
            if(data[k]!==undefined && (!plain(data[k]) || Object.values(data[k]).some(v=>typeof v!=='string')))throw Error();
          }
        } else {
          await script('LabLockGraph','lock-graph.js');
          LabLockGraph.npmLock(data);
        }
      }
    } catch {
      throw Error(kind==='manifest'?t('Не удалось прочитать манифест npm.','Could not read the npm manifest.'):
        file.name==='yarn.lock'?t('Не удалось прочитать Yarn Classic или Berry.','Could not read a Yarn Classic or Berry lockfile.'):
        t('Проверьте раздел dependencies для npm lock v1 или packages для v2/v3.','Check dependencies in an npm v1 lockfile or packages in v2/v3.'));
    }
    return new File([text],file.name,{type:file.type,lastModified:file.lastModified});
  }
  async function refresh(changedSlot) {
    const ticket=++sync;
    try {
      const {files}=await snapshot();
      if(ticket!==sync)return;
      const active=Boolean(files.manifest || files.lock), prior=hasFiles;
      hasFiles=active;
      for(const [kind,ui] of Object.entries(slots)) {
        const file=files[kind];
        ui.value.textContent=file?file.name:t('Выбрать или перетащить','Choose or drop');
        ui.zone.dataset.filled=String(Boolean(file));ui.clear.hidden=!file;
      }
      const example=page==='audit.html' ? Boolean(window.ReviewExample?.auditRevision) : requestedExample;
      ownLink.hidden=!(active && example && tool);
      if(!tool || example || (!active && !prior))return;
      if(page==='compare.html' && active)await script('LabRegistry','registry.js');
      let name=[files.manifest?.name,files.lock?.name].filter(Boolean).join(' + ');
      const manifestText=files.manifest?await files.manifest.text():null;
      if(manifestText) {
        try {const n=JSON.parse(manifestText).name;if(typeof n==='string' && n)name=n;} catch {}
      }
      if(ticket!==sync)return;
      if(changedSlot==='lock' && previousManifest!==manifestText)changedSlot=undefined;
      previousManifest=manifestText;
      window.dispatchEvent(new CustomEvent('lab-project',{detail:active || changedSlot?{...files,name,changedSlot}:null}));
    } catch {
      if(ticket===sync)notice.textContent=t('Локальное хранилище недоступно. Проверьте настройки браузера.','Local storage is unavailable. Check your browser settings.');
    }
  }
  async function update(kind,incoming) {
    const revision=++revisions[kind], ui=slots[kind];
    ui.error.textContent='';
    try {
      if(incoming && incoming.length!==1)throw Error(t('Перетащите один файл в это поле.','Drop one file in this field.'));
      const file=incoming?await validate(kind,incoming[0]):null;
      if(revision!==revisions[kind])return;
      const {changed}=await snapshot(kind,file,revision);
      if(changed){channel?.postMessage(kind);await refresh(kind);}
    } catch(error) {
      if(revision===revisions[kind])ui.error.textContent=error instanceof Error && !(error instanceof DOMException)?error.message:
        t('Браузер не смог сохранить изменение.','The browser could not save this change.');
    }
  }
  function addSlot(kind,title) {
    const wrap=create('div');wrap.className='project-slot';
    const zone=create('label');zone.id='shared-'+kind+'-zone';zone.className='project-zone';
    const label=create('strong',title),value=create('span',t('Выбрать или перетащить','Choose or drop'));
    value.id='shared-'+kind+'-name';
    const input=create('input');input.type='file';input.id='shared-'+kind;
    input.accept=kind==='manifest'?'.json':'.json,.lock';
    input.setAttribute('aria-label',title);input.setAttribute('aria-describedby',value.id+' shared-'+kind+'-error');
    const clear=create('button','×');clear.type='button';clear.hidden=true;clear.id='shared-'+kind+'-clear';
    clear.setAttribute('aria-label',t('Убрать файл ','Remove file ')+title);clear.title=clear.getAttribute('aria-label');
    const error=create('small');error.id='shared-'+kind+'-error';error.className='project-error';error.setAttribute('role','status');
    zone.append(label,value,input);wrap.append(zone,clear,error);bar.append(wrap);
    slots[kind]={zone,value,clear,error};
    input.addEventListener('change',()=>{const files=Array.from(input.files);input.value='';if(files.length)update(kind,files);});
    clear.addEventListener('click',()=>{input.focus();update(kind,null);});
    for(const type of ['dragover','drop'])zone.addEventListener(type,event=>{
      if(!Array.from(event.dataTransfer?.types || []).includes('Files'))return;
      event.preventDefault();event.stopImmediatePropagation();
      if(type==='dragover'){zone.classList.add('over');event.dataTransfer.dropEffect='copy';}
      else {zone.classList.remove('over');update(kind,Array.from(event.dataTransfer.files));}
    },true);
    zone.addEventListener('dragleave',event=>{if(!zone.contains(event.relatedTarget))zone.classList.remove('over');});
  }
  addSlot('manifest','package.json');
  addSlot('lock','package-lock.json / yarn.lock');
  bar.append(notice,ownLink);document.querySelector('[data-nav]').append(bar);
  channel?.addEventListener('message',({data})=>refresh(data==='manifest' || data==='lock'?data:undefined));
  window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh(),{once:true});
  else refresh();
})();
