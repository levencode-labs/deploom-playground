(globalThis.DepLoomBookChapters ||= []).push(
  {
    id: "choosing-versions",
    title: ["Как выбирают версии", "How versions get picked"],
    lessons: [
      {
        id: "range-and-lock",
        title: ["Почему снова поставилась старая версия?", "Why did I get the old version again?"],
        lead: [
          "У библиотеки вышла версия 1.9.0. Вы запускаете yarn install и снова получаете 1.2.4. Yarn Classic взял этот номер из файла проекта. Заглянем в него.",
          "A library just released version 1.9.0. You run yarn install and get 1.2.4 again. Yarn Classic got that number from a file in your project. Let's look inside."
        ],
        examples: [
          {
            title: ["Где записана 1.2.4", "Where 1.2.4 comes from"],
            body: [
              "Допустим, библиотека price-label выводит цены. В package.json команда разрешила любую версию от 1.2.0 до 2.0.0, не включая 2.0.0. При прошлой установке Yarn выбрал 1.2.4 и записал её в yarn.lock. Она по-прежнему подходит, поэтому Yarn берёт её снова.",
              "Say you use a library called price-label to display prices. The package.json allows any release from 1.2.0 up to, but excluding, 2.0.0. On the last install, Yarn picked 1.2.4 and saved it in yarn.lock. That version still fits, so Yarn uses it again."
            ],
            code: "// package.json\n\"dependencies\": { \"price-label\": \"^1.2.0\" }\n\n# yarn.lock\nprice-label@^1.2.0:\n  version \"1.2.4\""
          },
          {
            title: ["А если версия начинается с нуля?", "What if the version starts with zero?"],
            body: [
              "У ^0.2.3 граница ближе. Можно поставить 0.2.9, а для перехода на 0.3.0 придётся поменять запись в package.json. У предварительных выпусков тоже есть своё правило. Версия с пометкой beta по умолчанию в такой диапазон не входит.",
              "With ^0.2.3 the boundary is closer. You can install 0.2.9, but moving to 0.3.0 means editing package.json. Preview releases have their own rule too. A plain range like this skips versions marked beta by default."
            ],
            code: ["^0.2.3\n  0.2.9          подходит\n  0.3.0          за границей\n  0.2.8-beta.1   пробный выпуск", "^0.2.3\n  0.2.9          in range\n  0.3.0          outside the range\n  0.2.8-beta.1   preview release"]
          }
        ],
        lab: {
          prompt: ["Какую версию выберет Yarn?", "Which version will Yarn pick?"],
          states: [
            { label: ["Есть yarn.lock", "With yarn.lock"], value: ["1.2.4", "1.2.4"], detail: ["Yarn нашёл сохранённую версию. Она подходит под ^1.2.0.", "Yarn found a saved version that still fits ^1.2.0."], tone: "ok" },
            { label: ["Нет yarn.lock", "Without yarn.lock"], value: ["1.9.0", "1.9.0"], detail: ["Yarn выбирает заново. Из доступных в этом примере версий 1.9.0 — самая свежая в диапазоне.", "Yarn makes a fresh choice. In this example 1.9.0 is the newest release in range."], tone: "warn" }
          ]
        },
        solutions: [
          {
            title: ["Нужна свежая версия из разрешённых", "Pick up a newer allowed release"],
            body: ["В Yarn Classic обновите один нужный пакет. Для price-label из нашего примера команда ниже выберет 1.9.0 и запишет её в yarn.lock. Так вы сохраните прежние решения для несвязанных пакетов.",
              "With Yarn Classic, ask to upgrade this package. For our sample price-label registry, the command below picks 1.9.0 and records it in yarn.lock. The locked choices for unrelated packages stay in place."],
            code: "yarn upgrade price-label\ngit diff -- yarn.lock"
          },
          {
            title: ["Нужна именно 2.0.0", "Move to exactly 2.0.0"],
            body: ["2.0.0 уже за границей ^1.2.0. Укажите новую версию прямо в команде и сохраните вместе package.json и yarn.lock. Затем откройте экран с ценами.",
              "2.0.0 falls outside ^1.2.0. Name the version you want and commit both package.json and yarn.lock. Then open the screen that displays prices."],
            code: "yarn add --exact price-label@2.0.0"
          }
        ],
        check: ["Найдите имя библиотеки в package.json, затем тот же пакет в yarn.lock. Первая строка подскажет, что разрешено, вторая — что установится.", "Look up the library in package.json, then in yarn.lock. One entry shows what the project allows, the other what it will install."],
        sources: [
          { label: ["Yarn Classic · yarn install", "Yarn Classic · yarn install"], url: "https://classic.yarnpkg.com/lang/en/docs/cli/install/" },
          { label: ["npm · правила диапазонов", "npm · range syntax"], url: "https://github.com/npm/node-semver#ranges" }
        ]
      },
      {
        id: "shared-host",
        title: ["Почему работают любые два плагина, а три — нет?", "Why can we run any two plugins, but not all three?"],
        lead: [
          "Представьте редактор заметок с тремя плагинами. Все они встраиваются в одну копию редактора. Каждый плагин пишет в своём package.json, какие версии редактора он понимает. Для этого есть поле peerDependencies.",
          "Imagine a note editor with three plugins. All three plug into the same running editor. Each plugin lists the editor versions it supports in a package.json field called peerDependencies."
        ],
        examples: [
          {
            title: ["Найдите версию для трёх", "Find a version for all three"],
            body: [
              "В учебном редакторе есть три выпуска. Возьмём плагины A и B. Они оба поддерживают версию 2. Добавим C — ему нужна 1 или 3. Если перейти на 1, перестанет подходить B. Если перейти на 3 — A.",
              "Our sample editor has three releases. Start with plugins A and B. Both accept version 2. Add C and it asks for 1 or 3. Switching to 1 leaves B behind. Switching to 3 leaves A behind."
            ],
            code: ["A/package.json   editor: \"1 || 2\"\nB/package.json   editor: \"2 || 3\"\nC/package.json   editor: \"1 || 3\"\n\n|| означает «или»", "A/package.json   editor: \"1 || 2\"\nB/package.json   editor: \"2 || 3\"\nC/package.json   editor: \"1 || 3\"\n\n|| means “or”"]
          },
          {
            title: ["Когда и двух слишком много", "When even two is too many"],
            body: [
              "Оставим A и B. Команда попросила добавить плагины, но пока оставить редактор на 1.0.0. A можно добавить. Для B пришлось бы сначала разрешить переход редактора на 2.",
              "Keep A and B. The team wants to add plugins while keeping the editor at 1.0.0 for now. You can add A. Adding B would also need approval to move the editor to 2."
            ],
            code: "// app/package.json\n\"dependencies\": { \"editor\": \"1.0.0\" }\n\n// B/package.json\n\"peerDependencies\": { \"editor\": \"2 || 3\" }"
          }
        ],
        lab: {
          prompt: ["Какие плагины включим?", "Which plugins should we enable?"],
          states: [
            { label: ["A + B", "A + B"], value: ["Редактор 2", "Editor 2"], detail: ["2 — единственная версия, которая есть у обоих в списке.", "Only version 2 appears on both lists."], tone: "ok" },
            { label: ["B + C", "B + C"], value: ["Редактор 3", "Editor 3"], detail: ["B и C оба работают с версией 3.", "Both B and C work with version 3."], tone: "ok" },
            { label: ["A + C", "A + C"], value: ["Редактор 1", "Editor 1"], detail: ["A и C оба работают с версией 1.", "Both A and C work with version 1."], tone: "ok" },
            { label: ["A + B + C", "A + B + C"], value: ["Общей версии нет", "No shared version"], detail: ["У версии 1 отпадает B, у 2 — C, у 3 — A.", "Version 1 loses B, version 2 loses C, and version 3 loses A."], tone: "bad" }
          ]
        },
        solutions: [
          {
            title: ["Оставим редактор 2 и обновим только C", "Keep editor 2 and upgrade just C"],
            body: ["A и B уже поддерживают редактор 2. В учебном каталоге вышел C@2, автор которого добавил поддержку редакторов 2 и 3. Поставьте этот выпуск C. Если нужно сохранить редактор 1, в этом же примере обновите B до B@2. Для редактора 3 обновите A до A@2.",
              "A and B already accept editor 2. Our sample catalog includes C@2, whose author added support for editors 2 and 3. Install that release of C. To keep editor 1, the corresponding change in this example is B@2. For editor 3, pick A@2."],
            code: "// C@2/package.json\n\"version\": \"2.0.0\",\n\"peerDependencies\": { \"editor\": \"2 || 3\" }"
          },
          {
            title: ["Если подходящего выпуска ещё нет", "If no compatible release exists"],
            body: ["Посмотрите, можно ли отключить блокирующий плагин или заменить его аналогом. Например, без C редактор 2 запустит A и B. Флаг --force может пропустить проверку npm, но не научит C работать с новым редактором. Подмена версии через overrides тоже не добавит нужных функций.",
              "See whether you can leave out the blocking plugin or use another one. With C disabled, for example, editor 2 can run A and B. An npm --force flag can skip a check, but cannot teach C how to use a new editor. Forcing a version with overrides does not add missing functions either."]
          }
        ],
        check: ["У настоящего плагина посмотрите, что автор указал в опубликованной версии. Например, npm view ts-jest@25.0.0 peerDependencies покажет требования того выпуска ts-jest. Подставьте имя и версию своего плагина. Установите выбранные версии, соберите редактор и попробуйте действие каждого включённого плагина.",
          "Read the requirements in an actual published release. For example, npm view ts-jest@25.0.0 peerDependencies shows what that ts-jest release asked for. Substitute your own plugin and candidate version. Install your choices, build the editor and try an action from each enabled plugin."],
        sources: [{ label: ["npm · peerDependencies", "npm · peerDependencies"], url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#peerdependencies" }]
      },
      {
        id: "upgrade-cohorts",
        title: ["Почему вместе с Jest понадобилось обновить ts-jest?", "Why did the Jest upgrade also need ts-jest?"],
        lead: [
          "Jest запускает тесты. Если тест написан на TypeScript, в этом проекте его сначала переводит в JavaScript другой пакет — ts-jest. У них общая работа, и версия одного важна для другого.",
          "Jest runs the tests. In this project another package, ts-jest, turns TypeScript tests into JavaScript first. The two tools work together, so their versions need to fit."
        ],
        examples: [
          {
            title: ["Кто готовит файл для Jest", "Who prepares the test file for Jest"],
            body: [
              "В обсуждении Dependabot разработчик хотел перейти с Jest 24 на 25. Его версия ts-jest поддерживала Jest 24. Чтобы перейти, требовался и новый ts-jest. Вот как в настройках тестов обычно видна эта связь.",
              "In a Dependabot discussion, a developer wanted to move from Jest 24 to 25. Their ts-jest release expected Jest 24. The move needed a compatible ts-jest release too. Here is what that link can look like in a test configuration."
            ],
            code: "// jest.config.js\nmodule.exports = {\n  transform: { '^.+[.]tsx?$': 'ts-jest' }\n}"
          },
          {
            title: ["А кто мешал обновить TypeScript?", "What held back TypeScript?"],
            body: [
              "У того же разработчика не обновлялся и TypeScript. На этот раз причину нашли в компиляторе Angular. Он принимал TypeScript начиная с 3.6 и строго ниже 3.8. Обновить Jest можно, но от этого TypeScript 3.8 в список не попадёт.",
              "The same developer also had trouble upgrading TypeScript. This time the Angular compiler was the reason. It accepted TypeScript from 3.6 up to, but excluding, 3.8. Updating Jest would leave that limit exactly where it was."
            ],
            code: "// @angular/compiler-cli@9.0.5/package.json\n\"peerDependencies\": { \"typescript\": \">=3.6 <3.8\" }"
          }
        ],
        lab: {
          prompt: ["Что произойдёт, если поменять эти пакеты?", "What happens when you change these packages?"],
          states: [
            { label: ["Только Jest", "Jest alone"], value: ["ts-jest всё ещё ждёт Jest 24", "ts-jest still expects Jest 24"], detail: ["Мы выбрали Jest 25. Нужен выпуск ts-jest, который умеет с ним работать.", "We picked Jest 25. We need a ts-jest release that supports it."], tone: "bad" },
            { label: ["Jest и ts-jest", "Jest and ts-jest"], value: ["Оба поддерживают Jest 25", "Both support Jest 25"], detail: ["Теперь запустите тест из файла .ts, чтобы проверить, как они работают вместе.", "Now run a test from a .ts file to exercise the two together."], tone: "ok" },
            { label: ["TypeScript 3.8", "TypeScript 3.8"], value: ["Angular требует версию ниже 3.8", "Angular requires a version below 3.8"], detail: ["Это ограничение указано в @angular/compiler-cli. Для перехода нужно разобраться с этим пакетом.", "This limit comes from @angular/compiler-cli. That is the package to look at for this upgrade."], tone: "bad" }
          ]
        },
        solutions: [
          {
            title: ["Обновить пару, которая запускает тесты", "Upgrade the two tools that run the tests"],
            body: ["Для перехода на Jest 25 проверьте, какой выпуск ts-jest указывает Jest 25 в peerDependencies. Поменяйте Jest и ts-jest в одном изменении. Если задача именно про TypeScript 3.8, так же ищите подходящий выпуск @angular/compiler-cli.",
              "To move to Jest 25, find a ts-jest release that lists Jest 25 in peerDependencies. Change Jest and ts-jest together. If the goal is TypeScript 3.8, do the same lookup for @angular/compiler-cli."],
            code: "npm view ts-jest@25.0.0 peerDependencies"
          }
        ],
        check: ["Запустите хотя бы один настоящий тест из файла .ts через Jest. Если обновляли TypeScript для Angular, пересоберите приложение тем же компилятором, которым собираете его для выпуска.", "Run at least one real .ts test through Jest. For the Angular and TypeScript change, build the app with the same compiler you use for release."],
        sources: [{ label: ["Dependabot · разбор Jest и Angular", "Dependabot · Jest and Angular discussion"], url: "https://github.com/dependabot/dependabot-core/issues/2032" }]
      },
      {
        id: "merged-branches",
        title: ["В обеих ветках тесты прошли. А вместе?", "Both branches passed their tests. What about the merge?"],
        lead: [
          "Аня обновляет библиотеку. Борис добавляет кнопку. Git объединил их работу без конфликтов. Но что, если кнопке нужна функция, которую как раз убрали? Посмотрим на два учебных примера.",
          "Anna upgrades a library. Ben adds a button. Git merges their work without a conflict. What if the button calls the very function the upgrade removed? Consider these two examples."
        ],
        examples: [
          {
            title: ["Импорт файла CSV", "Importing a CSV file"],
            body: [
              "Аня задаёт правило для npm: во всём проекте ставить parser версии 2. В её ветке всё работает. Борис добавляет загрузку CSV. Его код использует parser старой версии, где есть readRow(). После объединения код Бориса получает версию 2. Попытка прочитать первую строку файла падает.",
              "Anna tells npm to use parser version 2 everywhere in the project. Her branch works. Ben adds a CSV upload that calls readRow() from parser version 1. After the merge, his code gets version 2. Reading the very first row fails."
            ],
            code: ["// package.json в ветке Ани\n\"overrides\": { \"parser\": \"2.0.0\" }\n\n// csv-importer/index.js в ветке Бориса\nconst parser = require('parser')\nparser.readRow('tea,2')", "// package.json on Anna's branch\n\"overrides\": { \"parser\": \"2.0.0\" }\n\n// csv-importer/index.js on Ben's branch\nconst parser = require('parser')\nparser.readRow('tea,2')"]
          },
          {
            title: ["Новая кнопка календаря", "A new calendar button"],
            body: [
              "В другой задаче у календаря переименовали функцию. Аня поправила все кнопки, которые нашла в своей ветке. Борис одновременно написал ещё одну кнопку со старым именем. По отдельности обе кнопки работали. После объединения достаточно нажать новую.",
              "In another change, a calendar library renames a function. Anna updates every button she can find on her branch. Meanwhile Ben adds another button using the old name. Each works on its own branch. After the merge, click the new one to see what happens."
            ],
            code: ["// Calendar.tsx — Аня обновила вызов\nonClick={() => calendar.showDay(today)}\n\n// TodayButton.tsx — Борис добавил кнопку\nonClick={() => calendar.openDay(today)}", "// Calendar.tsx — Anna updated this call\nonClick={() => calendar.showDay(today)}\n\n// TodayButton.tsx — Ben added this button\nonClick={() => calendar.openDay(today)}"]
          }
        ],
        lab: {
          prompt: ["В какой ветке попробуем прочитать CSV?", "Where should we try the CSV upload?"],
          states: [
            { label: ["У Ани", "Anna’s branch"], value: ["Кнопки загрузки ещё нет", "No upload button yet"], detail: ["Здесь стоит parser 2, но код загрузки Бориса пока недоступен.", "This branch has parser 2. Ben’s upload code has not arrived yet."], tone: "neutral" },
            { label: ["У Бориса", "Ben’s branch"], value: ["Прочитана одна строка", "One row read"], detail: ["В parser 1 есть функция readRow().", "Parser 1 provides readRow()."], tone: "ok" },
            { label: ["После объединения", "Merged branch"], value: ["readRow is not a function", "readRow is not a function"], detail: ["Правило Ани дало коду Бориса parser 2. В этой версии нет readRow().", "Anna’s rule gave Ben’s code parser 2. This version has no readRow()."], tone: "bad" }
          ]
        },
        solutions: [
          {
            title: ["Дать загрузчику CSV подходящий parser", "Give the CSV importer a parser it supports"],
            body: ["Если есть выпуск csv-importer для parser 2, обновите его. Если такого выпуска нет, а старую версию parser можно оставить, сузьте правило overrides до того пакета, ради которого Аня его добавляла. Тогда npm сможет поставить для загрузчика его parser 1.",
              "Upgrade csv-importer if a release supports parser 2. If none does and parser 1 is acceptable for now, narrow Anna's override to the package she originally meant to change. npm can then give the importer the parser 1 it asks for."]
          },
          {
            title: ["Исправить новую кнопку", "Update the new button"],
            body: ["В TodayButton.tsx замените вызов openDay() на showDay(). Поищите openDay в объединённой ветке, чтобы найти другие кнопки, добавленные в то же время.",
              "In TodayButton.tsx switch openDay() to showDay(). Search the merged branch for openDay to catch other buttons added at the same time."],
            code: "// TodayButton.tsx\nonClick={() => calendar.showDay(today)}"
          }
        ],
        check: ["Проверьте именно объединённую ветку. Для CSV загрузите файл с одной строкой. Для календаря нажмите новую кнопку.", "Test the merged branch. For the CSV change, upload a one-row file. For the calendar change, click the new button."],
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
        title: ["Почему отчёт пользуется старой версией?", "Why does the report still use the old version?"],
        lead: [
          "На экране и в отчёте цены выводит одна библиотека — fmt. Вы обновили её. На экране всё исправилось, а в отчёте ошибка осталась. Заглянем в папки этого учебного магазина.",
          "A library called fmt prints prices on screen and in a report. You update it. The screen looks right, but the report still shows the old error. Let's open the folders in this sample shop."
        ],
        layout: {
          intro: ["У магазина есть свой пакет fmt, а внутри плагина отчётов лежит ещё один. Отступ показывает, в какой папке лежит файл.", "The shop has a copy of fmt. The reports plugin has another one inside its folder. Indentation shows which folder contains each file."],
          paths: [
            {path:"shop/", depth:0, note:["Проект магазина", "Shop project"]},
            {path:"page.js", depth:1, note:["Показывает цену на экране", "Displays the price on screen"]},
            {path:"node_modules/", depth:1, note:["Установленные пакеты магазина", "Packages installed for the shop"]},
            {path:"fmt/", depth:2, note:["Версия 2 для страницы", "Version 2 for the page"]},
            {path:"legacy-report/", depth:2, note:["Плагин отчётов", "Reports plugin"]},
            {path:"index.js", depth:3, note:["Составляет отчёт", "Builds the report"]},
            {path:"node_modules/fmt/", depth:3, note:["Версия 1 для отчёта", "Version 1 for the report"]}
          ]
        },
        examples: [
          {
            title: ["Две папки с именем fmt", "Two folders named fmt"],
            body: [
              "Страница магазина берёт fmt из общей папки node_modules. А старый плагин отчётов хранит свою копию fmt внутри папки legacy-report. Когда файл плагина вызывает require('fmt'), Node сначала смотрит рядом с ним. Там уже лежит fmt 1.0.0.",
              "The shop page gets fmt from the top-level node_modules folder. The older reports plugin has its own copy inside legacy-report. When a file in that plugin calls require('fmt'), Node looks near that file first. It finds fmt 1.0.0 right there."
            ],
            code: "node_modules/fmt/                         2.0.0\nnode_modules/legacy-report/\n  index.js                               require('fmt')\n  node_modules/fmt/                      1.0.0"
          },
          {
            title: ["Как узнать, какая копия сработала", "How to see which copy ran"],
            body: [
              "Допустим, fmt 1.0.0 неправильно округляет цену. Вы обновляете только общую папку до 2.0.1. Файл отчёта всё ещё находит свою 1.0.0. Попросите Node напечатать путь из обоих файлов. Разница видна в выводе даже без номеров версий.",
              "Suppose fmt 1.0.0 rounds a price incorrectly. You update only the top-level copy to 2.0.1. The report file still finds its own 1.0.0. Ask Node to print the path from both files. Even without version numbers, the output shows the difference."
            ],
            code: ["// Вставим в страницу и в файл отчёта\nconsole.log(require.resolve('fmt'))\n\n// Страница: …/node_modules/fmt/index.js\n// Отчёт:    …/legacy-report/node_modules/fmt/index.js", "// Add this in both the page and the report\nconsole.log(require.resolve('fmt'))\n\n// Page:   …/node_modules/fmt/index.js\n// Report: …/legacy-report/node_modules/fmt/index.js"]
          }
        ],
        lab: {
          prompt: ["Из какого файла вызовем require('fmt')?", "Which file should call require('fmt')?"],
          states: [
            { label: ["Страница магазина", "Shop page"], value: ["fmt@2.0.0", "fmt@2.0.0"], detail: ["Страница находит fmt в общей папке node_modules.", "The page finds fmt in the top-level node_modules folder."], tone: "neutral" },
            { label: ["Файл отчёта", "Report file"], value: ["fmt@1.0.0", "fmt@1.0.0"], detail: ["Для файла отчёта ближе папка legacy-report/node_modules/fmt.", "The nearest copy to the report file is in legacy-report/node_modules/fmt."], tone: "neutral" },
            { label: ["Отчёт после обновления", "Report after update"], value: ["Всё ещё fmt@1.0.0", "Still fmt@1.0.0"], detail: ["Обновилась лишь общая копия. Отчёт открывает тот же файл, что и раньше.", "Only the top-level copy changed. The report opens the same file as before."], tone: "warn" }
          ]
        },
        solutions: [
          {
            title: ["Обновить именно то, чем пользуется отчёт", "Update the copy used by the report"],
            body: ["Если исправление есть в ветке fmt 1.x и отчёт его разрешает, обновите вложенную fmt и проверьте новый номер в lock-файле. Если исправление вышло только в fmt 2, обновите сам legacy-report до версии с поддержкой fmt 2. Две работающие копии можно оставить.",
              "If the fix shipped in fmt 1.x and the report allows that release, update its nested fmt and check the new version in the lockfile. If the fix only exists in fmt 2, upgrade legacy-report to a release that supports fmt 2. Two working copies can stay."],
            code: "npm ls fmt --all"
          }
        ],
        check: ["Сформируйте отчёт с ценой, на которой видели ошибку. Напечатайте путь к fmt из файла отчёта. Запуск той же команды из корня может показать другую копию.", "Generate a report with a price that used to round incorrectly. Print the fmt path from the report file. Looking it up from the project root may show a different copy."],
        sources: [{ label: ["Node.js · поиск в node_modules", "Node.js · lookup in node_modules"], url: "https://nodejs.org/api/modules.html#loading-from-node_modules-folders" }]
      },
      {
        id: "borrowed-dependency",
        title: ["Добавили приложение. Почему сломалось старое поле?", "Why did adding an app break an existing form field?"],
        lead: [
          "Formik хранит то, что человек ввёл в форму. В этой истории сайт и админка жили в одном репозитории, каждый в своей папке со своим package.json. Такой проект называют монорепозиторием. Оба приложения брали готовые поля из общей библиотеки ui. Проследим за полем для почты.",
          "Formik keeps track of what someone types into a form. In this story the website and admin app lived in one repository, each in its own folder with its own package.json. That setup is called a monorepo. Both apps used fields from a shared ui library. Let's follow the email field."
        ],
        layout: {
          intro: ["Названия «сайт», «админка» и «отчёты», пути и код ниже — для наглядности. Yarn одной командой устанавливает зависимости для всех папок внутри packages.", "Website, admin and reports are example names. The paths and code are sketches. Yarn installs the dependencies for all the folders under packages together."],
          paths: [
            {path:"project/", depth:0, note:["Один репозиторий", "One repository"]},
            {path:"packages/", depth:1, note:["Папки приложений и общей библиотеки", "Apps and the shared library"]},
            {path:"site/", depth:2, note:["Сайт со старыми формами на Formik 1", "Website with older forms using Formik 1"]},
            {path:"admin/", depth:2, note:["Админка уже использовала Formik 2", "Admin app already on Formik 2"]},
            {path:"reports/", depth:2, note:["Позднее добавленное приложение с Formik 2", "New reports app that also uses Formik 2"]},
            {path:"ui/", depth:2, note:["Общая библиотека полей формы", "Shared library of form fields"]},
            {path:"EmailField.tsx", depth:3, note:["Поле для почты берёт Field из Formik", "The email field imports Field from Formik"]},
            {path:"node_modules/formik/", depth:1, note:["Общая копия Formik, которую находил ui", "The shared copy found by ui"]}
          ]
        },
        examples: [
          {
            title: ["Почему поле в ui нашло Formik, который установил сайт", "The field borrowed the app’s Formik"],
            body: [
              "Сайт запросил Formik 1.5.8. Поле EmailField тоже использовало Formik, но в ui/package.json его забыли указать. Node искал пакет рядом с файлом поля и, поднимаясь по папкам, находил копию сайта в общей node_modules. Когда к админке добавились отчёты, тоже на Formik 2, Yarn положил в общую папку 2.1.2. Строка импорта в поле осталась прежней.",
              "The website asked for Formik 1.5.8. EmailField used Formik too, but ui/package.json did not declare it. Node looked near the field file, then upwards, finding the website’s copy in the shared node_modules. When the reports app joined the admin app in using Formik 2, Yarn placed 2.1.2 in that shared folder. The import line in the field stayed the same."
            ],
            code: ["// packages/ui/EmailField.tsx\nimport { Field } from 'formik'\nexport const EmailField = () => <Field name=\"email\" />\n\npackages/ui/node_modules/formik    нет своей копии\nnode_modules/formik                раньше 1.5.8, теперь 2.1.2", "// packages/ui/EmailField.tsx\nimport { Field } from 'formik'\nexport const EmailField = () => <Field name=\"email\" />\n\npackages/ui/node_modules/formik    no local copy\nnode_modules/formik                was 1.5.8, now 2.1.2"]
          },
          {
            title: ["Почему своя копия тоже мешает", "Why giving the field a private copy can also go wrong"],
            body: [
              "Сначала автор явно добавил в ui Formik 1.5.8. Но отчёты по-прежнему брали Formik 2. В примере ниже отчёты кладут email в форму через свою копию. Поле читает значение через Formik 1. У каждой копии своё место для передачи данных — React-контекст. Поле не видит почту в контексте другой копии. В самом разборе возникла и ошибка TypeScript: в Formik 2 отсутствовало прежнее имя FormikActions.",
              "The author first added Formik 1.5.8 to ui explicitly. Reports still used Formik 2. In the sketch below, reports puts the email into a form using its copy. The field reads the value using Formik 1. Each copy has its own React context for passing values down. The field cannot see the email in the other context. The report also recorded a TypeScript error: Formik 2 did not export the old FormikActions name."
            ],
            code: ["// packages/reports/Filter.tsx\nimport { Formik } from 'formik'           // версия 2\nimport { EmailField } from '@demo/ui'    // внутри версия 1\n\n<Formik initialValues={{ email: 'alex@example.org' }} onSubmit={save}>\n  <EmailField />\n</Formik>", "// packages/reports/Filter.tsx\nimport { Formik } from 'formik'           // version 2\nimport { EmailField } from '@demo/ui'    // internally uses v1\n\n<Formik initialValues={{ email: 'alex@example.org' }} onSubmit={save}>\n  <EmailField />\n</Formik>"]
          }
        ],
        lab: {
          prompt: ["Где поле найдёт Formik?", "Where will the field find Formik?"],
          states: [
            { label: ["До нового приложения", "Before the new app"], value: ["Общая папка · 1.5.8", "Shared folder · 1.5.8"], detail: ["Старые приложения установили Formik. Поле почты нашло их копию.", "The older apps installed Formik. The email field found their copy."], tone: "warn" },
            { label: ["После добавления", "After adding the app"], value: ["Та же папка · 2.1.2", "Same folder · 2.1.2"], detail: ["У поля прежний код, но Yarn заменил Formik в общей папке.", "The field’s code stayed the same. Yarn changed the Formik version in the shared folder."], tone: "bad" },
            { label: ["Только UI", "UI on its own"], value: ["Cannot find module 'formik'", "Cannot find module 'formik'"], detail: ["Учебный случай: берём UI отдельно, до первой правки. Никто из соседей не установил Formik, а сама UI его не попросила.", "A separate experiment: install only the original UI package before the first repair. No other app installs Formik, and UI never asks for it."], tone: "bad" }
          ]
        },
        solutions: [
          {
            title: ["Если общие поля пока работают с Formik 1", "If the shared fields still need Formik 1"],
            body: ["Автор описал требование к приложению прямо в ui/package.json. Так приложение узнаёт, какой Formik нужен полям. Эту версию нужно действительно поставить в приложении, которое использует поля, и убедиться, что и форма, и поле берут одну копию.",
              "The author wrote the requirement into ui/package.json so each app could see which Formik the fields needed. An app using these fields must then install a compatible release and make sure the form and its fields load that same copy."],
            code: "// packages/ui/package.json\n\"peerDependencies\": { \"formik\": \"^1.5.8\" }"
          },
          {
            title: ["Если отчётам нужен Formik 2", "If the reports app needs Formik 2"],
            body: ["Можно выпустить новую версию ui. Перенесите поля и старые типы на Formik 2, попробуйте их в приложении с этой версией и только затем объявите поддержку Formik 2. Сайт сможет пользоваться прежним выпуском ui, пока его формы не готовы к переходу.",
              "You can release a new ui version. Port the fields and old types to Formik 2, try them in an app running that version, then declare support for it. The website can keep using the previous ui release until its forms are ready."]
          }
        ],
        check: ["Откройте форму в приложении, которое берёт поле из ui. Отображается ли начальная почта? Измените её и посмотрите, какое значение получит onSubmit при отправке формы.", "Open the form in the app that imports the ui field. Does the starting email appear? Edit it and check which value onSubmit receives when you submit the form."],
        sources: [
          { label: ["Formik · разбор автора", "Formik · first-hand account"], url: "https://enrq.me/dev/2020/04/04/hoisting-in-monorepos/" },
          { label: ["Yarn Classic · workspaces", "Yarn Classic · workspaces"], url: "https://classic.yarnpkg.com/lang/en/docs/workspaces/" },
          { label: ["Formik · как поле получает значение", "Formik · how a field gets its value"], url: "https://formik.org/docs/api/field" },
          { label: ["React · почему важна одна копия контекста", "React · why context identity matters"], url: "https://react.dev/reference/react/useContext#troubleshooting" }
        ]
      },
      {
        id: "react-instance",
        title: ["У кнопки и страницы разный React", "The button and the page use different copies of React"],
        lead: [
          "Кнопка живёт в библиотеке UI. По клику она меняет счётчик через useState. Приложение просит React DOM показать эту кнопку на странице. Если кнопка и React DOM берут React из разных папок, можно получить ошибку Invalid hook call.",
          "A button lives in a UI library. It uses useState to keep a click count. The app asks React DOM to draw the button on the page. If the button and React DOM load React from different folders, you can get an invalid Hook call."
        ],
        layout: {
          intro: ["Для примера разработчик открыл рядом два отдельных проекта и подключил ui к приложению по ссылке. У каждого проекта после установки есть своя папка node_modules.", "Here a developer has two projects side by side and has linked ui into the app. Both projects have their own node_modules folder after installation."],
          paths: [
            {path:"app/", depth:0, note:["Запускает страницу", "Starts the page"]},
            {path:"main.jsx", depth:1, note:["Просит React DOM нарисовать кнопку", "Asks React DOM to draw the button"]},
            {path:"node_modules/react/", depth:1, note:["Копия для React DOM приложения", "Copy used by the app’s React DOM"]},
            {path:"ui/", depth:0, note:["Библиотека кнопок в соседней папке", "Button library in a separate folder"]},
            {path:"Counter.jsx", depth:1, note:["Импортирует useState для кнопки", "Imports useState for the button"]},
            {path:"node_modules/react/", depth:1, note:["Отдельная копия для кода ui", "Separate copy used by ui code"]}
          ]
        },
        examples: [
          {
            title: ["Кнопку подключили из соседней папки", "The button comes from a linked folder"],
            body: [
              "Допустим, вы подключили локальную библиотеку UI по ссылке. У неё осталась своя папка node_modules/react. Кнопка берёт useState там. А React DOM берёт React из папки приложения. На обеих копиях написано 18.2.0, но только одна знает, какой компонент React DOM сейчас рисует.",
              "Say you link a local UI library into the app. It still has its own node_modules/react. The button gets useState from that copy. React DOM gets React from the app folder. Both copies say 18.2.0, but only one knows which component React DOM is currently drawing."
            ],
            code: ["// ui/Counter.jsx\nimport { useState } from 'react'    // ui/node_modules/react\n\n// app/main.jsx\nroot.render(<Counter />)           // React DOM использует app/node_modules/react", "// ui/Counter.jsx\nimport { useState } from 'react'    // ui/node_modules/react\n\n// app/main.jsx\nroot.render(<Counter />)           // React DOM uses app/node_modules/react"]
          },
          {
            title: ["А если это два отдельных виджета?", "What if the two widgets run independently?"],
            body: [
              "На странице могут независимо работать корзина и чат. Корзина рисует свои кнопки с React из пакета корзины. Чат рисует свои с React из пакета чата. В каждой паре кнопка и React DOM пользуются общей копией. Поэтому одно лишь число копий ещё не объясняет ошибку.",
              "A cart and a chat can run independently on one page. The cart draws its buttons with the React in the cart package. The chat draws its buttons with the React in the chat package. Each button shares a copy with the React DOM that draws it. Counting the copies alone won't explain a Hook error."
            ],
            code: "// cart/main.jsx\ncartRoot.render(<CartButton />)\n\n// chat/main.jsx\nchatRoot.render(<ChatButton />)"
          }
        ],
        lab: {
          prompt: ["Из какой папки кнопка и React DOM возьмут React?", "Where will the button and React DOM get React?"],
          states: [
            { label: ["Одна папка", "One folder"], value: ["Одна копия React", "One copy of React"], detail: ["Кнопка использует тот же React, что и React DOM.", "The button uses the same React as React DOM."], tone: "ok" },
            { label: ["Разные папки", "Different folders"], value: ["Две копии React", "Two copies of React"], detail: ["Кнопка вызвала useState из другой копии. Это одна из причин Invalid hook call.", "The button called useState from a different copy. That is one cause of an invalid Hook call."], tone: "bad" },
            { label: ["Два виджета", "Separate widgets"], value: ["У каждого своя пара", "Each has its own pair"], detail: ["Кнопка корзины рисуется корзиной, кнопка чата — чатом. Внутри каждой пары копия общая.", "The cart draws the cart button and the chat draws the chat button. Each pair shares one copy."], tone: "ok" }
          ]
        },
        solutions: [
          {
            title: ["Пусть кнопку и страницу обслуживает React приложения", "Let the button share the app’s React"],
            body: ["Если вы выпускаете библиотеку кнопок, укажите в её peerDependencies поддерживаемые версии React и оставьте React вне собираемого файла библиотеки. Тогда приложение сможет дать кнопке свою копию. Для локальной разработки по ссылке настройте сборщик приложения так, чтобы оба импорта приходили в одну папку.",
              "If you ship the button library, declare its supported React versions in peerDependencies and keep React out of the library bundle. The app can then supply its copy. For a locally linked library, configure the app’s bundler to send both imports to one folder."],
            code: "// ui/package.json\n\"peerDependencies\": { \"react\": \"^18.2.0\" }"
          }
        ],
        check: ["Начните с npm ls react. Если нашли две копии, выясните, какая досталась кнопке и какая — рисующему её React DOM. После исправления нажмите кнопку и убедитесь, что счётчик изменился. Если копия была одна, проверьте другие причины ошибки по памятке React.",
          "Start with npm ls react. If you find two copies, trace the button’s React and the React used by its React DOM. After the fix click the button and check that the count changes. If they already shared a copy, check React’s guide for the other causes."],
        sources: [{ label: ["React · диагностика Invalid hook call", "React · diagnosing invalid Hook calls"], url: "https://react.dev/warnings/invalid-hook-call-warning" }]
      }
    ]
  }
);
