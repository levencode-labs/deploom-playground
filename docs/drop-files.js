'use strict';
(() => {
  const {t}=Lab;
  const reads=new WeakMap();
  const targets = document.querySelectorAll('input[type=file]:not([webkitdirectory]), #tree-manifest, #targets');
  function note(target,text) {
    let node=document.getElementById(target.id+'-file-status');
    if(!node){
      node=document.createElement('small'); node.id=target.id+'-file-status'; node.className='drop-note';
      node.setAttribute('role','status'); target.insertAdjacentElement('afterend',node);
    }
    node.textContent=text;
  }
  async function fill(target,file) {
    const revision=(reads.get(target)||0)+1; reads.set(target,revision);
    if(file.size>8_000_000) {note(target,t('Лимит — 8 МБ.','File limit: 8 MB.'));return;}
    try {
      const value=await file.text();
      if(reads.get(target)!==revision) return;
      target.value=value;target.dispatchEvent(new Event('input',{bubbles:true}));
      note(target,file.name);
    } catch {note(target,t('Не удалось прочитать файл.','Could not read the file.'));}
  }
  for (const target of targets) {
    const picker=target.type==='file';
    const zone=picker ? target.closest('label') || target : target;
    if (picker) {
      const hint=document.createElement('small');
      hint.textContent=t('Выберите файл или перетащите сюда','Choose a file or drop it here');
      hint.className='drop-hint';target.insertAdjacentElement('afterend',hint);
    }
    const hasFiles=e=>Array.from(e.dataTransfer?.types || []).includes('Files');
    zone.classList.add('drop-zone');
    zone.addEventListener('dragover',event=>{
      if(!hasFiles(event)) return;
      event.preventDefault();event.dataTransfer.dropEffect='copy';zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave',event=>{if(!zone.contains(event.relatedTarget))zone.classList.remove('drag-over');});
    zone.addEventListener('drop',event=>{
      if(!hasFiles(event))return;
      event.preventDefault();event.stopPropagation();zone.classList.remove('drag-over');
      const files=Array.from(event.dataTransfer.files);
      const lock=['tree-file','audit-file','before','after','lock-file'].includes(target.id);
      if(files.some(f=>lock ? /^package\.json$/i.test(f.name) : /^package-lock\.json$/i.test(f.name)) || !files.length || (!target.multiple && files.length!==1) || files.some(f=>!(lock ? /\.(json|lock)$/i : /\.json$/i).test(f.name))) {
        note(target,t('Проверьте число файлов и расширение для этого поля.','Check the file count and extension for this field.')); return;
      }
      if (!picker) {fill(target,files[0]);return;}
      const transfer=new DataTransfer();for(const file of files) transfer.items.add(file);
      target.files=transfer.files;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));
    });
    if(!picker) target.addEventListener('input',()=>{reads.set(target,(reads.get(target)||0)+1);note(target,'');});
    if(target.dataset.fill) target.addEventListener('change',()=>{if(target.files[0])fill(document.getElementById(target.dataset.fill),target.files[0]);});
  }
  // A missed drop must not navigate away from a partially filled project.
  for(const type of ['dragover','drop']) document.addEventListener(type,event=>{
    if(Array.from(event.dataTransfer?.types||[]).includes('Files'))event.preventDefault();
  });
})();
