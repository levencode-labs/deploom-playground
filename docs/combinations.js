'use strict';
(() => {
  const versions={
    'css-loader':{'3.6.0':'^4.0.0 || ^5.0.0','6.11.0':'^5.0.0'},
    'webpack-cli':{'3.3.12':'4.x.x','4.10.0':'4.x.x || 5.x.x'},
    'mini-css-extract-plugin':{'0.9.0':'^4.4.0','2.9.0':'^5.0.0'}
  };
  const base={webpack:'4.47.0','css-loader':'3.6.0','webpack-cli':'3.3.12'};
  const build={webpack:'5.91.0','css-loader':'6.11.0','webpack-cli':'4.10.0'};
  const ui={'mini-css-extract-plugin':'0.9.0'};
  const merged={...build,...ui};
  const fixed={...build,'mini-css-extract-plugin':'2.9.0'};
  const mergeError='npm error code ERESOLVE\nnpm error Found: webpack@5.91.0\nnpm error peer webpack@"^4.4.0" from mini-css-extract-plugin@0.9.0';
  function conflicts(snapshot,semver=treeSemver){
    return Object.entries(snapshot).filter(([name,version])=>versions[name] && !semver.satisfies(snapshot.webpack,versions[name][version]));
  }
  if(typeof module==='object' && module.exports){module.exports={versions,base,build,ui,conflicts};return;}
  const {t}=Lab, el=id=>document.getElementById(id);
  // Recorded with DepLoom Core 9d1b01d, plan_workspace_upgrade, on the UI branch lock.
  // Goal: webpack 5.91.0. Candidates are the two lesson releases per mutable package.
  function showCorePlan(visible) {
    const panel = el('core-plan');
    panel.hidden = !visible;
    if (!visible || panel.childElementCount) return;
    const line = (tag, text) => {
      const node = document.createElement(tag);
      node.textContent = text;
      panel.append(node);
      return node;
    };
    line('h3', t('Как выглядел бы план до Merge?', 'What would the plan look like before merging?'));
    line('p', t('Вернёмся в UI-ветку. Стили уже вынесены. Цель — перейти на webpack 5.91.0. Версию css-loader пока оставляем прежней.',
                'Go back to the UI branch. The stylesheet is already separate. The goal is webpack 5.91.0. Keep css-loader at its current version.'));
    line('p', t('Если оставить CSS-плагин на 0.9.0, решения нет. Он требует webpack ^4.4.0. Разрешим DepLoom выбрать версию плагина.',
                'Holding the CSS plugin at 0.9.0 leaves no solution. It requires webpack ^4.4.0. Now let DepLoom choose the plugin version.'));
    line('strong', t('Один MR для трёх пакетов', 'One MR for three packages'));
    const changes = line('ul', '');
    for (const [name, before, after, why] of [
      ['webpack', base.webpack, build.webpack, t('цель обновления', 'upgrade target')],
      ['mini-css-extract-plugin', ui['mini-css-extract-plugin'], fixed['mini-css-extract-plugin'], t('новая версия принимает webpack ^5.0.0', 'the new version accepts webpack ^5.0.0')],
      ['webpack-cli', base['webpack-cli'], build['webpack-cli'], t('старый CLI допускает только webpack 4.x.x', 'the old CLI accepts only webpack 4.x.x')],
    ]) {
      const li = document.createElement('li'), code = document.createElement('code');
      code.textContent = name + ' ' + before + ' → ' + after;
      li.append(code, ' — ' + why); changes.append(li);
    }
    line('small', t('Запись двух расчётов DepLoom Core (Z3) по lock-файлу UI-ветки. В расчёте доступны версии из этого примера. css-loader 3.6.0 уже поддерживает webpack 5.',
                    'Two recorded DepLoom Core (Z3) runs on the UI branch lockfile, using the releases in this example. css-loader 3.6.0 already supports webpack 5.')).className = 'hint';
    panel.append(' ');
    const source = document.createElement('a'); source.href = 'webpack-plan.json';
    source.textContent = t('Исходный результат расчёта', 'Recorded planner output'); panel.append(source);
  }
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
      merged: t('Проверить установку по плану', 'Check the planned versions'),
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
      showCorePlan(state !== 'ready');
      if (report.hidden) return;
      const snapshot = state === 'merged' ? merged : fixed;
      const blocked = conflicts(snapshot).length > 0;
      report.dataset.status = blocked ? 'fail' : 'pass';
      el('merge-heading').textContent = blocked
        ? t('Git объединил изменения. npm остановился.', 'Git merged the changes. npm stopped.')
        : t('npm собрал lock-файл для плана DepLoom', 'npm resolved the lockfile for DepLoom’s plan');
      el('merge-evidence').textContent = blocked ? mergeError :
        plugin + '@' + fixed[plugin] + ' → webpack ' + versions[plugin][fixed[plugin]] + ' · ✓ ' + fixed.webpack + '\nnpm · exit 0';
      el('merge-lesson').textContent = blocked
        ? t('В сборке теперь webpack 5, а плагин из UI-ветки требует webpack 4. Ниже — план DepLoom на тот момент, когда обе ветки ещё можно было изменить.',
            'The merged build uses webpack 5, but the UI plugin needs webpack 4. Below is DepLoom’s plan from the point when both branches could still change.')
        : t('Плагин 2.9.0 принимает webpack 5. Следующая проверка в проекте — собрать страницу и убедиться, что стили попали в CSS-файл.',
            'Plugin 2.9.0 accepts webpack 5. Next, build the page and check that the stylesheet is emitted.');
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
  const stages=[
    [base,t('Общий коммит','Common starting commit'),t('Сборку запускает webpack-cli. webpack собирает приложение, а css-loader помогает подключить CSS. В этой версии проект ещё не извлекает CSS в отдельный файл.','webpack-cli starts the build, webpack bundles the app, and css-loader processes CSS imports. The project does not yet extract a separate CSS file.'),t('Открыть MR сборки →','Open the tooling branch →')],
    [build,t('MR сборки · новый css-loader','Tooling MR · upgrade css-loader'),t('Чтобы взять css-loader 6, нужен webpack 5. Прежний webpack-cli 3 запускал только webpack 4. Поэтому в этом MR обновили сразу три пакета.','css-loader 6 needs webpack 5. The old webpack-cli 3 requires webpack 4, so the developer updates three packages in this branch.'),t('Посмотреть отдельный UI MR →','Inspect the separate UI branch →')],
    [{...base,...ui},t('UI MR · вынести стили','UI MR · extract a stylesheet'),t('У второго разработчика всё ещё исходный webpack 4. Для новой страницы он добавил mini-css-extract-plugin. В его ветке диапазон плагина выполняется.','The other developer still has webpack 4 from the common commit. They add mini-css-extract-plugin for a new page. Its requirement is satisfied in this branch.'),t('Объединить обе ветки →','Merge the branches →')],
    [merged,t('После слияния','After the merge'),t('Из первой ветки приехал webpack 5, из второй — плагин для webpack 4. Разработчики меняли разные строки package.json. Git может их объединить, а менеджеру пакетов нужно ещё согласовать версии.','One branch brings webpack 5, the other brings a plugin that needs webpack 4. Git can merge separate manifest lines. The package manager must also reconcile the versions.'),t('Подобрать плагин для webpack 5 →','Try the plugin for webpack 5 →')],
    [fixed,t('Проверка общей версии','Check the combined versions'),t('У плагина 2.9.0 нижняя граница уже на пятой ветке webpack. Обе задачи теперь помещаются в один план. Следующая проверка — собрать страницу и убедиться, что CSS попал в результат.','Plugin 2.9.0 accepts webpack 5. Both changes now fit the same plan. Next, build the page and check that the stylesheet is emitted.'),t('Пройти ещё раз','Start again')]
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
    el('npm-record').textContent=stage===3?mergeError:
      t('Запись запуска npm · lock-файл построен · exit 0','Recorded npm run · lockfile resolved · exit 0');
    el('scene').dataset.status=bad.length?'fail':'pass';el('scene').classList.remove('step-enter');void el('scene').offsetWidth;el('scene').classList.add('step-enter');
    el('previous').disabled=!stage;el('next').textContent=next;el('takeaway').hidden=stage<3;
    showCorePlan(stage>=3);
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
