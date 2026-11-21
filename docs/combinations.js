'use strict';
(() => {
  const {versions,base,build,ui,merged,fixed} = typeof module==='object' && module.exports
    ? require('./webpack-data') : LabWebpack;
  const mergeError='npm error code ERESOLVE\nnpm error Found: webpack@5.91.0\nnpm error peer webpack@"^4.4.0" from mini-css-extract-plugin@0.9.0';
  function conflicts(snapshot,semver=treeSemver){
    return Object.entries(snapshot).filter(([name,version])=>versions[name] && !semver.satisfies(snapshot.webpack,versions[name][version]));
  }
  if(typeof module==='object' && module.exports){module.exports={versions,base,build,ui,conflicts};return;}
  const {t}=Lab, el=id=>document.getElementById(id);
  const buildRecord = 'webpack 5.91.0 · page.css\n.review-status { color: #1456a1; }';
  const plannerUrl = revision => Lab.urlFor('plan.html?example=webpack&revision='+revision+'#plan-output');
  if (el('quick-merge')) {
    const params = new URLSearchParams(location.search);
    const validReact = value => ['18.2.0','18.3.1'].includes(value);
    if (!params.has('merge') && validReact(params.get('react')) && validReact(params.get('dom'))) {
      location.replace(Lab.urlFor('peers.html?' + new URLSearchParams({react:params.get('react'),dom:params.get('dom')})));
      return;
    }

    const plugin = 'mini-css-extract-plugin';
    const action = el('merge-action');
    const report = el('merge-report');
    const labels = {
      ready: 'Merge',
      merged: t('Обновить плагин и собрать страницу', 'Update the plugin and build the page'),
      fixed: t('Вернуться к двум MR', 'Reset to the two MRs'),
    };
    let state = ['merged','fixed'].includes(params.get('merge')) ? params.get('merge') : 'ready';
    el('build-change').textContent = 'webpack ' + base.webpack + ' → ' + build.webpack;
    el('ui-change').textContent = '+ ' + plugin + '@' + ui[plugin];

    function drawPreview() {
      action.textContent = labels[state];
      report.hidden = state === 'ready';
      const step = {ready:0,merged:3,fixed:4}[state];
      el('merge-detail').href = Lab.urlFor('combinations.html?step=' + step);
      const corePanel = el('core-plan');
      corePanel.hidden = state === 'ready';
      if (!corePanel.hidden && !corePanel.childElementCount) {
        const link = document.createElement('a');
        link.href = Lab.urlFor('combinations.html#build-mr');
        link.textContent = t('Собрать свой MR с webpack 5 и css-loader 3.6.0', 'Build your own MR with webpack 5 and css-loader 3.6.0');
        corePanel.append(link);
      }
      el('webpack-planner').hidden = report.hidden;
      if (report.hidden) return;
      el('webpack-planner').href = plannerUrl(state);
      el('css-proof').hidden = state!=='fixed';
      const snapshot = state === 'merged' ? merged : fixed;
      const blocked = conflicts(snapshot).length > 0;
      report.dataset.status = blocked ? 'fail' : 'pass';
      el('merge-heading').textContent = blocked
        ? t('Git объединил изменения. npm остановился.', 'Git merged the changes. npm stopped.')
        : t('Исправленная сборка выпустила стили страницы', 'The fixed build emitted the page stylesheet');
      el('merge-evidence').textContent = blocked ? mergeError :
        buildRecord;
      el('merge-lesson').textContent = blocked
        ? t('В сборке теперь webpack 5, а плагин из UI-ветки требует webpack 4. Попробуйте составить план обновления для UI-ветки.',
            'The merged build uses webpack 5, but the UI plugin needs webpack 4. Try planning the upgrade from the UI branch.')
        : t('В объединённой ветке сохранили css-loader 6.11.0 и подняли плагин до 2.9.0. После npm ci тест собрал страницу, открыл указанный в HTML файл page.css и нашёл правило для .review-status.',
            'The merged branch kept css-loader 6.11.0 and upgraded the plugin to 2.9.0. After npm ci, the test built the page, read the page.css linked by the HTML and found the .review-status rule.');
    }
    action.addEventListener('click', () => {
      state = {ready:'merged',merged:'fixed',fixed:'ready'}[state];
      drawPreview();
      Lab.setExampleState({merge:state});
      if (!report.hidden && report.getBoundingClientRect().bottom > innerHeight) report.scrollIntoView({block:'start'});
    });
    drawPreview();
    return;
  }
  const neighbors=['webpack-cli','mini-css-extract-plugin'];
  const selected={...base,...ui,webpack:build.webpack};
  function drawMR() {
    const bad=conflicts(selected);
    const feedback=el('mr-feedback');
    feedback.dataset.status=bad.length?'fail':'ready';
    el('mr-goal').textContent=bad.length
      ? t('Переход на webpack '+build.webpack+' заблокирован. Конфликтов: ','Upgrade to webpack '+build.webpack+' is blocked. Conflicts: ')+bad.length
      : t('Переход на webpack '+build.webpack+' согласован по peerDependencies.','The peer ranges allow webpack '+build.webpack+'.');
    const constraints=el('mr-requirements');
    constraints.replaceChildren();
    for(const [name,version] of Object.entries(selected)) {
      if(!versions[name])continue;
      const range=versions[name][version], row=document.createElement('li');
      const requirement=document.createElement('code');
      requirement.textContent=name+'@'+version+' → webpack '+range;
      const matches=treeSemver.satisfies(selected.webpack,range);
      row.append(requirement, matches?t(' · подходит',' · compatible'):t(' · блокирует обновление',' · blocks upgrade'));
      row.className=matches?'mr-compatible':'mr-blocker';
      constraints.append(row);
    }
    el('mr-check').textContent=bad.length
      ? t('Смените версии блокирующих пакетов. npm со строгой проверкой peer-зависимостей требует согласовать эти диапазоны до сборки.',
          'Change the packages with conflicting ranges. npm with strict peer checks requires these ranges to agree before the build.')
      : t('Для этого набора npm построил lock-файл. Затем отдельно выполнили npm ci со строгой проверкой peerDependencies и собрали страницу с css-loader 3.6.0. В файле page.css, подключённом в HTML, нашли правило .review-status { color: #1456a1; }. В своём MR проверьте так же стили страницы, которую меняете.',
          'npm resolved a lockfile for these versions. A separate run used npm ci with strict peer checks and built the page with css-loader 3.6.0. The linked page.css contained .review-status { color: #1456a1; }. Repeat that check for a page your MR changes.');
    el('mr-record').hidden=Boolean(bad.length);
  }
  for(const name of neighbors) {
    const label=document.createElement('label'), select=document.createElement('select');
    const title=document.createElement('span');title.textContent=name;label.append(title,select);
    select.id='mr-'+name;
    for(const version of Object.keys(versions[name]))select.add(new Option(version,version));
    select.value=selected[name];
    select.onchange=()=>{selected[name]=select.value;drawMR();};
    el('mr-neighbors').append(label);
  }
  drawMR();
  const stages=[
    [base,t('Общий коммит','Common starting commit'),t('Сборку запускает webpack-cli. webpack собирает приложение, а css-loader помогает подключить CSS. В этой версии проект ещё не извлекает CSS в отдельный файл.','webpack-cli starts the build, webpack bundles the app, and css-loader processes CSS imports. The project does not yet extract a separate CSS file.'),t('Открыть MR сборки →','Open the tooling branch →')],
    [build,t('MR сборки · новый css-loader','Tooling MR · upgrade css-loader'),t('Чтобы взять css-loader 6, нужен webpack 5. Прежний webpack-cli 3 запускал только webpack 4. Поэтому в этом MR обновили сразу три пакета.','css-loader 6 needs webpack 5. The old webpack-cli 3 requires webpack 4, so the developer updates three packages in this branch.'),t('Посмотреть отдельный UI MR →','Inspect the separate UI branch →')],
    [{...base,...ui},t('UI MR · вынести стили','UI MR · extract a stylesheet'),t('У второго разработчика всё ещё исходный webpack 4. Для новой страницы он добавил mini-css-extract-plugin. В его ветке диапазон плагина выполняется.','The other developer still has webpack 4 from the common commit. They add mini-css-extract-plugin for a new page. Its requirement is satisfied in this branch.'),t('Объединить обе ветки →','Merge the branches →')],
    [merged,t('После слияния','After the merge'),t('Из первой ветки приехал webpack 5, из второй — плагин для webpack 4. Разработчики меняли разные строки package.json. Git может их объединить, а менеджеру пакетов нужно ещё согласовать версии.','One branch brings webpack 5, the other brings a plugin that needs webpack 4. Git can merge separate manifest lines. The package manager must also reconcile the versions.'),t('Подобрать плагин для webpack 5 →','Try the plugin for webpack 5 →')],
    [fixed,t('Проверка общей версии','Check the combined versions'),t('У плагина 2.9.0 нижняя граница уже на пятой ветке webpack. Обе задачи теперь помещаются в один план. Собрали страницу с импортом style.css, открыли page.css, на который ссылается HTML, и проверили правило .review-status.','Plugin 2.9.0 accepts webpack 5. Both changes now fit the same plan. We built a page that imports style.css, opened the page.css referenced by the HTML and checked its .review-status rule.'),t('Пройти ещё раз','Start again')]
  ];
  const query=new URLSearchParams(location.search);
  let stage=Math.max(0,Math.min(4,Number(query.get('step') ?? (query.get('adapter')==='2'?4:0))||0));stage=Math.floor(stage);
  function draw(share){
    const [snapshot,title,story,next]=stages[stage],bad=conflicts(snapshot);
    el('branch-manifest').href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify({name:'merge-lesson',version:'1.0.0',private:true,devDependencies:snapshot},null,2)+'\n');
    el('step-name').textContent=title;el('step-count').textContent=(stage+1)+' / '+stages.length;
    el('situation').textContent=story;
    el('branch-diff').textContent=Object.entries(snapshot).map(([name,v])=>{
      const original=base[name];return (original===v?'  ':original?'~ ':'+ ')+name+'  '+(original && original!==v?original+' → ':'')+v;
    }).join('\n');
    el('step-result').textContent=bad.length ? t('Конфликт диапазонов','Conflicting ranges') : t('Требования к webpack выполнены','webpack requirements match');
    el('reason').textContent=bad.length ? bad.map(([n,v])=>n+'@'+v+' → webpack@'+versions[n][v]+' · '+t('выбран ','selected ')+snapshot.webpack).join('\n') :
      (stage===2||stage===4?'mini-css-extract-plugin@'+snapshot['mini-css-extract-plugin']+' → webpack@'+versions['mini-css-extract-plugin'][snapshot['mini-css-extract-plugin']]:'css-loader@'+snapshot['css-loader']+' → webpack@'+versions['css-loader'][snapshot['css-loader']])+' · ✓ '+snapshot.webpack;
    for(const part of el('branch-map').querySelectorAll('[data-at]')){
      const at=Number(part.dataset.at);part.classList.toggle('visited',at<=stage);part.classList.toggle('current',at===stage);
    }
    el('npm-record').hidden=stage===0;
    el('css-proof').hidden=stage!==4;
    el('webpack-planner').href=plannerUrl(stage===4?'fixed':'merged');
    el('npm-record').textContent=stage===3?mergeError:stage===4?buildRecord:
      t('Запись запуска npm · lock-файл построен · exit 0','Recorded npm run · lockfile resolved · exit 0');
    el('scene').dataset.status=bad.length?'fail':'pass';el('scene').classList.remove('step-enter');void el('scene').offsetWidth;el('scene').classList.add('step-enter');
    el('previous').disabled=!stage;el('next').textContent=next;el('takeaway').hidden=stage<3;
    if(share)Lab.setExampleState({step:stage});
  }
  for(const [name,records] of Object.entries(versions))for(const [v,range] of Object.entries(records)){
    const a=document.createElement('a');a.href='https://registry.npmjs.org/'+name+'/'+v;a.textContent=name+'@'+v+' → webpack '+range;
    const li=document.createElement('li');li.append(a);el('sources').append(li);
  }
  for(const loader of Object.keys(versions['css-loader']))for(const webpack of [base.webpack,build.webpack])for(const cli of Object.keys(versions['webpack-cli'])){
    const bad=conflicts({'css-loader':loader,webpack,'webpack-cli':cli});
    const tr=el('matrix').insertRow();
    for(const value of [loader,webpack,cli,loader!=='6.11.0'?t('Цель не достигнута','Target not reached'):bad.length?bad.map(([n,v])=>n+' → '+versions[n][v]).join(', '):'✓'])tr.insertCell().textContent=value;
  }
  el('prompt').value=t('Через get_upgrade_plan подготовь обновление [пакет] до [версия] на текущей целевой ветке. Какие пакеты придётся поменять вместе и какие peer-требования это объясняют? Перечисли проверки после слияния. Пока только план.','Use get_upgrade_plan to plan [package] at [version] on the current target branch. Which packages need to move together and which peer ranges explain why? List post-merge checks. Plan only.');
  el('copy').onclick=async()=>{try{await navigator.clipboard.writeText(el('prompt').value);el('copied').textContent=t('Скопировано','Copied');}catch{el('prompt').focus();el('prompt').select();}};
  el('next').onclick=()=>{stage=(stage+1)%stages.length;draw(true);};
  el('previous').onclick=()=>{stage=Math.max(0,stage-1);draw(true);};draw(false);
})();
