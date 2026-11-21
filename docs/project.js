'use strict';
(() => {
  const {t} = Lab;
  const scope = new URL('.',location.href).pathname;
  const header = document.querySelector('[data-nav]');
  const element = (tag, text) => { const node=document.createElement(tag); node.textContent=text; return node; };
  const strip = element('section',''); strip.className='project-bar';
  strip.setAttribute('aria-label',t('Папка проекта','Project folder'));
  const select = element('button',t('Выбрать папку проекта','Choose project folder'));
  select.type='button'; select.id='shared-choose';
  const input=document.createElement('input');
  input.type='file'; input.webkitdirectory=true; input.multiple=true; input.hidden=true; input.id='shared-folder';
  const nameLabel=element('strong',''); nameLabel.id='shared-name'; nameLabel.hidden=true;
  const close=element('button',t('Закрыть проект','Close project')); close.type='button'; close.id='shared-close'; close.hidden=true;
  const status=element('small',''); status.id='shared-status'; status.setAttribute('role','status');
  const ownLink=element('a',t('Открыть свой проект в этом инструменте','Use my project in this tool')); ownLink.hidden=true;
  strip.append(nameLabel,select,input,close,ownLink,status); header.append(strip);
  let version=0, current=null, persisted=false, opened;
  const params=new URLSearchParams(location.search);
  const page=location.pathname.split('/').pop();
  const example=Boolean(params.get('example')) || (page==='tree.html' && ['yarn','react','dom'].some(k=>params.has(k))) ||
    (page==='ranges.html' && ['scheduler','react'].includes(params.get('pkg')));
  const tool=['audit.html','plan.html','tree.html','compare.html','advisories.html','ranges.html'].includes(page);

  function db() {
    if (!opened) opened=new Promise((resolve,reject)=>{
      const request=indexedDB.open('deploom-lab-project',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('selected');
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return opened;
  }
  async function record(action,value) {
    const database=await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction('selected',action==='get'?'readonly':'readwrite');
      const store=tx.objectStore('selected');
      const req=action==='get'?store.get(scope):action==='clear'?store.delete(scope):store.put(value,scope);
      tx.oncomplete=()=>resolve(req.result); tx.onabort=tx.onerror=()=>reject(tx.error);
    });
  }
  let channel;
  try {channel=new BroadcastChannel('deploom-lab-project:'+scope);} catch {}
  function display(name) {
    nameLabel.textContent=name || '';nameLabel.hidden=close.hidden=!name;
    select.textContent=name?t('Сменить папку','Change folder'):t('Выбрать папку проекта','Choose project folder');
    ownLink.hidden=!(name && example && tool);
    if(!ownLink.hidden) ownLink.href=Lab.urlFor(page);
    status.textContent=name?t('Выбор сохранён в этом браузере до закрытия проекта.','Your selection is saved in this browser until you close the project.'):'';
  }
  function apply(files,name) {
    current=name; display(name);
    if(!example && tool) window.dispatchEvent(new CustomEvent('lab-project',{detail:{...files,name}}));
  }
  async function registry() {
    if(window.LabRegistry) return LabRegistry;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='registry.js';script.onload=resolve;script.onerror=reject;
      document.head.append(script);
    });
    return LabRegistry;
  }
  async function restore() {
    const token=++version;
    let saved;
    try {
      saved=await record('get');
      if(token!==version)return;
      if(!saved) {
        if(current && persisted) {current=null; location.reload();} else if(!current) display('');
        return;
      }
      const api=await registry();
      let files=saved;
      if(saved.handle) {
        if(await saved.handle.queryPermission({mode:'read'})!=='granted') throw Error('PERMISSION');
        files=await api.projectFiles(saved.handle);
      }
      if(token===version) {persisted=true;apply({manifest:files.manifest || null,lock:files.lock || null},saved.name);}
    } catch {
      if(token!==version)return;
      if(current && !example && tool) window.dispatchEvent(new CustomEvent('lab-project',{detail:null}));
      current=saved?.name || null;persisted=Boolean(saved);display(current);
      if(saved) status.textContent=t('Нет доступа к папке. Выберите её ещё раз или закройте проект.','Folder unavailable. Choose it again or close the project.');
    }
  }
  async function save(source,token) {
    try {
      const files=await (await registry()).projectFiles(source);
      if(token!==version)return;
      const handle=source.kind==='directory'?source:null;
      const name=handle?.name || source[0]?.webkitRelativePath.split('/')[0] || t('Проект','Project');
      let stored=true;
      try {
        const snapshot=f=>f?new File([f],f.name,{type:f.type,lastModified:f.lastModified}):null;
        const saveFiles=()=>record('put',{name,manifest:snapshot(files.manifest),lock:snapshot(files.lock)});
        if(handle) {
          try { await record('put',{name,handle}); }
          catch(error) { if(error.name!=='DataCloneError')throw error;await saveFiles(); }
        } else await saveFiles();
      } catch {stored=false;}
      if(token!==version)return;
      if(!stored && persisted) {
        status.textContent=t('Браузер не сохранил новую папку. Предыдущий выбор по-прежнему открыт.','Could not save the new folder. The previous project is still open.');return;
      }
      persisted=stored; apply(files,name);
      if(stored)channel?.postMessage('refresh');
      else status.textContent=t('Папка открыта в этой вкладке. Браузер не смог сохранить выбор для других страниц.','Folder open in this tab. The browser could not save it for other pages.');
    } catch(error) {if(token===version)status.textContent=error.message;}
  }
  select.addEventListener('click',async()=>{
    if(typeof window.showDirectoryPicker!=='function'){input.click();return;}
    const token=++version;
    try {const handle=await window.showDirectoryPicker({mode:'read'});if(token===version)await save(handle,token);}
    catch(error) {
      if(token!==version || error.name==='AbortError')return;
      if(error.name==='SecurityError'){input.click();return;}
      status.textContent=t('Не удалось открыть папку. ','Could not open folder. ')+error.message;
    }
  });
  input.addEventListener('change',()=>{
    const files=Array.from(input.files); input.value=''; if(files.length)save(files,++version);
  });
  close.addEventListener('click',async()=>{
    const token=++version;
    try {if(persisted)await record('clear');}
    catch {status.textContent=t('Браузер не смог удалить сохранённый выбор.','The browser could not clear the saved project.');return;}
    if(token!==version)return;
    channel?.postMessage('refresh'); current=null;persisted=false;
    if(!example && tool)window.dispatchEvent(new CustomEvent('lab-project',{detail:null}));
    location.reload();
  });
  channel?.addEventListener('message',restore);
  window.addEventListener('pageshow',event=>{if(event.persisted)restore();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restore,{once:true});
  else restore();
})();
