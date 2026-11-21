'use strict';
(() => {
  const {t} = Lab;
  const line = (parent,tag,text) => {
    const node = document.createElement(tag); node.textContent=text; parent.append(node); return node;
  };
  const isoDay = value => value?.slice(0,10) || '—';
  function results(parent,{man,lock,rows,documents,errors,level,sample,source}) {
    const result = LabCriterion.project(rows,documents,level);
    const goal = level==='green' ? 'Green' : 'Yellow';
    parent.replaceChildren();
    line(parent,'h2',t('Что изменить для ','What to change for ')+goal);
    const covered=result.total-result.unknown;
    if (sample) line(parent,'p',t('В этой ветке четыре прямые библиотеки. Yellow требует округлить 80% от четырёх вверх, поэтому здесь обе цели требуют четыре актуальные версии.','This branch has four direct libraries. Yellow rounds 80% of four up, so both goals require four fresh releases here.'));
    line(parent,'p',t('Актуальны сейчас: ','Fresh now: ')+result.fresh+'/'+result.total+
      t('. Для цели нужно ','; goal requires ')+result.required+
      t('. Установленная версия и даты известны для ','. Known installed version and dates for ')+covered+'/'+result.total+'.');
    if (result.targets.length) {
      const list = line(parent,'ol','');
      for (const row of result.targets) {
        line(list,'li',row.name+' '+row.version+' → '+row.target+
          (treeSemver.satisfies(row.target,row.range) ? t(' · входит в текущий диапазон ',' · within the current range ') : t(' · нужно изменить диапазон ',' · edit the declared range '))+row.range);
      }
      line(parent,'p',t('При этих версиях в окно свежести попадут ','These versions would put ')+result.projected+'/'+result.total+
        t(' прямых зависимостей. Сначала выбраны обновления внутри текущих диапазонов.',' direct dependencies within the freshness window. Updates within current ranges are preferred.'));
    } else {
      line(parent,'p',!result.total ? t('В корне нет прямых зависимостей для оценки.','No direct declarations to assess at the root.') :
        result.fresh>=result.required ? t('По известным датам порог свежести уже выполнен.','The known dates already meet the freshness threshold.') :
        t('Данных пока недостаточно для выбора обновления.','There is not enough evidence to propose a release.'));
    }
    if(result.projected<result.required) line(parent,'p',t('До порога не хватает ещё ', 'The remaining gap to the threshold is ')+(result.required-result.projected)+'.');
    const metadata = new Map();
    for (const row of result.facts) {
      const doc=documents.get(row.name);
      for(const v of [row.version,row.target]) if(v && doc?.versions?.[v]) metadata.set(row.name+'@'+v,doc.versions[v]);
    }
    const changes = result.targets.flatMap(row=>LabPlan.read(man,lock,{[row.name]:row.target}));
    if (sample) showReactCheck(parent,changes);
    const yarn = LabYarn.format(lock.packages);
    const peers = yarn ? LabPlan.assessYarn(man,lock,changes,new Map(),metadata,true) : LabPlan.assess(lock,changes,new Map(),metadata,true);
    line(parent,'h3',t('Совместимость предложенных версий','Compatibility of the proposed versions'));
    line(parent,'p',t('Известных peer-конфликтов: ','Known peer conflicts: ')+peers.issues.length+
      t('. Выполнено требований: ','. Satisfied requirements: ')+peers.checks.length+
      t('. Не проверено: ','. Unchecked: ')+peers.unknown.length+'.');
    if(lock.lockfileVersion===1) line(parent,'p',t('В npm lock v1 нет peer-требований установленных пакетов. Полнота проверки зависит от доступных манифестов.','npm lock v1 omits installed packages’ peer requirements. Coverage depends on the available manifests.'));
    if(peers.issues.length) {
      const list=line(parent,'ul','');
      for(const p of peers.issues.slice(0,10)) line(list,'li',p.path+' → peer '+p.name+'@'+p.range+' · '+(p.version || t('версия отсутствует','no provider')));
      line(parent,'p',t('Проверьте совместимую версию потребителя перед применением плана.','Find a compatible release of the consumer before applying these targets.'));
    }
    const scope = line(parent,'details','');
    line(scope,'summary',t('Состав проверки и даты выпусков · ','Scope and release dates · ')+result.total);
    line(scope,'p',t('Считаем уникальные имена из dependencies, devDependencies и optionalDependencies выбранного корня. Пакеты без обычной версии в lock остаются в знаменателе. У Yarn проверяем известные требования прямых зависимостей.',
      'Counts distinct names in this root’s dependencies, devDependencies and optionalDependencies. Entries without a regular locked release stay in the denominator. Yarn checks known direct peer requirements.'));
    const details=line(scope,'ul','');
    for (const row of result.facts) {
      const reason=errors.get(row.name) || (row.status==='unknown'
        ? row.version ? t('нет дат для установленной или эталонной версии','dates unavailable for the installed or reference release') : t('нет обычной npm-версии в lock','no regular npm version in lock')
        : t('установлена ','installed ')+isoDay(row.released)+t(', старшая стабильная ',', highest stable ')+row.latest+' ('+isoDay(row.latestReleased)+t('), граница ','), cutoff ')+isoDay(row.cutoff));
      line(details,'li',row.name+'@'+(row.version || row.range)+' · '+({fresh:t('в окне','within window'),stale:t('устарела','stale'),unknown:t('нет данных','unknown')}[row.status])+' · '+reason);
    }
    if(errors.size) {
      const errorList=line(parent,'details',''); errorList.open=true;
      line(errorList,'summary',t('Нет данных о пакетах · ','Missing package data · ')+errors.size);
      const list=line(errorList,'ul',''); for(const [name,why] of errors) line(list,'li',name+' · '+why);
    }
    line(parent,'p',goal+t(' целиком пока не подтверждён. Без аудита безопасности неизвестно, выполнены ли условия: ',' as a whole remains unverified. Security evidence is needed for ')+
      (level==='green' ? 'Critical = 0, High = 0, Moderate + Low ≤ 20.' : 'Critical = 0, High ≤ 1.'));
    const audit=line(parent,'a',t('Открыть аудит безопасности','Open the security audit')); audit.href=Lab.urlFor('audit.html');
    line(parent,'p',sample ? t('Источник — четыре прямых зависимости из lock-файла UI-ветки и публичные записи npm до 1 июля 2024 года (00:00 UTC). Сохранены установленные, ближайшие подходящие и старшие стабильные выпуски.','Source — four direct entries from the UI branch lockfile and public npm metadata up to 1 July 2024 (00:00 UTC). The snapshot keeps installed, nearest eligible and highest stable releases.') :
      (documents.size ? t('Источник — ваш lock-файл и ','Source — your lockfile and ')+source+'.' : t('Источник — выбранные локальные файлы. Даты выпусков ещё не получены.','Source — the selected local files. Release dates are still unavailable.'))).className='hint';
    return result;
  }

  function showReactCheck(output,changes) {
    if (!LabPlan.crossesReact19(changes)) return;
    const section=line(output,'section','');
    line(section,'h3',t('Проверка из миграции на React 19','A check from a React 19 migration'));
    line(section,'p',t('Если в приложении есть статус с подсказкой, наведите на него мышь и перейдите к нему клавишей Tab. В обоих случаях должен появиться текст. В нашем проекте обёртка потеряла ref кнопки, хотя иконка по-прежнему была видна. Эту проверку ещё предстоит выполнить в вашем приложении.',
      'If a status in your app has a tooltip, hover it and focus it with Tab. Its explanation should appear both ways. In our migration the wrapper dropped the button ref while the icon still rendered. Run this check in your own app.'));
    line(section,'a',t('Попробовать проверку и скопировать её для MR','Try the check and copy it for your review')).href=Lab.urlFor('runtime.html?assertion=hint');
  }
  function prepare({output,options,button,progress,man,lock,level,sample,signal}) {
    const rows = LabCriterion.inventory(man,lock);
    const eligible=rows.filter(row=>row.version);
    const documents=new Map(sample ? Object.entries(LabWebpackReleaseSnapshot) : []), errors=new Map();
    const hosted=LabRegistry.hostedAudit===true;
    let source=sample?'':LabRegistry.base();
    function draw() {
      output.hidden=false;
      return results(output,{man,lock,level,rows,documents,errors,sample,source});
    }
    if (sample || !eligible.length) {
      button.disabled=false;
      button.onclick=draw;
      return;
    }

    options.hidden=false;
    line(options,'p',hosted
      ? t('Даты выпусков берутся из снимка на этом сайте.','Release dates come from this site’s snapshot.')
      : t('По кнопке выбранные имена пакетов будут отправлены в ','Calculating sends the selected package names to ')+source).className='hint';
    const publicHost=!hosted && source===LabRegistry.defaultBase;
    const selection=line(options,'div','');
    const picker=LabPackagePicker.mount(selection,{
      items:eligible.map(row=>({key:row.name,label:row.name,publicOrigin:row.publicRegistry,selected:!publicHost || row.publicRegistry})),
      publicDestination:publicHost ? source : null,
      onChange:ready=>{
        button.disabled=!ready;
        progress.textContent='';
        output.hidden=true;
      },
    });
    if(!picker.ready()) selection.querySelector('details').open=true;
    button.onclick=async()=>{
      const queue=picker.values().map(item=>item.key);
      const total=queue.length;
      if(!total || button.disabled || signal.aborted)return;
      let count=0, skipped=0;
      button.disabled=true;
      selection.inert=true;
      errors.clear();documents.clear();output.replaceChildren();output.hidden=true;
      const status=()=>progress.textContent=t('Обработано пакетов · ','Packages processed · ')+count+'/'+total;
      status();
      try {
        if(hosted) {
          const snapshot=await LabRegistry.releases(signal);
          if(signal.aborted)return;
          source=t('снимок от ','snapshot dated ')+new Date(snapshot.published*1000).toISOString().slice(0,10)+' UTC';
        }
        async function read() {
          while(queue.length && !signal.aborted) {
            const name=queue.shift();
            try {const doc=await LabRegistry.packument(name,signal);documents.set(name,doc);}
            catch(e){
              errors.set(name,hosted && e.status===404 ? t('Пакет отсутствует в снимке.','Package absent from snapshot.') : LabRegistry.message(e));
              if(!hosted && e instanceof TypeError){skipped+=queue.length;queue.length=0;}
            }
            if(!signal.aborted){count++;status();}
          }
        }
        await Promise.all(Array.from({length:Math.min(3,total)},read));
        if(signal.aborted)return;
        draw();
        if(skipped)progress.textContent+=t('. Из-за сбоя сети пропущено запросов · ','. Requests skipped after the network failure · ')+skipped;
      } catch(e) {
        if(signal.aborted)return;
        progress.textContent=LabRegistry.message(e);
      } finally {
        if(!signal.aborted){button.disabled=!picker.ready();selection.inert=false;}
      }
    };
  }
  window.LabCriterionPlan={prepare,showReactCheck};
})();
