'use strict';
(() => {
  const {t}=Lab, {cases,environment}=SelectorLab, $=id=>document.getElementById(id);
  const query=new URLSearchParams(location.search);
  let rev=Object.hasOwn(cases,query.get('rev'))?query.get('rev'):'override';
  const choices=document.querySelectorAll('[name=revision]'), predictions=document.querySelectorAll('[name=prediction]');
  function reset() {
    const {manifest,cssVersion}=cases[rev];
    $('revision-code').textContent='css-select@'+cssVersion+(manifest.overrides?'\n"overrides": '+JSON.stringify(manifest.overrides):'');
    for (const p of predictions) p.checked=false;
    $('reveal').disabled=true;$('selector-result').hidden=true;
  }
  for (const input of choices) {
    input.checked=input.value===rev;
    input.onchange=()=>{rev=input.value;Lab.setExampleState({rev});reset();};
  }
  for (const p of predictions) p.onchange=()=>{$('reveal').disabled=false;$('selector-result').hidden=true;};
  $('reveal').onclick=()=>{
    const c=cases[rev], actual=c.error?'error':c.selected.length===1&&c.selected[0]===2?'second':'empty';
    const predicted=document.querySelector('[name=prediction]:checked').value;
    $('actual-heading').textContent=predicted===actual?t('Прогноз совпал с прогоном','Your prediction matches the run'):t('Вот что произошло в прогоне','Here is what the run returned');
    $('actual-lock').textContent='nth-check@'+c.nthVersion;
    $('actual-advisory').textContent=treeSemver.satisfies(c.nthVersion,'<2.0.1')?t('Попадает в диапазон <2.0.1','Affected by this advisory (<2.0.1)'):t('За пределами диапазона <2.0.1','Outside the affected range (<2.0.1)');
    $('actual-call').textContent=c.error||(actual==='second'?t('Найден ровно второй rect','Matched only the second rect'):JSON.stringify(c.selected));
    $('rect-two').classList.toggle('matched',actual==='second');
    $('actual-install').textContent=t('Запись чистой установки · ','Recorded clean install · ')+'npm ci · exit '+c.ciExit+' · '+environment.platform+' '+environment.arch+' · Node '+environment.node+' · npm '+environment.npm;
    $('actual-why').textContent=c.error?t('css-select@2.1.0 вызывает getNCheck(rule). После замены nth-check на 2.1.1 старый require получает объект с полем default. Вызов этого объекта как функции и даёт ошибку.','css-select@2.1.0 calls getNCheck(rule). With nth-check 2.1.1, its require returns an object with a default property. Calling that object throws the recorded error.'):rev==='parent'?t('css-select@4.3.0 запрашивает совместимую версию nth-check и обрабатывает тот же селектор.','css-select@4.3.0 requests a compatible nth-check release and evaluates the same selector successfully.'):t('Старая пара обрабатывает селектор. Версия nth-check из её lock-файла при этом входит в диапазон advisory.','The original pair matches the selector. Its locked nth-check release is in the affected advisory range.');
    $('published-code').replaceChildren();
    for(const s of SelectorLab.snippets){
      const a=document.createElement('a'),pre=document.createElement('pre');a.href=s.url;a.textContent=s.package+' · '+s.file+' · '+s.lines.join(', ');pre.textContent=s.code;$('published-code').append(a,pre);
    }
    for(const [id,page] of [['selector-tree','tree.html'],['selector-compare','compare.html'],['selector-audit','audit.html'],['selector-plan','plan.html']]) $(id).href=ReviewExample.link(page,'selector',rev,c.nthPath);
    $('selector-command').textContent='npm explain "'+c.nthPath+'"';
    $('selector-result').hidden=false;$('selector-result').focus();
  };
  reset();
})();
