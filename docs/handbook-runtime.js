globalThis.DepLoomBookChapters.push(
  {
    id: "loading-and-behavior",
    title: ["После установки", "After installation"],
    lessons: [
      {
        id: "module-loader",
        title: ["Куда делся мой import?", "Where did my import go?"],
        lead: [
          "В исходнике написано import. В ошибке упоминается require. Оба сообщения могут быть правдой. Посмотрите, во что компилятор превратил исходник и какой загрузчик запускает полученный файл.",
          "Your source says import. The error mentions require. Both can be right. Look at the JavaScript your compiler emitted and the loader that actually runs it."
        ],
        examples: [
          {
            title: ["Chalk сменил формат", "Chalk changes module format"],
            body: [
              "В разборе Chalk 5.0.0 TypeScript собирал скрипт в CommonJS и превращал импорт в require. На установке всё выглядело хорошо. При запуске старый загрузчик не смог открыть ESM-модуль Chalk. С версией 4.1.2 тот же скрипт работал.",
              "In the Chalk 5.0.0 report, TypeScript compiled the script to CommonJS and emitted a require call. Installation worked. At startup, the older loader could not load Chalk as an ES module. The same script worked with 4.1.2."
            ],
            code: "import chalk from 'chalk';\n// tsconfig.json\n{ \"compilerOptions\": { \"module\": \"commonjs\" } }"
          },
          {
            title: ["Файл есть, путь к нему закрыт", "The file exists but the import path is closed"],
            body: [
              "В учебном пакете palette есть lib/mix.js. После обновления поле exports открывает только главный вход. Старый импорт palette/lib/mix.js теперь вызывает ERR_PACKAGE_PATH_NOT_EXPORTED. Перейдите на публичный вход и проверьте, экспортируется ли там mix под прежним именем.",
              "Our sample palette package contains lib/mix.js. An update adds an exports field that exposes only the main entry. Importing palette/lib/mix.js now gives ERR_PACKAGE_PATH_NOT_EXPORTED. Use the public entry and check whether it still exports a name called mix."
            ],
            code: "{ \"exports\": { \".\": \"./index.js\" } }"
          }
        ],
        lab: {
          prompt: ["Оставьте текст скрипта прежним. Какой файл получит Node 16?", "Keep the script source the same. What will Node 16 receive?"],
          states: [
            {label: ["Chalk 4 · CJS", "Chalk 4 · CJS"], value: ["Скрипт запустился", "Script starts"], detail: ["Сборка использует require('chalk'). Версия 4.1.2 поддерживает такой вызов.", "The output uses require('chalk'). Version 4.1.2 supports that call."], tone: "ok"},
            {label: ["Chalk 5 · CJS", "Chalk 5 · CJS"], value: ["ERR_REQUIRE_ESM", "ERR_REQUIRE_ESM"], detail: ["В сборке по-прежнему require, а Chalk 5.0.0 поставляется как ESM. Для этого опыта выбрана Node 16. У новых версий Node правила загрузки ESM различаются.", "The output still uses require, while Chalk 5.0.0 ships as ESM. This exercise uses Node 16. Newer Node versions have different rules for loading ESM."], tone: "bad"},
            {label: ["Chalk 5 · ESM", "Chalk 5 · ESM"], value: ["Скрипт запустился", "Script starts"], detail: ["Компилятор сохранил import, а файл запускается как .mjs. В этот раз Node загружает Chalk через ESM.", "The compiler preserves import and the output runs as an .mjs file. Node loads Chalk through ESM."], tone: "ok"}
          ]
        },
        check: ["Запустите собранный файл той же версией Node и тем же способом, что и в CI. Загрузку конфигурации тестов или линтера проверьте отдельно от сборки приложения.", "Run the emitted file with the same Node version and loader as CI. Test how your test runner or linter loads its configuration separately from the application build."],
        sources: [
          {label: ["Отчёт Chalk #527", "Chalk report #527"], url: "https://github.com/chalk/chalk/issues/527"},
          {label: ["Точки входа пакета в Node.js", "Node.js package entry points"], url: "https://nodejs.org/api/packages.html#package-entry-points"}
        ]
      },
      {
        id: "type-boundaries",
        title: ["Почему обновление типов ломает сборку?", "Why can a types update break the build?"],
        lead: ["Файл .d.ts описывает, как пользоваться библиотекой. Его читает TypeScript. Компилятор должен понимать и синтаксис этого описания, и типы, которыми соседние библиотеки обмениваются.", "A .d.ts file describes how to use a library. TypeScript reads it. The compiler must understand its syntax, and types crossing the boundary between libraries must agree."],
        examples: [
          {
            title: ["Старый компилятор открывает новые декларации", "An older compiler opens newer declarations"],
            body: ["После выхода @types/node@18.13.0 один проект на TypeScript 3.7.7 получил ошибки разбора в ts4.8/util.d.ts. Найти причину помог первый путь в сообщении компилятора. Он указывал на установленный пакет типов.", "After @types/node@18.13.0 shipped, a project using TypeScript 3.7.7 reported syntax errors in ts4.8/util.d.ts. The file path in the first error led straight to the installed type package."],
            code: "node_modules/@types/node/ts4.8/util.d.ts(1485,42): error TS1005"
          },
          {
            title: ["Два определения ReactNode", "Two definitions of ReactNode"],
            body: ["В отчёте DefinitelyTyped после новой установки библиотеки компонентов оказались на границе двух поколений типов React. Значение, возвращаемое компонентом, перестало подходить там, где приложение ожидало свой ReactNode. Список установленных @types/react помогает найти обе стороны.", "In a DefinitelyTyped report, a fresh install brought two generations of React types together at a component boundary. A component's return value no longer fit the ReactNode expected by the application. Listing installed copies of @types/react helps locate both sides."],
            code: "npm ls @types/react\n# Yarn Classic\nyarn why @types/react"
          }
        ],
        lab: {
          prompt: ["В учебной декларации есть именованный кортеж: type Point = [x: number, y: number]. Кто сможет его прочесть?", "A sample declaration contains a labeled tuple: type Point = [x: number, y: number]. Which compiler can read it?"],
          states: [
            {label: ["TypeScript 3.7", "TypeScript 3.7"], value: ["Ошибка синтаксиса", "Syntax error"], detail: ["Компилятор 3.7 останавливается на подписи элемента кортежа. JavaScript приложения ещё не запускался.", "The 3.7 parser stops at the tuple element label. The application JavaScript has not run."], tone: "bad"},
            {label: ["3.7 + skipLibCheck", "3.7 + skipLibCheck"], value: ["Та же ошибка разбора", "Same parse error"], detail: ["skipLibCheck пропускает проверку типов в декларациях. Чтобы её пропустить, компилятору всё равно нужно разобрать файл.", "skipLibCheck skips type checking inside declaration files. The compiler still has to parse the file."], tone: "bad"},
            {label: ["TypeScript 4.0", "TypeScript 4.0"], value: ["Point разобран", "Point parses"], detail: ["Именованные элементы кортежа появились в 4.0. Теперь компилятор может перейти к проверке кода, который использует Point.", "Labeled tuple elements arrived in 4.0. The compiler can now check the code that uses Point."], tone: "ok"}
          ]
        },
        check: ["Посмотрите версию локального tsc, полный путь первой ошибки и дерево пакетов типов. После обновления компилятора проверьте также собственные обёртки и перегрузки: в них могут проявиться отдельные ошибки.", "Check the project’s tsc version, the full path in the first error and the tree of installed types. After updating the compiler, also check local wrappers and overloads for separate errors."],
        sources: [
          {label: ["Разбор @types/node", "@types/node discussion"], url: "https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/64262"},
          {label: ["Инцидент с типами React", "React types incident"], url: "https://github.com/DefinitelyTyped/DefinitelyTyped/issues/59802"},
          {label: ["Именованные кортежи в TypeScript 4.0", "Labeled tuples in TypeScript 4.0"], url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements"}
        ]
      },
      {
        id: "user-actions",
        title: ["Иконка на месте. А подсказка?", "The icon is there. Where is the tooltip?"],
        lead: ["Представьте, что вы открыли экран с предупреждением. Иконка видна, но как узнать, о чём она предупреждает? Проверка становится точнее, когда повторяет действие человека и наблюдает его результат.", "Imagine opening a screen with a warning icon. You can see the icon, but can you find out what it means? A test gets more specific when it follows a user action through to its observable result."],
        examples: [
          {
            title: ["Ссылка на кнопку потерялась", "The tooltip loses its anchor"],
            body: ["В учебном компоненте подсказка привязывает события к DOM-элементу кнопки через ref. После замены кнопки обёртка забывает передать ref. Разметка выглядит привычно, но якорь остаётся пустым. Это видно при наведении или переходе к кнопке клавишей Tab.", "In this example, the tooltip uses a ref to attach events to a button’s DOM element. A replacement wrapper drops the ref. The markup looks familiar, but the anchor is missing. Hovering over the button or tabbing to it reveals the change."]
          },
          {
            title: ["ReactQuill падает при открытии редактора", "ReactQuill fails when the editor opens"],
            body: ["В ReactQuill #1039 проблему с react-quill@2.0.0 и React DOM 19 воспроизводят, выводя редактор на экран. При монтировании библиотека обращается к удалённому findDOMNode. Пока редактор закрыт, эта строка может вообще не выполниться.", "ReactQuill #1039 reproduces a problem with react-quill@2.0.0 and React DOM 19 by rendering the editor. The library calls the removed findDOMNode API while mounting. The code may never run while the editor is closed."],
            code: "TypeError: react_dom_1.default.findDOMNode is not a function"
          }
        ],
        lab: {
          prompt: ["В учебной обёртке потерян ref. Выберите, что сделать на экране.", "The sample wrapper has dropped its ref. Choose an action on the screen."],
          states: [
            {label: ["Найти кнопку", "Find button"], value: ["Кнопка найдена", "Button found"], detail: ["Проверка существования элемента проходит. Мы пока ничего не узнали о появлении пояснения.", "The element exists. This check has not observed any tooltip behavior."], tone: "neutral"},
            {label: ["Навести курсор", "Hover"], value: ["Подсказка не появилась", "Tooltip missing"], detail: ["Контроллер не получил ссылку на кнопку и не подключил обработчик. Проверка текста пояснения обнаружила сбой.", "The controller received no button reference, so it never attached its handler. Checking for the tooltip text caught the failure."], tone: "bad"},
            {label: ["Вернуть ref и навести", "Restore ref and hover"], value: ["«Нужно подтверждение»", "“Confirmation required”"], detail: ["Обёртка передала ref кнопке. Наведение теперь показывает текст, который нужен читателю предупреждения.", "The wrapper forwards the ref to the button. Hovering now shows the explanation the reader needed."], tone: "ok"}
          ]
        },
        check: ["Выберите одно действие на изменившемся участке. Для диалога проверьте, куда перешёл фокус, для перетаскивания — можно ли завершить его клавиатурой. Сравните результат до обновления и после него.", "Pick one action in the changed area. For a dialog, check where focus lands. For drag-and-drop, complete the operation by keyboard. Compare the outcome before and after the upgrade."],
        sources: [{label: ["Отчёт ReactQuill #1039", "ReactQuill report #1039"], url: "https://github.com/zenoamaro/react-quill/issues/1039"}]
      },
      {
        id: "browser-and-server",
        title: ["Браузер открыл страницу. Справится ли сервер?", "The browser renders it. Can the server?"],
        lead: ["Сервер может собрать HTML ещё до того, как браузер откроет страницу. Компонент в этот момент выполняется без окна, экрана и localStorage. Выбор места для одной строки кода меняет результат.", "A server can render HTML before a browser opens the page. A component executing there has no browser window, screen or localStorage. Moving one line of code can change the result."],
        examples: [
          {
            title: ["Ширина экрана на сервере", "Screen width on the server"],
            body: ["В учебном компоненте меню решает, свернуть ли панель, по window.innerWidth. В браузере ширина известна. При серверном рендеринге чтение window прямо в теле компонента прерывает подготовку HTML.", "Our sample menu reads window.innerWidth to decide whether to collapse a panel. The browser knows its width. Reading window in the body of the component interrupts server rendering."],
            code: "const compact = window.innerWidth < 700;"
          },
          {
            title: ["Тест с подставным хранилищем", "A test with a storage mock"],
            body: ["У соседнего виджета настройки лежат в localStorage. В unit-тесте перед каждым запуском создают подставное хранилище. Такой тест читает настройку успешно. Если открыть маршрут через сервер без этой подстановки, обнаружится раннее обращение к браузерному API.", "A second widget stores preferences in localStorage. Its unit test installs a fake storage object before each run, so reading preferences succeeds there. Requesting the route from the server without the mock exposes the early access to a browser API."]
          }
        ],
        lab: {
          prompt: ["Запустите учебное меню в двух окружениях, затем перенесите измерение ширины в эффект React.", "Render the sample menu in two environments, then move the width measurement into a React effect."],
          states: [
            {label: ["В браузере", "In browser"], value: ["compact = true", "compact = true"], detail: ["У окна в этом примере ширина 600 пикселей. Чтение в теле компонента возвращает значение сразу.", "The example browser is 600 pixels wide. Reading the width in the component body returns a value immediately."], tone: "ok"},
            {label: ["На сервере", "On server"], value: ["window is not defined", "window is not defined"], detail: ["Запрос страницы запускает тот же компонент на сервере. Вычисление ширины останавливает рендеринг.", "Requesting the page executes the same component on the server. The width calculation interrupts rendering."], tone: "bad"},
            {label: ["Через useEffect", "Use an effect"], value: ["HTML готов", "HTML rendered"], detail: ["Первый рендер использует одинаковое начальное состояние панели на сервере и в браузере. Эффект читает ширину после появления компонента в браузере и обновляет панель.", "The first render uses the same initial panel state on the server and in the browser. An effect then reads the width after the component appears in the browser and updates the panel."], tone: "ok"}
          ]
        },
        check: ["Запросите страницу прямо с сервера и проверьте содержимое HTML. Затем откройте её в браузере и проверьте панель после загрузки JavaScript.", "Request the page from the server and inspect its HTML. Then open it in a browser and check the panel after JavaScript loads."],
        sources: [{label: ["Когда React запускает эффекты", "When React runs effects"], url: "https://react.dev/reference/react/useEffect"}]
      }
    ]
  },
  {
    id: "release-evidence",
    title: ["Что доказала проверка?", "What did the check prove?"],
    lessons: [
      {
        id: "audit-coverage",
        title: ["Ноль находок. Сколько пакетов проверили?", "Zero findings. How much did we check?"],
        lead: ["Прочитайте число проверенных пакетов рядом с числом находок. В дереве могут остаться вложенные копии. А для части версий источник сведений может оказаться недоступен.", "Read the number of packages checked alongside the number of findings. Nested copies may still be present, and the advisory source may be unavailable for some versions."],
        examples: [
          {
            title: ["Одна утилита в двух местах", "One utility in two places"],
            body: ["В учебном дереве app использует filter@2, а вложенный в renderer пакет — filter@1. В нашем каталоге предупреждение относится только к первой major-версии. Если смотреть список прямых зависимостей, filter@2 выглядит исправленным. Вложенная копия всё ещё попадает под предупреждение.", "In the sample tree, app uses filter@2 and renderer carries filter@1. Our sample advisory affects only major version 1. The direct dependencies show an updated filter@2, while the nested copy still matches the advisory."],
            code: "app\n  filter@2\n  renderer@3\n    filter@1\n    tokens@1"
          },
          {
            title: ["Свежий снимок, неполный ответ", "Fresh snapshot, partial answer"],
            body: ["Допустим, инструмент перечислил все четыре позиции дерева, но чтение данных для двух завершилось ошибкой. Даже у свежего снимка действует граница покрытия. Для этих двух позиций уместен результат UNKNOWN. Сама по себе пустая выдача тоже требует понимания контракта источника.", "Suppose the tool lists all four installed locations, but the data lookup fails for two of them. Even a fresh snapshot has a coverage boundary. Those two results are UNKNOWN. An empty response also needs to be interpreted according to the source’s contract."]
          }
        ],
        lab: {
          prompt: ["В дереве выше четыре установленные позиции. Как изменится вывод при смене области аудита?", "The tree above has four installed locations. How does the conclusion change with the audit scope?"],
          states: [
            {label: ["Только прямые", "Direct only"], value: ["0 находок · 2 из 4", "0 findings · 2 of 4"], detail: ["Проверены filter@2 и renderer@3. Обе вложенные зависимости остались вне выбранной области.", "The check covered filter@2 and renderer@3. Both nested dependencies were outside the selected scope."], tone: "warn"},
            {label: ["Полное дерево", "Full tree"], value: ["1 находка · 4 из 4", "1 finding · 4 of 4"], detail: ["Проверены также renderer → filter@1 и tokens@1. Каталог нашёл предупреждение для вложенного filter@1.", "The check also covered renderer → filter@1 and tokens@1. The catalog now flags the nested filter@1."], tone: "bad"},
            {label: ["Сбой источника", "Lookup fails"], value: ["0 находок · 2 UNKNOWN", "0 findings · 2 UNKNOWN"], detail: ["Область всё ещё включает четыре позиции. Ответы есть лишь для двух прямых зависимостей, и обе вложенные остались без оценки.", "All four locations are still in scope. Only the two direct dependencies received a usable answer, leaving both nested dependencies unassessed."], tone: "warn"}
          ]
        },
        check: ["Запишите область, число найденных позиций, число оценённых версий, известные находки и причины UNKNOWN. Сравнивая два отчёта, сначала убедитесь, что знаменатели и единицы подсчёта совпадают.", "Record scope, installed locations, versions assessed, known findings and reasons for UNKNOWN. When comparing reports, first check that their denominators and units match."]
      },
      {
        id: "audit-and-api",
        title: ["Исправили версию. Кто проверит SVG?", "The version is fixed. Does SVG still work?"],
        lead: ["Подмена версии в глубине дерева влияет на код, который её вызывает. У обновления появляются две проверяемые цели: закрыть конкретную находку и сохранить поведение потребителя.", "Overriding a version deep in a dependency tree changes what its caller receives. You now have two checks to make: resolve the advisory and preserve the caller’s behavior."],
        examples: [
          {
            title: ["От предупреждения до CSS-селектора", "From an advisory to a CSS selector"],
            body: ["В Create React App #13062 показан путь от react-scripts@5.0.1 через обработку SVG до css-select@2.1.0 и nth-check@1.0.2. В обсуждении предлагают закрепить 2.1.1. В отдельном минимальном примере старый css-select после такой подмены получает объект экспорта и пытается вызвать его как функцию.", "Create React App #13062 traces a finding from react-scripts@5.0.1 through SVG processing to css-select@2.1.0 and nth-check@1.0.2. A reply suggests pinning 2.1.1. In a separate minimal example, after that override the older css-select receives an exports object and tries to call it as a function."],
            code: "css-select@2.1.0 → nth-check@2.1.1\ngetNCheck is not a function"
          },
          {
            title: ["Девять пакетов обновились, десятый зафиксирован", "Nine packages update, the tenth is held"],
            body: ["В учебном плане команда хотела обновить девять пакетов из десяти и закрыть все критические находки. Девять обновлений прошли. Единственная Critical относится к десятому пакету, менять который запрещено. Цель по количеству выполнена, но для выпуска с нулём Critical придётся пересмотреть ограничение или найти другое подтверждённое исправление.", "A sample plan aims to update nine of ten packages and resolve all critical findings. Nine updates succeed. The single critical finding affects the tenth package, which is held. The update count meets its goal. Shipping with zero critical findings requires revisiting the hold or verifying another fix."]
          }
        ],
        lab: {
          prompt: ["В минимальном примере нужен селектор :nth-child(2). Что происходит с предупреждением и с вызовом?", "Our minimal example needs the selector :nth-child(2). What happens to the advisory and the call?"],
          states: [
            {label: ["Исходная пара", "Original pair"], value: ["Селектор работает · есть находка", "Selector works · finding open"], detail: ["css-select@2.1.0 получает знакомый интерфейс nth-check@1.0.2. Эта версия nth-check входит в затронутый диапазон предупреждения.", "css-select@2.1.0 gets the interface it expects from nth-check@1.0.2. This nth-check version is in the advisory’s affected range."], tone: "warn"},
            {label: ["Подменить nth-check", "Override nth-check"], value: ["getNCheck is not a function", "getNCheck is not a function"], detail: ["2.1.1 выходит из затронутого диапазона. Но во время обработки :nth-child старый потребитель вызывает полученное значение как функцию и падает.", "2.1.1 is outside the affected range. When processing :nth-child, the older consumer calls the returned value as a function and fails."], tone: "bad"},
            {label: ["Согласовать пару", "Align both packages"], value: ["Выбран второй элемент", "Second element selected"], detail: ["В учебной паре обновлённый потребитель использует экспорт, предусмотренный nth-check 2.1.1. Селектор проходит, версия исправлена. Полный проект ещё требует сборки с его настоящими SVG.", "In the sample pair, the updated consumer uses the export provided by nth-check 2.1.1. The selector passes and the version is fixed. The full project still needs a build with its actual SVG assets."], tone: "ok"}
          ]
        },
        check: ["Проверьте путь до исправленной копии и диапазон предупреждения. Прогоните обработку SVG с :nth-child через ту же цепочку, что и в проекте.", "Check the path to the fixed copy and the advisory range. Process an SVG with :nth-child through the same pipeline the project uses."],
        sources: [
          {label: ["Цепочка Create React App #13062", "Dependency chain in Create React App #13062"], url: "https://github.com/react/create-react-app/issues/13062"},
          {label: ["Затронутые версии nth-check", "Affected nth-check versions"], url: "https://github.com/advisories/GHSA-rp65-9cf3-cjxr"}
        ]
      },
      {
        id: "tested-snapshot",
        title: ["Какой именно коммит был зелёным?", "Which commit actually passed?"],
        lead: ["Проверке можно задать два вопроса. На каких файлах она запускалась? Что именно успела проверить? Оба ответа меняются, даже когда название задания в CI осталось прежним.", "Ask two questions about a check. Which files did it run against? What did it actually exercise? Both answers can change while the CI job keeps the same name."],
        examples: [
          {
            title: ["Основная ветка ушла вперёд", "The base branch moves"],
            body: ["В Expedia Group описали практику повторной проверки PR при изменениях существенных файлов в основной ветке, в том числе package-lock.json. Аналогичная ситуация возникает, когда две группы обновлений прошли тесты по отдельности: их общий lock и код приложения впервые встречаются после объединения.", "Expedia Group documented checking PR freshness when relevant files, including package-lock.json, change on the base branch. Two groups of updates tested in isolation pose a similar problem. Their combined lock and application code first meet after the merge."]
          },
          {
            title: ["Код выхода 0, запусков 0", "Exit code 0, tests run 0"],
            body: ["В учебном проекте Vitest запускают с passWithNoTests. После переноса каталога фильтр не находит ни одного теста. Процесс успешно завершается. Число выполненных тестов сразу показывает, что проверку открытия редактора тут ещё никто не запускал.", "Our sample project runs Vitest with passWithNoTests. After a directory move, the filter matches zero tests. The process exits successfully. The executed test count tells you that the editor-opening check never ran."]
          }
        ],
        lab: {
          prompt: ["В учебном отчёте тест редактора прошёл на коде A и lock L1. Можно ли использовать результат для выбранного снимка?", "The editor test passed on code A and lock L1. Does the result apply to the selected snapshot?"],
          states: [
            {label: ["A + L1", "A + L1"], value: ["1 из 1 теста пройден", "1 of 1 test passed"], detail: ["Код, lock, настройки и окружение совпадают с записанными. Результат относится к этому снимку и этому действию.", "The code, lock, settings and environment match the recorded inputs. The result applies to this snapshot and this action."], tone: "ok"},
            {label: ["A + L2", "A + L2"], value: ["Нужен новый запуск", "New run needed"], detail: ["После проверки изменили lock. В архиве по-прежнему лежит успешный результат для L1. Перенос файлов из временной рабочей копии требует такой же сверки.", "The lock changed after testing. The saved pass still refers to L1. The same comparison matters when copying changes back from a temporary worktree."], tone: "warn"},
            {label: ["A + L2 · новый запуск", "A + L2 · rerun"], value: ["0 тестов выполнено", "0 tests executed"], detail: ["Снимок теперь нужный, но фильтр пропустил тест редактора. Исправьте отбор и дождитесь результата самого сценария.", "The snapshot now matches, but the filter skipped the editor test. Correct the selection and wait for the scenario itself to run."], tone: "bad"}
          ]
        },
        check: ["Сопоставьте проверенный и итоговый код, lock, настройки и правила допуска. Проверьте отчёт нужного теста. Если входы поменялись после контрольной точки, повторите затронутую проверку.", "Compare the tested and final code, lock, configuration and acceptance policy. Inspect the intended test result. If inputs changed after the checkpoint, repeat the affected check."],
        sources: [
          {label: ["Практика Expedia Group", "Expedia Group’s documented practice"], url: "https://github.com/ExpediaGroup/github-helpers/blob/main/README.md"},
          {label: ["Параметр Vitest passWithNoTests", "Vitest passWithNoTests option"], url: "https://vitest.dev/config/passwithnotests"}
        ]
      },
      {
        id: "search-bounds",
        title: ["Что значит «решение не найдено»?", "What does “no solution found” mean?"],
        lead: ["Планировщик сравнивает конкретные версии с конкретными требованиями. Прежде чем менять цель обновления, посмотрите, какие кандидаты вообще попали в поиск и обо всех ли у него были сведения.", "A planner compares specific versions with specific requirements. Before changing your upgrade goal, check which candidates it searched and whether it had evidence for all of them."],
        examples: [
          {
            title: ["Совместимый релиз остался за пределом поиска", "A compatible release sits outside the search"],
            body: ["В учебном каталоге три релиза плагина. Проект сохраняет движок 2. Плагинам 1.0 и 1.2 нужен движок 1, а 1.1 поддерживает движок 2. Если в бюджет попали только первая и последняя версии, обе попытки закономерно проиграют.", "Our sample catalog has three plugin releases and the project holds engine 2. Plugin versions 1.0 and 1.2 require engine 1, while 1.1 supports engine 2. A budget that only covers the first and last versions misses the working candidate."],
            code: "plugin 1.0 → engine 1\nplugin 1.1 → engine 2\nplugin 1.2 → engine 1"
          },
          {
            title: ["Модель подобрала пару", "The model finds a pair"],
            body: ["В другом проекте требования плагина и движка согласованы. Дальше пакет нужно получить из реестра, установить и запустить. Пара может пройти этап выбора и всё ещё упасть при загрузке конфигурации или обращении к API.", "In another project, a plugin and its engine agree on versions. The package still needs to be fetched, installed and exercised. A pair can pass selection and still fail while loading configuration or calling an API."]
          }
        ],
        lab: {
          prompt: ["Оставьте движок 2. Какие сведения о трёх релизах дать планировщику?", "Keep engine 2. Which information about the three releases should the planner receive?"],
          states: [
            {label: ["Только 1.0 и 1.2", "Only 1.0 and 1.2"], value: ["0 из 2 кандидатов подходят", "0 of 2 candidates fit"], detail: ["Обе пары нарушают требование движка. Поиск ничего не говорит о пропущенной версии 1.1.", "Both pairs violate the engine requirement. This search says nothing about version 1.1, which it skipped."], tone: "warn"},
            {label: ["Данные 1.1 недоступны", "1.1 metadata missing"], value: ["UNKNOWN", "UNKNOWN"], detail: ["Релиз виден, но его требование к движку неизвестно. Сведения о двух соседних релизах не заполняют этот пробел.", "The release is visible, but its engine requirement is unknown. Metadata for the two adjacent releases cannot fill the gap."], tone: "warn"},
            {label: ["Все три релиза", "All three releases"], value: ["plugin 1.1 + engine 2", "plugin 1.1 + engine 2"], detail: ["Пара удовлетворяет указанным ограничениям. Проверка установки и запуска этой пары остаётся отдельным шагом.", "The pair satisfies the stated constraints. Installing and running it is a separate check."], tone: "ok"}
          ]
        },
        check: ["Запишите цель, удерживаемые пакеты, список кандидатов и причину остановки. Для найденной пары выполните установку и тот сценарий приложения, ради которого понадобилось обновление.", "Record the target, held packages, candidates and reason the search stopped. For a selected pair, run the installation and the application scenario that motivated the upgrade."]
      },
      {
        id: "repeat-codemod",
        title: ["Что сделает второй запуск codemod?", "What will a second codemod run do?"],
        lead: ["Codemod — программа, которая переписывает исходники. На втором запуске она читает уже изменённые строки. Иногда новое имя тоже подходит под одно из её правил.", "A codemod rewrites source code. On the second run it reads the already changed lines. Sometimes the new name matches another one of its rules."],
        examples: [
          {
            title: ["Три пути к адаптеру даты", "Three paths to the date adapter"],
            body: ["В руководстве MUI X по переходу Date Pickers с v7 на v8 есть конкретное предупреждение. Преобразование путей адаптера превращает AdapterDateFnsV3 в AdapterDateFns. При повторном запуске уже этот путь меняется на AdapterDateFnsV2. Для проекта на date-fns v3 это другой адаптер.", "The MUI X guide for Date Pickers v7 to v8 gives a concrete warning. The import-path transform changes AdapterDateFnsV3 to AdapterDateFns. Running it again changes that path to AdapterDateFnsV2. For a project on date-fns v3, that selects a different adapter."]
          },
          {
            title: ["Один вызов спрятан за обёрткой", "A call sits behind a wrapper"],
            body: ["Представьте правило, которое заменяет picker.open() на picker.show(). Прямые вызовы исправились, а в обёртке остался псевдоним const launch = picker.open. После ошибки typecheck повтор того же правила этот участок снова пропустит. Откройте обёртку по месту ошибки и исправьте оставшееся обращение.", "Imagine a rule that replaces picker.open() with picker.show(). Direct calls change, but a wrapper keeps an alias, const launch = picker.open. After type checking fails, rerunning the same rule will skip that line again. Follow the error to the wrapper and fix the remaining reference."]
          }
        ],
        lab: {
          prompt: ["В проекте date-fns v3. Выберите момент миграции и проследите за концом пути импорта.", "The project uses date-fns v3. Choose a point in the migration and follow the end of the import path."],
          states: [
            {label: ["До миграции", "Before migration"], value: ["…/AdapterDateFnsV3", "…/AdapterDateFnsV3"], detail: ["Это исходный путь для v7 Date Pickers. Сохранённый снимок позволит повторить преобразование с того же места.", "This is the starting path in v7 of Date Pickers. A saved snapshot lets you repeat the transform from the same starting point."], tone: "neutral"},
            {label: ["Один запуск", "One run"], value: ["…/AdapterDateFns", "…/AdapterDateFns"], detail: ["Путь теперь соответствует адаптеру для date-fns v3 в Date Pickers v8. Можно проверить выбор и ввод даты.", "The path now selects the adapter for date-fns v3 in Date Pickers v8. You can test picking and typing a date."], tone: "ok"},
            {label: ["Два запуска", "Two runs"], value: ["…/AdapterDateFnsV2", "…/AdapterDateFnsV2"], detail: ["Второй запуск переписал результат первого и выбрал адаптер для date-fns v2. Сравните diff с состоянием после первого запуска.", "The second run rewrote the result of the first and selected the adapter for date-fns v2. Compare the diff with the state after one run."], tone: "bad"}
          ]
        },
        check: ["Зафиксируйте исходное состояние и отметьте, какой шаг уже применён. Для повтора начните с сохранённой чистой копии либо продолжайте с точно известного шага. Сверьте путь импорта и проверьте выбор даты.", "Save the starting state and record which step ran. To retry, start from that clean snapshot or resume at a known step. Check the import path and exercise the date picker."],
        sources: [{label: ["Миграция Date Pickers v7 → v8", "Date Pickers v7 → v8 migration"], url: "https://mui.com/x/migration/migration-pickers-v7/"}]
      }
    ]
  }
);
