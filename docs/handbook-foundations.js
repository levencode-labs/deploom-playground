globalThis.DepLoomBookChapters.push(
  {
    id: "choosing-versions",
    title: ["Как выбирают версии", "How versions get picked"],
    lessons: [
      {
        id: "range-and-lock",
        title: ["Почему установилась старая версия?", "Why did I get the older version?"],
        lead: [
          "В реестре уже есть 1.9.0. В package.json написано ^1.2.0. Вы запускаете yarn install и снова получаете 1.2.4. Где именно проект попросил эту версию?",
          "The registry has 1.9.0. Your package.json says ^1.2.0. You run yarn install and get 1.2.4 again. Where exactly did your project ask for that version?"
        ],
        examples: [
          {
            title: ["Два файла отвечают на разные вопросы", "Two files answer different questions"],
            body: [
              "Допустим, команда использует Yarn Classic. Диапазон в манифесте разрешает и 1.2.4, и 1.9.0. В yarn.lock уже записана 1.2.4, и она подходит. При обычной установке Yarn берёт её, даже если коллега только что выпустил 1.9.0.",
              "Suppose the team uses Yarn Classic. The manifest permits both 1.2.4 and 1.9.0. The yarn.lock file already records 1.2.4, which still fits. A regular install reuses that choice even if a teammate just shipped 1.9.0."
            ],
            code: "package.json   ^1.2.0\nyarn.lock       1.2.4"
          },
          {
            title: ["Ноль в начале меняет границу", "A leading zero moves the boundary"],
            body: [
              "Для ^0.2.3 подойдёт 0.2.9. Следующая стабильная 0.3.0 уже за границей диапазона. Есть ещё тонкость с тестовыми релизами. В этот диапазон по умолчанию не входит 0.2.8-beta.1, даже если по цифрам она кажется подходящей.",
              "^0.2.3 permits 0.2.9, while the next stable release, 0.3.0, is outside the range. Preview releases have another rule. A plain range skips 0.2.8-beta.1 by default even though its numbers look like they fit."
            ],
            code: "^0.2.3  →  0.2.3 … 0.2.x"
          }
        ],
        lab: {
          prompt: ["В учебном реестре есть 1.2.0, 1.2.4, 1.9.0 и 2.0.0. Что получит Yarn Classic при ^1.2.0?", "Our sample registry has 1.2.0, 1.2.4, 1.9.0 and 2.0.0. What will Yarn Classic install for ^1.2.0?"],
          states: [
            { label: ["С прежним lock", "Existing lock"], value: ["Выбрана 1.2.4", "Selected 1.2.4"], detail: ["Запись есть, её версия разрешена. Коллега с тем же lock получит тот же выбор.", "The recorded release satisfies the range. A teammate using this lock gets the same choice."], tone: "ok" },
            { label: ["Без lock", "No lock"], value: ["Выбрана 1.9.0", "Selected 1.9.0"], detail: ["Выбор сделан заново. 1.9.0 — самая новая подходящая версия в этом наборе. Сохранённые решения для других пакетов тоже потеряны.", "Yarn resolves again. The newest eligible release in this registry is 1.9.0. Removing the lock also drops the saved choices for other packages."], tone: "warn" }
          ]
        },
        check: ["Найдите в lock запись для нужного диапазона. Если обновляете один пакет, сравните diff и посмотрите, какие его зависимости тоже сменили версию.", "Find the lock entry for your range. When updating one package, inspect the diff to see which of its dependencies changed versions too."],
        sources: [
          { label: ["Yarn Classic · yarn install", "Yarn Classic · yarn install"], url: "https://classic.yarnpkg.com/lang/en/docs/cli/install/" },
          { label: ["npm · правила диапазонов", "npm · range syntax"], url: "https://github.com/npm/node-semver#ranges" }
        ]
      },
      {
        id: "shared-host",
        title: ["Три плагина делят один движок", "Three plugins, one engine"],
        lead: [
          "Плагин может попросить, чтобы приложение предоставило ему движок определённой версии. Для этого служит peerDependencies. Если несколько плагинов работают с одним движком в приложении, его версия должна подойти каждому.",
          "A plugin can ask its host application for a compatible version of an engine. That is what peerDependencies describes. When several plugins share one engine in the app, its version has to satisfy every plugin."
        ],
        examples: [
          {
            title: ["Любая пара запускается", "Pick any two"],
            body: [
              "В этой учебной модели у движка три выпуска. A умеет работать с 1 и 2, B — с 2 и 3, C — с 1 и 3. Можно провести три успешные проверки по два плагина и всё равно застрять, когда понадобятся все три.",
              "In this teaching model the engine has three releases. A supports 1 and 2, B supports 2 and 3, and C supports 1 and 3. All three two-plugin tests can pass, yet enabling every plugin still leaves you stuck."
            ],
            code: "A   1  2  ·\nB   ·  2  3\nC   1  ·  3"
          },
          {
            title: ["Команда закрепила движок", "The team has pinned the engine"],
            body: [
              "Оставим только A и B. Общий вариант есть — 2. Но если движок закреплён на 1 и менять его в этой задаче нельзя, установка B с его текущим требованием невозможна в согласованных границах.",
              "Keep just A and B. They can share version 2. If the engine is pinned to 1 and this change may not touch it, adding this release of B is impossible within the agreed scope."
            ]
          }
        ],
        lab: {
          prompt: ["Выберите набор плагинов. Какая версия останется в каждой строке сразу?", "Select the plugins. Which version is present in every selected row?"],
          states: [
            { label: ["A + B", "A + B"], value: ["Движок 2", "Engine 2"], detail: ["У A и B совпадает только средний столбец.", "A and B share only the middle column."], tone: "ok" },
            { label: ["B + C", "B + C"], value: ["Движок 3", "Engine 3"], detail: ["Оба принимают 3. Добавление A исключит именно этот вариант.", "Both accept 3. Adding A would rule out that option."], tone: "ok" },
            { label: ["A + C", "A + C"], value: ["Движок 1", "Engine 1"], detail: ["Только 1 подходит обоим. Плагину B нужна как минимум 2.", "Only 1 fits both. Plugin B requires at least 2."], tone: "ok" },
            { label: ["A + B + C", "A + B + C"], value: ["Общей версии нет", "No shared version"], detail: ["1 исключает B, 2 исключает C, а 3 исключает A. Проверены все три выпуска из учебного каталога.", "B rules out 1, C rules out 2, and A rules out 3. That exhausts the three releases in this sample catalog."], tone: "bad" }
          ]
        },
        check: ["Уточните, кто предоставляет общий движок и какие его версии вы вправе менять. Пересеките требования всех плагинов, которые получат именно этот экземпляр.", "Identify who provides the engine and which versions you may change. Intersect the requirements of every plugin that will use that particular instance."],
        sources: [{ label: ["npm · peerDependencies", "npm · peerDependencies"], url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#peerdependencies" }]
      },
      {
        id: "upgrade-cohorts",
        title: ["Какие инструменты обновлять вместе?", "Which tools need to move together?"],
        lead: [
          "Вы хотите обновить Jest. Кто ещё должен попасть в ту же группу? Начните с инструмента, который обрабатывает ваши тесты. Его требования могут определить, какой Jest вообще удастся запустить.",
          "You want to upgrade Jest. Who else needs to come along? Start with the tool that transforms your tests. Its requirements can determine which Jest release you can run."
        ],
        examples: [
          {
            title: ["Jest и ts-jest", "Jest and ts-jest"],
            body: [
              "В обращении к Dependabot разработчик ждал перехода с Jest 24 на 25. Мейнтейнер указал на ts-jest. Используемый адаптер требовал прежнюю основную версию Jest, поэтому для перехода нужно было подобрать его совместимый выпуск.",
              "A developer asked Dependabot why it had not proposed moving Jest 24 to 25. A maintainer pointed to ts-jest. The installed transformer required the previous Jest major, so the upgrade also needed a compatible transformer release."
            ]
          },
          {
            title: ["У TypeScript свой сосед", "TypeScript has a different neighbor"],
            body: [
              "В том же проекте переход на TypeScript 3.8 упирался в @angular/compiler-cli@9.0.5 с требованием >=3.6 <3.8. Чинить связку Jest здесь бесполезно. Для этой цели придётся рассмотреть версию компилятора Angular.",
              "In the same project, moving to TypeScript 3.8 hit @angular/compiler-cli@9.0.5, which required >=3.6 <3.8. Aligning the Jest packages would leave that constraint intact. This upgrade needs a look at the Angular compiler instead."
            ],
            code: "@angular/compiler-cli@9.0.5\n  peer: typescript >=3.6 <3.8"
          }
        ],
        lab: {
          prompt: ["Выберите изменение для проекта из разбора. Посмотрите, какое требование оно затрагивает.", "Pick a change in the reported project. Which requirement does it affect?"],
          states: [
            { label: ["Только Jest 25", "Jest 25 alone"], value: ["Остался адаптер для Jest 24", "Transformer still expects Jest 24"], detail: ["Новый runner выходит за peer-диапазон установленного ts-jest. Сначала найдите выпуск адаптера с поддержкой Jest 25.", "The runner is outside the installed ts-jest peer range. Look for a transformer release that supports Jest 25."], tone: "bad" },
            { label: ["Jest + адаптер", "Jest + transformer"], value: ["Требование к Jest выполнено", "Jest peer requirement satisfied"], detail: ["В этом варианте выбран адаптер с поддержкой Jest 25. Теперь запустите TypeScript-тесты через этот адаптер.", "This choice includes a transformer that supports Jest 25. Now run the TypeScript tests through that transformer."], tone: "ok" },
            { label: ["TypeScript 3.8", "TypeScript 3.8"], value: ["3.8 выходит за <3.8", "3.8 falls outside <3.8"], detail: ["Ограничение задаёт Angular compiler-cli. Версии Jest и ts-jest на эту границу не влияют.", "Angular compiler-cli owns this constraint. The Jest and ts-jest versions do not affect its upper bound."], tone: "bad" }
          ]
        },
        check: ["Запишите цель одной строкой. Добавляйте в группу тех, чьи требования мешают именно ей. После выбора версий запустите задачу этой связки, например тест с преобразованием TypeScript.", "Write down the target. Add the packages whose constraints block that particular target. Once the versions align, run a task that uses them together, such as a test that needs TypeScript transformation."],
        sources: [{ label: ["Dependabot · разбор Jest и Angular", "Dependabot · Jest and Angular discussion"], url: "https://github.com/dependabot/dependabot-core/issues/2032" }]
      },
      {
        id: "merged-branches",
        title: ["Две зелёные ветки встретились", "When two green branches meet"],
        lead: [
          "В понедельник обе ветки прошли CI. Во вторник Git объединил их без конфликтов. Он успешно собрал строки двух изменений в одних файлах. Осталось проверить, можно ли вместе выполнить получившийся код.",
          "On Monday both branches passed CI. On Tuesday Git merged them cleanly. The lines fit together in the files. Can the resulting code run with the resulting dependencies?"
        ],
        examples: [
          {
            title: ["Новый потребитель попал под старое правило", "A new consumer inherits a root override"],
            body: [
              "Учебный пример. Ветка A принудительно выбирает parser@2 для всех транзитивных зависимостей через корневой overrides. Проект работает. Ветка B добавляет импортёр CSV, которому нужен parser@1 с методом readRow(). После объединения правило захватывает и импортёр. В parser@2 этого метода уже нет.",
              "Teaching example. Branch A uses a root override to force all transitive copies of parser to version 2. The existing app works. Branch B adds a CSV importer that calls readRow() from parser 1. After the merge the override reaches the importer too. Version 2 has removed that method."
            ],
            code: "overrides  { \"parser\": \"2.0.0\" }\ncsv-importer  →  parser.readRow()"
          },
          {
            title: ["Старый вызов появился после миграции", "An old call appears after the migration"],
            body: [
              "Другая история обходится без overrides. Разработчик обновил календарь и заменил все вызовы openDay() на showDay(). В соседней ветке коллега как раз добавил openDay() в новую кнопку. После merge старый вызов снова есть. Открытие календаря этой кнопкой воспроизводит ошибку.",
              "A separate example needs no override. One developer upgrades a calendar and migrates every openDay() call to showDay(). A teammate adds a new button that uses openDay() on another branch. The merge reintroduces the old call. Opening the calendar with that button exposes it."
            ]
          }
        ],
        lab: {
          prompt: ["Проверьте импорт одной строки CSV на трёх снимках учебного проекта.", "Try importing one CSV row in three snapshots of the sample project."],
          states: [
            { label: ["Ветка A", "Branch A"], value: ["CSV-импортёра ещё нет", "CSV importer absent"], detail: ["Прежние функции работают с parser@2. Проверить новый импортёр в этом снимке невозможно.", "The existing features work with parser 2. This snapshot contains no new importer to exercise."], tone: "neutral" },
            { label: ["Ветка B", "Branch B"], value: ["Импортирована 1 строка", "Imported 1 row"], detail: ["Импортёр получает parser@1, у которого есть readRow(). Глобальное правило из A ещё не действует.", "The importer gets parser 1, which supplies readRow(). Branch A’s override is absent."], tone: "ok" },
            { label: ["После merge", "Merged result"], value: ["readRow is not a function", "readRow is not a function"], detail: ["Впервые в одном снимке оказались новый потребитель и правило, которое подменяет его зависимость. Ошибка появляется на первом вызове.", "For the first time the importer and the rule replacing its dependency share a snapshot. The first call fails."], tone: "bad" }
          ]
        },
        check: ["На результате merge посмотрите, какую копию получит новый потребитель, и вызовите его функцию. Если старый API удалён, повторите поиск его использований в объединённых исходниках.", "Inspect the version the new consumer gets in the merge result, then exercise its feature. If an API has been removed, search the merged sources for remaining calls."],
        sources: [{ label: ["npm · как действует overrides", "npm · how overrides apply"], url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides" }]
      }
    ]
  },
  {
    id: "loading-packages",
    title: ["Какую копию загрузит приложение", "Which copy the app loads"],
    lessons: [
      {
        id: "nested-copies",
        title: ["Одно имя, два пути на диске", "One name, two paths on disk"],
        lead: [
          "Вы обновили утилиту в корне, а один плагин всё ещё печатает старую версию. В обычном дереве node_modules ответ на вопрос «где лежит пакет?» зависит от того, кто его ищет.",
          "You updated a utility at the root, yet a plugin still prints the old version. In a conventional node_modules tree, where a package lives depends on who is looking for it."
        ],
        examples: [
          {
            title: ["У каждого свой форматтер", "Each caller gets its own formatter"],
            body: [
              "В учебном дереве ниже приложение вызывает fmt@2. Плагин legacy-report требует fmt@1 и держит её рядом с собой. При require('fmt') Node начинает поиск с каталога вызывающего файла и поднимается выше. Плагин первым встречает свою копию. Если оба лишь форматируют строки, две версии могут спокойно работать рядом.",
              "In this sample tree the app calls fmt 2. The legacy-report plugin needs fmt 1 and has a copy beside its code. For require('fmt'), Node searches from the calling file’s directory upwards. The plugin reaches its own copy first. If both just format strings, the two versions can coexist."
            ],
            code: "node_modules/fmt                          2.0.0\nnode_modules/legacy-report/node_modules/fmt  1.0.0"
          },
          {
            title: ["Одно обновление оставило вторую копию", "One update leaves another copy behind"],
            body: [
              "Допустим, ошибка округления есть в fmt@1.0.0. Обновление корня до 2.0.1 изменит вывод приложения. Отчёты плагина будут по-прежнему округлять суммы старым способом. Чтобы проверить исправление, запустите расчёт именно из отчёта.",
              "Suppose fmt 1.0.0 has a rounding bug. Updating the root to 2.0.1 changes what the app uses. The plugin still rounds report totals the old way. To check a fix, calculate a total through the report itself."
            ]
          }
        ],
        lab: {
          prompt: ["Кто вызывает require('fmt') в этом дереве?", "Who calls require('fmt') in this tree?"],
          states: [
            { label: ["Приложение", "Application"], value: ["fmt@2.0.0", "fmt@2.0.0"], detail: ["Файл приложения находит node_modules/fmt. Путь внутрь legacy-report в его поиск не входит.", "The app reaches node_modules/fmt. Its search does not descend into legacy-report."], tone: "neutral" },
            { label: ["Плагин", "Plugin"], value: ["fmt@1.0.0", "fmt@1.0.0"], detail: ["Из legacy-report ближе его собственный node_modules/fmt. На этом поиск заканчивается.", "Inside legacy-report the nearest match is its own node_modules/fmt. The search stops there."], tone: "neutral" },
            { label: ["Плагин после правки корня", "Plugin after root update"], value: ["Всё ещё fmt@1.0.0", "Still fmt@1.0.0"], detail: ["Замена корневой 2.0.0 на 2.0.1 не затронула файл, который загружает плагин.", "Replacing the root’s 2.0.0 with 2.0.1 did not touch the file the plugin loads."], tone: "warn" }
          ]
        },
        check: ["Выполните require.resolve('fmt') из файла потребителя или сравните его результат в обоих местах. В lock-файле npm посмотрите записи для корневого и вложенного пути.", "Run require.resolve('fmt') from the consumer’s file or compare its output at both call sites. In an npm lockfile, inspect the entries for the root and nested paths."],
        sources: [{ label: ["Node.js · поиск в node_modules", "Node.js · lookup in node_modules"], url: "https://nodejs.org/api/modules.html#loading-from-node_modules-folders" }]
      },
      {
        id: "borrowed-dependency",
        title: ["Откуда у старых форм новый Formik?", "How did old forms get a new Formik?"],
        lead: [
          "Команда добавила соседнее приложение. Некоторые старые формы тут же перестали работать, хотя их код никто не менял. Автор разбора нашёл пропуск в package.json общей UI-библиотеки.",
          "A team added another application. Some existing forms broke immediately, though their code had not changed. The author traced the problem to an omission in the shared UI library’s package.json."
        ],
        examples: [
          {
            title: ["Formik приехал с соседями", "Formik came from neighboring apps"],
            body: [
              "UI использовала Formik, но не объявляла его. Yarn Classic поднимал общую копию в корень монорепозитория — так работает hoisting. До изменения UI находила там 1.5.8. После добавления приложения корневая копия сменилась на 2.1.2. Старые формы незаметно перешли на другой API.",
              "The UI package used Formik without declaring it. Yarn Classic had placed a shared copy at the workspace root, a layout called hoisting. The UI package used to find 1.5.8 there. Adding an app changed the root copy to 2.1.2, silently switching existing forms to another API."
            ]
          },
          {
            title: ["Своя зависимость открыла вторую ошибку", "Declaring a copy exposed another problem"],
            body: [
              "Автор добавил UI явную зависимость от Formik 1.5.8. У приложения с Formik 2 возникла ошибка типов на общей границе компонентов. Требование к версии Formik у потребителя записали в peerDependencies и согласовали версию приложения с UI.",
              "The author added Formik 1.5.8 as an explicit UI dependency. The app using Formik 2 then hit a type error where its components met the UI library. The team expressed the host requirement in peerDependencies and aligned the app’s Formik version with the UI package."
            ]
          }
        ],
        lab: {
          prompt: ["Проследите, что найдёт импорт Formik из UI без собственного объявления. Последний вариант — учебная проверка в изоляции.", "Trace the UI package’s undeclared Formik import. The last option is an isolation experiment."],
          states: [
            { label: ["До нового приложения", "Before the new app"], value: ["Корень · formik@1.5.8", "Root · formik@1.5.8"], detail: ["UI работает благодаря зависимости другого workspace. Её собственный манифест об этой связи молчит.", "UI works thanks to another workspace’s dependency. Its own manifest says nothing about that relationship."], tone: "warn" },
            { label: ["После добавления", "After adding the app"], value: ["Корень · formik@2.1.2", "Root · formik@2.1.2"], detail: ["В описанном дереве Yarn поднял Formik 2. Код UI остался прежним и теперь обращается к другой версии.", "In the reported tree Yarn hoisted Formik 2. The unchanged UI code now calls a different version."], tone: "bad" },
            { label: ["UI отдельно", "UI in isolation"], value: ["Cannot find module 'formik'", "Cannot find module 'formik'"], detail: ["В учебном потребителе больше никто не установил Formik. Случайная связь обнаруживается уже при загрузке UI.", "In this sample consumer nothing else installs Formik. Loading the UI package exposes the hidden dependency immediately."], tone: "bad" }
          ]
        },
        check: ["Сопоставьте импорты библиотеки с её package.json. Затем установите её упакованную версию в маленькое приложение и откройте форму, которая пользуется общим контекстом.", "Compare the library’s imports with its package.json. Then install the packed library in a small consumer app and open a form that relies on the shared context."],
        sources: [
          { label: ["Formik · разбор автора", "Formik · first-hand account"], url: "https://enrq.me/dev/2020/04/04/hoisting-in-monorepos/" },
          { label: ["Yarn Classic · workspaces", "Yarn Classic · workspaces"], url: "https://classic.yarnpkg.com/lang/en/docs/workspaces/" }
        ]
      },
      {
        id: "react-instance",
        title: ["Два одинаковых React и один сломанный хук", "Two identical React versions and one broken Hook"],
        lead: [
          "В приложении и в библиотеке компонентов указан React 18.2.0. Компонент вызывает useState по правилам, но при рендере получает Invalid hook call. Сравнение номеров версий пропустило важную деталь.",
          "The app and component library both report React 18.2.0. The component calls useState correctly, yet rendering gives an invalid Hook call. The version numbers leave out one important detail."
        ],
        examples: [
          {
            title: ["Библиотека подключена по ссылке", "A locally linked library"],
            body: [
              "В сценарии из документации React локальная библиотека может разрешить импорт в собственный node_modules/react. Если React DOM рендерит её компонент через копию приложения, хук и рендерер обращаются к разным объектам React. Два каталога могут содержать один и тот же релиз.",
              "In a scenario documented by React, a linked library may resolve React from its own node_modules. If React DOM renders its component using the app’s copy, the Hook and renderer see different React objects. Both directories can hold the very same release."
            ]
          },
          {
            title: ["Два независимых виджета", "Two independent widgets"],
            body: [
              "Другая ситуация — два самостоятельных виджета на странице. У каждого свой React и свой renderer. Пока каждый renderer рисует компоненты со своей копией React, само присутствие двух копий ещё не объясняет ошибку хука.",
              "Now picture two independent widgets on a page. Each has its own React and renderer. As long as each renderer renders components that use its own React, the mere presence of two copies does not explain a Hook error."
            ]
          }
        ],
        lab: {
          prompt: ["Обе копии имеют версию 18.2.0. С кем компонент делит React во время этого рендера?", "Both copies are version 18.2.0. Who shares the component’s React object during this render?"],
          states: [
            { label: ["Общая копия", "Shared copy"], value: ["React компонента === React рендерера", "Component React === renderer React"], detail: ["Оба импорта вернули один объект. Причину возможной ошибки хука придётся искать дальше.", "Both imports return one object. Any Hook error here needs another explanation."], tone: "ok" },
            { label: ["Копия в библиотеке", "Library’s own copy"], value: ["React компонента !== React рендерера", "Component React !== renderer React"], detail: ["Приложение рендерит компонент, чей хук использует другую копию. Это одна из документированных причин Invalid hook call.", "The app renders a component whose Hook uses another copy. That is one documented cause of an invalid Hook call."], tone: "bad" },
            { label: ["Два виджета", "Independent widgets"], value: ["A === A · B === B", "A === A · B === B"], detail: ["Сравнивайте React внутри каждой пары «компонент и его renderer». В обоих виджетах объекты совпадают.", "Compare each component with the renderer actually handling it. The objects match within each widget."], tone: "ok" }
          ]
        },
        check: ["Проверьте дерево через npm ls react и выясните, откуда приходят оба импорта во время выполнения. Если экземпляр общий, проверьте правила хуков и совместимость React с версией renderer.", "Inspect the tree with npm ls react and trace both imports at runtime. If they share an instance, check the Rules of Hooks and whether React and the renderer versions are compatible."],
        sources: [{ label: ["React · диагностика Invalid hook call", "React · diagnosing invalid Hook calls"], url: "https://react.dev/warnings/invalid-hook-call-warning" }]
      }
    ]
  }
);
