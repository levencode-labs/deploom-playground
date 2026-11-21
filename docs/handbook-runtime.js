globalThis.DepLoomBookChapters.push(
  {
    id: "loading-and-behavior",
    title: ["После установки", "After installation"],
    lessons: [
      {
        id: "module-loader",
        title: ["Куда делся мой import?", "Where did my import go?"],
        lead: ["В src/report.ts разработчик написал import. Почему тогда Node жалуется на require? Между этими двумя строками есть ещё один файл. TypeScript записал в него JavaScript, и именно этот файл запустил Node.", "The developer wrote import in src/report.ts. Why does Node complain about require? There is another file between the two. TypeScript wrote JavaScript into it, and Node ran that file."],
        examples: [
          {
            title: ["Chalk 5 и строчка в tsconfig.json", "Chalk 5 and one line in tsconfig.json"],
            body: ["В отчёте Chalk одна настройка просила TypeScript собирать файлы в формате CommonJS. Поэтому вместо import в готовом файле появился вызов require. Так раньше загружался Chalk 4.1.2. Новый Chalk 5.0.0 поставлялся в формате ESM, и в окружении автора тот же вызов завершился ошибкой. Ниже сокращённый пример.", "In the Chalk report, a setting told TypeScript to output CommonJS, so the compiled file contained a require call. This worked with Chalk 4.1.2. Chalk 5.0.0 shipped as an ES module, and the same call failed in the reporter’s environment. Here is the short version."],
            code: "// src/report.ts\nimport chalk from 'chalk';\n// tsconfig.json\n{ \"compilerOptions\": { \"module\": \"commonjs\" } }\n// dist/report.js\nconst chalk_1 = require(\"chalk\");"
          },
          {
            title: ["Файл есть. Почему его нельзя открыть?", "Why can’t I import a file that exists?"],
            body: ["В учебном пакете palette автор добавил список разрешённых путей — exports. Точка в списке означает главное имя пакета. Внутренний файл lib/mix.js по-прежнему лежит на диске, но Node больше не разрешает обращаться к нему через имя пакета. Здесь автор уже сделал mix доступным через главный файл.", "In the sample package palette, the author added an exports list of allowed paths. The dot stands for the package name itself. The internal lib/mix.js file still exists, but Node now blocks that path through the package name. Here the author already exposes mix from the main file."],
            code: "// palette/package.json\n{ \"exports\": { \".\": \"./index.js\" } }\n// palette/index.js\nexport { mix } from './lib/mix.js';\n// app.js\nimport { mix } from 'palette';"
          }
        ],
        lab: {
          prompt: ["В этом опыте Node 16 запускает скрипт. Что получится, если изменить версию Chalk или способ его загрузки?", "In this exercise Node 16 runs the script. What changes if you switch the Chalk version or how the script loads it?"],
          states: [
            {
              label: ["Chalk 4 · require", "Chalk 4 · require"],
              value: ["Скрипт запустился", "Script starts"],
              detail: ["В готовом файле Node встречает require(\"chalk\"). Версия 4.1.2 открывается этим способом.", "Node reaches require(\"chalk\") in the built file. Version 4.1.2 loads this way."],
              tone: "ok"
            },
            {
              label: ["Chalk 5 · require", "Chalk 5 · require"],
              value: ["ERR_REQUIRE_ESM", "ERR_REQUIRE_ESM"],
              detail: ["Chalk 5 уже в другом формате, а в report.js остался старый вызов require. Здесь важна версия Node. В более новых Node некоторые ES-модули можно загрузить через require.", "Chalk 5 uses a different format, while report.js still has the old require call. The Node version matters here. Newer Node releases can load some ES modules with require."],
              tone: "bad"
            },
            {
              label: ["Chalk 5 · import", "Chalk 5 · import"],
              value: ["Скрипт запустился", "Script starts"],
              detail: ["Сохраняем import в готовом файле report.mjs. Расширение .mjs говорит Node читать его как ES-модуль. Теперь Chalk 5 открывается.", "Keep the import in the built report.mjs file. Its .mjs extension tells Node to read it as an ES module. Chalk 5 now loads."],
              tone: "ok"
            }
          ]
        },
        check: ["Откройте файл из папки сборки и найдите в нём строку с chalk. Запустите этот файл той же версией Node, что и на сервере. Если ошибка появляется только в тестах, посмотрите, чем тесты загружают свой файл настроек.", "Open the built file and find the line that loads chalk. Run it with the same Node version as the server. If only tests fail, check how the test runner loads its own settings file."],
        sources: [
          {
            label: ["Отчёт Chalk #527", "Chalk report #527"],
            url: "https://github.com/chalk/chalk/issues/527"
          },
          {
            label: ["Точки входа пакета в Node.js", "Node.js package entry points"],
            url: "https://nodejs.org/api/packages.html#package-entry-points"
          }
        ],
        solutions: [
          {
            title: ["Собирать скрипт как ES-модуль", "Build the script as an ES module"],
            body: ["Если скрипт уже готов к формату ESM, сохраните import при сборке и убедитесь, что Node распознаёт готовый файл как ES-модуль. В небольшом скрипте на JavaScript для этого подойдёт расширение .mjs.", "If the script is ready for ESM, keep import in the compiled output and make sure Node recognizes the output as an ES module. For a small JavaScript script, an .mjs filename does that."],
            code: "// report.mjs\nimport chalk from 'chalk';\nconsole.log(chalk.green('OK'));"
          },
          {
            title: ["Оставить прежнюю версию для старого скрипта", "Keep the older version for a legacy script"],
            body: ["Если формат сборки сегодня менять нельзя, в описанном случае можно временно вернуть Chalk 4.1.2 и пересобрать lock-файл. Для ошибки с palette исправление другое: замените внутренний путь на опубликованный автором импорт.", "If the build format cannot change today, this particular script can temporarily pin Chalk 4.1.2 and refresh its lockfile. For the palette path error, change the import to the path published by its author."],
            code: "npm install --save-exact chalk@4.1.2"
          }
        ],
        layout: {
          intro: ["Откуда берётся вторая строка? Проследите путь от файла разработчика до файла, который запустит Node.", "Where does the second line come from? Follow the source file through to the file Node runs."],
          paths: [
            {
              path: "src/",
              depth: 0,
              note: ["Здесь лежит код до сборки.", "Source code before the build."]
            },
            {
              path: "report.ts",
              depth: 1,
              note: ["Разработчик написал import.", "The developer wrote import here."]
            },
            {
              path: "tsconfig.json",
              depth: 0,
              note: ["Здесь выбран формат готового JavaScript.", "This file selects the output JavaScript format."]
            },
            {
              path: "dist/",
              depth: 0,
              note: ["Сюда TypeScript записывает результат.", "TypeScript writes its output here."]
            },
            {
              path: "report.js",
              depth: 1,
              note: ["Именно этот файл открывает Node.", "This is the file Node actually opens."]
            }
          ]
        }
      },
      {
        id: "type-boundaries",
        title: ["Почему TypeScript ругается на чужой файл?", "Why is TypeScript complaining about someone else’s file?"],
        lead: ["Вы обновили библиотеку и ещё не успели изменить свой код. А TypeScript уже показывает ошибку в node_modules. Пакеты приносят файлы с расширением .d.ts. В них написано, какие значения принимают и возвращают функции. Этим файлам тоже нужна подходящая версия TypeScript.", "You updated a library and haven’t touched your own code. TypeScript already shows an error in node_modules. Packages ship .d.ts files that describe which values functions accept and return. Those files need a compatible TypeScript version too."],
        examples: [
          {
            title: ["Ошибка пришла из @types/node", "The error came from @types/node"],
            body: ["В одном проекте TypeScript 3.7.7 читал новую версию @types/node — 18.13.0. Первая ошибка указывала прямо на util.d.ts. Компилятор остановился на записи, которую ещё не умел читать. Вот версии инструментов и начало сообщения из отчёта.", "One project had TypeScript 3.7.7 and an updated @types/node package, version 18.13.0. The first error pointed straight at util.d.ts. The compiler stopped at syntax it could not read. Here are the versions and the start of the reported error."],
            code: "typescript   3.7.7\n@types/node  18.13.0\nnode_modules/@types/node/ts4.8/util.d.ts(1485,42): error TS1005"
          },
          {
            title: ["Один компонент, два описания React", "One component, two sets of React types"],
            body: ["В обсуждении DefinitelyTyped разработчики столкнулись с ошибками после переустановки зависимостей. Приложение ожидало одно описание того, что React умеет показывать, а библиотека календаря принесла другое. Имя типа в ошибке — ReactNode. Посмотрите, кто установил каждую версию @types/react.", "In a DefinitelyTyped discussion, developers hit errors after reinstalling dependencies. The app expected one description of what React could display, while a calendar library brought another. The type named in the error was ReactNode. Find which package installed each version of @types/react."],
            code: "# npm\nnpm ls @types/react\n# Yarn Classic\nyarn why @types/react"
          }
        ],
        lab: {
          prompt: ["Отдельный маленький пример. В point.d.ts записано type Point = [x: number, y: number]. Версия 4.0 научилась читать подписи x и y. Что скажут разные версии?", "Try a smaller example. The file point.d.ts says type Point = [x: number, y: number]. Version 4.0 introduced the x and y labels. What will each version say?"],
          states: [
            {
              label: ["TypeScript 3.7", "TypeScript 3.7"],
              value: ["Ошибка на подписи x", "Syntax error at label x"],
              detail: ["Версия 3.7 умеет читать пару [number, number]. Запись с именами x и y для неё новая.", "Version 3.7 can read a pair written as [number, number]. The x and y labels are unfamiliar syntax."],
              tone: "bad"
            },
            {
              label: ["3.7 + skipLibCheck", "3.7 + skipLibCheck"],
              value: ["Та же ошибка", "Same error"],
              detail: ["Настройка skipLibCheck разрешает пропустить проверку типов внутри .d.ts. Сначала TypeScript всё равно должен прочитать запись. На этом шаге он снова останавливается.", "skipLibCheck skips type checking inside .d.ts files. TypeScript still has to read the syntax first. It stops at that earlier step again."],
              tone: "bad"
            },
            {
              label: ["TypeScript 4.0", "TypeScript 4.0"],
              value: ["Строка с Point принята", "Point declaration accepted"],
              detail: ["Версия 4.0 знает, что x и y — имена двух чисел в паре. Она может перейти к следующим строкам.", "Version 4.0 understands that x and y label two numbers in a pair. It can move on to the next line."],
              tone: "ok"
            }
          ]
        },
        check: ["Начните с пути в первой ошибке. Если там node_modules/@types, выпишите версию этого пакета и версию TypeScript из проекта. Затем повторите сборку и посмотрите, остались ли ошибки в ваших файлах.", "Start with the path in the first error. If it contains node_modules/@types, note the version of that package and the project’s TypeScript version. Rebuild and see whether errors remain in your own files."],
        sources: [
          {
            label: ["Разбор @types/node", "@types/node discussion"],
            url: "https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/64262"
          },
          {
            label: ["Инцидент с типами React", "React types incident"],
            url: "https://github.com/DefinitelyTyped/DefinitelyTyped/issues/59802"
          },
          {
            label: ["Именованные кортежи в TypeScript 4.0", "Labeled tuples in TypeScript 4.0"],
            url: "https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements"
          }
        ],
        solutions: [
          {
            title: ["Подобрать типы к компилятору", "Choose types the compiler can read"],
            body: ["Если TypeScript пока нельзя обновить, возьмите точную версию @types/node из последней рабочей сборки. Сохраните получившиеся package.json и lock-файл вместе. Если можно обновить TypeScript, соберите весь проект новой версией и посмотрите, какие файлы ещё требуют правок.", "If TypeScript must stay, pin @types/node to the exact version from the last working build. Keep the resulting package.json and lockfile together. If updating TypeScript is possible, rebuild the whole project with it and inspect the remaining errors."]
          },
          {
            title: ["Согласовать типы React с библиотекой календаря", "Align the React types used by the calendar"],
            body: ["Найдите пакет, который установил вторую версию @types/react. Выберите выпуск календаря, поддерживающий версию React вашего приложения. Затем повторите проверку файла, где календарь используется как компонент.", "Find the package that brought in the second @types/react. Select a calendar release that supports the app’s React version. Then type-check the file that renders the calendar."]
          }
        ]
      },
      {
        id: "user-actions",
        title: ["Иконка на месте. А подсказка?", "The icon is there. Where is the tooltip?"],
        lead: ["На странице заказа кнопка с восклицательным знаком. Тест нашёл её и прошёл. Человек навёл курсор и так и не узнал, что случилось с заказом. Какой строки не хватило в тесте?", "The order page has a button with an exclamation mark. The test finds the button and passes. A customer hovers over it and never learns what went wrong with the order. Which line was missing from the test?"],
        examples: [
          {
            title: ["Проверяем, появился ли текст", "Check whether the text actually appears"],
            body: ["В учебном примере подсказке нужна ссылка на настоящую кнопку. React называет такую ссылку ref. Разработчик обернул кнопку в свой компонент и забыл передать ref дальше. Кнопка осталась на странице. А вот подсказке больше не к чему привязать обработчик наведения. Последняя строка теста это заметит.", "In this example, the tooltip needs a reference to the actual button. React calls that reference a ref. A developer wrapped the button in another component and forgot to pass the ref through. The button still appears. The tooltip has nowhere to attach its hover listener. The last line of the test catches it."],
            code: ["// order.test.tsx\nconst icon = screen.getByRole('button', { name: 'Статус' });\nawait user.hover(icon);\nexpect(await screen.findByRole('tooltip'))\n  .toHaveTextContent('Нужно подтверждение');", "// order.test.tsx\nconst icon = screen.getByRole('button', { name: 'Status' });\nawait user.hover(icon);\nexpect(await screen.findByRole('tooltip'))\n  .toHaveTextContent('Confirmation required');"]
          },
          {
            title: ["Открываем редактор ReactQuill", "Open the ReactQuill editor"],
            body: ["В отчёте ReactQuill #1039 редактор версии 2.0.0 ломался с React DOM 19. Ошибка возникала, когда редактор появлялся на экране и вызывал удалённую функцию findDOMNode. Ниже учебный экран с таким редактором. Чтобы добраться до ошибки, нажмите кнопку «Править».", "ReactQuill report #1039 describes editor version 2.0.0 failing with React DOM 19. The error appeared when the editor was displayed and tried to call the removed findDOMNode function. The sample screen below has the same editor. Click Edit to reach the failing code."],
            code: ["// Article.tsx\n<button onClick={() => setEditing(true)}>Править</button>\n{editing && <ReactQuill />}\n// TypeError: react_dom_1.default.findDOMNode is not a function", "// Article.tsx\n<button onClick={() => setEditing(true)}>Edit</button>\n{editing && <ReactQuill />}\n// TypeError: react_dom_1.default.findDOMNode is not a function"]
          }
        ],
        lab: {
          prompt: ["Вернитесь к кнопке «Статус». Что покажет каждый шаг теста?", "Return to the Status button. What will each test step show?"],
          states: [
            {
              label: ["Найти кнопку", "Find the button"],
              value: ["Кнопка найдена", "Button found"],
              detail: ["Первая строка находит кнопку по имени. Наведения ещё не было.", "The first line finds the button by name. Nobody has hovered over it yet."],
              tone: "neutral"
            },
            {
              label: ["Навести курсор", "Hover"],
              value: ["Подсказка не появилась", "Tooltip missing"],
              detail: ["После наведения тест ждёт текст. ref потерялся по пути к кнопке, поэтому ждать нечего. Тест завершится ошибкой.", "After hovering, the test waits for the text. The ref never reached the button, so no tooltip appears and the test fails."],
              tone: "bad"
            },
            {
              label: ["Вернуть ref и навести", "Restore ref and hover"],
              value: ["«Нужно подтверждение»", "“Confirmation required”"],
              detail: ["В компоненте кнопки снова есть <button ref={ref}>. Подсказка получила кнопку, подключила наведение и показала пояснение.", "The button component once again renders <button ref={ref}>. The tooltip finds the button, attaches its hover listener and shows the explanation."],
              tone: "ok"
            }
          ]
        },
        check: ["После замены кнопки наведите на неё курсор и перейдите к ней клавишей Tab. Если меняли диалог, проверьте, куда попадает фокус при открытии. Для редактора дойдите до ввода текста.", "After replacing a button, hover over it and tab to it. For a changed dialog, check where focus moves when it opens. For an editor, go as far as typing some text."],
        sources: [
          {
            label: ["Отчёт ReactQuill #1039", "ReactQuill report #1039"],
            url: "https://github.com/zenoamaro/react-quill/issues/1039"
          }
        ],
        solutions: [
          {
            title: ["Передать ссылку настоящей кнопке", "Pass the ref to the actual button"],
            body: ["Если пропала подсказка, откройте компонент кнопки. В варианте для React 18 можно принять ref через forwardRef и передать его элементу button. Тогда библиотека подсказок получит тот элемент, над которым будет курсор.", "If the tooltip stopped appearing, open the button component. In React 18, forwardRef can receive the ref and pass it to the button element. The tooltip library then gets the actual element under the pointer."],
            code: "const StatusButton = forwardRef((props, ref) => (\n  <button {...props} ref={ref} />\n));"
          },
          {
            title: ["Подобрать редактор для React DOM 19", "Choose an editor that supports React DOM 19"],
            body: ["Если падает ReactQuill, найдите выпуск или замену редактору, в которой больше нет вызова findDOMNode. Пока переход не готов, можно вернуть проверенную пару react и react-dom из прежнего lock-файла.", "If ReactQuill fails, look for an editor release or replacement that no longer calls findDOMNode. Until the migration is ready, you can restore the tested react and react-dom pair from the previous lockfile."]
          }
        ]
      },
      {
        id: "browser-and-server",
        title: ["Браузер открыл страницу. Справится ли сервер?", "The browser renders it. Can the server?"],
        lead: ["Меню сворачивается на узком экране. В браузере легко узнать ширину окна. Но некоторые приложения сначала собирают HTML на сервере и лишь потом отправляют его в браузер. На сервере у меню ещё нет окна.", "The menu collapses on narrow screens. A browser can measure its window. Some apps first build the page’s HTML on the server, then send it to the browser. At that first step, the menu has no window."],
        examples: [
          {
            title: ["Где читать ширину окна?", "Where should the menu read the width?"],
            body: ["В учебном Menu.tsx строчка с window.innerWidth работала при открытии меню в браузере. На сервере она останавливала подготовку всей страницы. В исправленном варианте меню сначала открыто. React запускает функцию внутри useEffect уже в браузере, и меню при необходимости сворачивается.", "In our sample Menu.tsx, reading window.innerWidth worked when the menu opened in a browser. On the server, that line stopped the whole page from rendering. In the fix below, the menu starts expanded. React runs the function inside useEffect in the browser, where the menu can collapse if needed."],
            code: ["// Menu.tsx · внутри компонента\nconst [compact, setCompact] = useState(false);\nuseEffect(() => {\n  setCompact(window.innerWidth < 700);\n}, []);", "// Menu.tsx · inside the component\nconst [compact, setCompact] = useState(false);\nuseEffect(() => {\n  setCompact(window.innerWidth < 700);\n}, []);"]
          },
          {
            title: ["Тест сам подставил сохранённую тему", "The test supplies its own saved theme"],
            body: ["Другой учебный компонент читает цветовую тему из localStorage — хранилища в браузере. Тест подставляет вместо него объект, который всегда возвращает dark. На сервере этой подстановки нет. Проверьте, может ли страница получить начальную тему до обращения к хранилищу браузера.", "Another sample component reads its theme from localStorage, the browser’s storage. Its test supplies an object that always returns dark. That stand-in isn’t present on the server. Check whether the page can choose an initial theme before accessing browser storage."],
            code: "// Theme.test.ts\nvi.stubGlobal('localStorage', { getItem: () => 'dark' });\n// Theme.tsx\nconst theme = localStorage.getItem('theme');"
          }
        ],
        lab: {
          prompt: ["Пусть окно браузера имеет ширину 600 пикселей. Где и когда меню получит эту ширину?", "Suppose the browser window is 600 pixels wide. Where and when can the menu read that width?"],
          states: [
            {
              label: ["Сразу в браузере", "Read in browser"],
              value: ["compact = true", "compact = true"],
              detail: ["Окно уже открыто. 600 меньше 700, поэтому меню сразу сворачивается.", "The window is already open. Its width is under 700, so the menu collapses right away."],
              tone: "ok"
            },
            {
              label: ["Сразу на сервере", "Read on server"],
              value: ["window is not defined", "window is not defined"],
              detail: ["Сервер дошёл до window.innerWidth. Объекта window здесь нет, и запрос страницы завершается ошибкой.", "The server reaches window.innerWidth. There is no window object here, so rendering this page fails."],
              tone: "bad"
            },
            {
              label: ["После открытия страницы", "Read after page opens"],
              value: ["Страница готова, меню свернулось", "Page loads, menu collapses"],
              detail: ["Сервер отправил HTML с открытым меню. После открытия страницы useEffect измерил 600 пикселей и свернул его.", "The server sent HTML with the menu expanded. Once the page opened, useEffect measured 600 pixels and collapsed it."],
              tone: "ok"
            }
          ]
        },
        check: ["Запросите страницу у сервера и посмотрите, есть ли меню в полученном HTML. Затем откройте страницу в узком окне и проверьте, что оно свернулось.", "Request the page from the server and look for the menu in the returned HTML. Then open the page in a narrow window and check that the menu collapses."],
        sources: [
          {
            label: ["Когда React запускает эффекты", "When React runs effects"],
            url: "https://react.dev/reference/react/useEffect"
          }
        ],
        solutions: [
          {
            title: ["Прочитать ширину после загрузки страницы", "Read the width after the page opens"],
            body: ["Дайте панели одинаковое начальное состояние на сервере и в браузере. Строку с window перенесите в useEffect, как в примере. Тему из localStorage можно прочитать тем же способом после запуска страницы в браузере.", "Give the panel the same initial state on the server and in the browser. Move the window access into useEffect as shown above. The same approach can read the theme from localStorage after the page opens."]
          },
          {
            title: ["Для внешнего вида использовать CSS", "Use CSS for display changes"],
            body: ["Если от ширины зависит только вид меню, браузер может выбрать оформление сам. В этом случае компонент вообще не читает ширину окна.", "If width affects only how the menu looks, let the browser choose the styling. The component then has no reason to read the window width."],
            code: "@media (max-width: 699px) {\n  .menu-label { display: none; }\n}"
          }
        ],
        layout: {
          intro: ["Меню одно, а способы его запуска разные.", "One menu, two ways to start it."],
          paths: [
            {
              path: "src/",
              depth: 0,
              note: ["В этом учебном проекте главные файлы лежат рядом.", "The main files sit together in this sample project."]
            },
            {
              path: "Menu.tsx",
              depth: 1,
              note: ["Здесь читают ширину окна.", "This is where the window width is read."]
            },
            {
              path: "server.tsx",
              depth: 1,
              note: ["Собирает HTML страницы на сервере.", "Builds the page HTML on the server."]
            },
            {
              path: "client.tsx",
              depth: 1,
              note: ["Запускает React в открытом окне браузера.", "Starts React in the open browser window."]
            }
          ]
        }
      }
    ]
  },
  {
    id: "release-evidence",
    title: ["Что доказала проверка?", "What did the check prove?"],
    lessons: [
      {
        id: "audit-coverage",
        title: ["Ноль предупреждений. А что проверили?", "Zero warnings. What actually got checked?"],
        lead: ["В отчёте написано «0 предупреждений». Теперь посмотрите, кого проверяли. Например, в список могли попасть только пакеты из package.json. Пакеты, которые они установили для себя, тоже лежат на диске. Среди них может быть старая версия.", "A report says “0 warnings.” Now check which packages it looked at. It may have checked only the ones in package.json. Those packages also installed others for their own use. An old version could be hiding among them."],
        examples: [
          {
            title: ["Верхнюю копию исправили, вложенная осталась", "One copy was fixed, another stayed behind"],
            body: ["В нашем выдуманном магазине утилита filter нужна и приложению, и модулю renderer. В первом месте уже версия 2, во втором осталась версия 1. Допустим, предупреждение относится только к версии 1. Посчитайте, сколько копий filter попадёт в отчёт по одним лишь прямым зависимостям магазина.", "In our fictional shop, both the app and its renderer need a utility called filter. The app now has version 2, but renderer still has version 1. Suppose the warning applies only to version 1. How many filter copies will a report on the shop’s direct dependencies see?"],
            code: "shop/node_modules/\n  filter@2\n  renderer@3/node_modules/\n    filter@1\n    tokens@1"
          },
          {
            title: ["Список пакетов есть, ответы пришли не все", "All packages are listed, only some have answers"],
            body: ["В другом прогоне проверки программа нашла все четыре установленных пакета. Для двух вложенных пакетов справочник уязвимостей не ответил. На них ставим UNKNOWN — «данных не хватило». Дата обновления справочника не объясняет, что случилось с этими двумя запросами.", "In another run the checker finds all four installed packages. The advisory service does not answer for the two nested ones. Mark those UNKNOWN, meaning there was not enough data. The date of the last database update cannot tell us what happened to those two requests."],
            code: ["filter@2      проверен\nrenderer@3    проверен\nfilter@1      UNKNOWN · нет ответа\ntokens@1      UNKNOWN · нет ответа", "filter@2      checked\nrenderer@3    checked\nfilter@1      UNKNOWN · no response\ntokens@1      UNKNOWN · no response"]
          }
        ],
        lab: {
          prompt: ["В магазине установлены четыре пакета. Кого проверить по справочнику?", "The shop has four installed packages. Which ones should the checker look up?"],
          states: [
            {
              label: ["Два прямых", "Direct two"],
              value: ["0 предупреждений · проверены 2 из 4", "0 warnings · 2 of 4 checked"],
              detail: ["В отчёте оказались filter@2 и renderer@3. До двух пакетов внутри renderer проверка не дошла.", "The report includes filter@2 and renderer@3. The check did not descend into renderer’s two dependencies."],
              tone: "warn"
            },
            {
              label: ["Все четыре", "All four"],
              value: ["1 предупреждение · проверены 4 из 4", "1 warning · 4 of 4 checked"],
              detail: ["Теперь программа дошла до старого filter@1 и нашла запись о нём в справочнике.", "The checker now reaches the old filter@1 and finds its advisory in the database."],
              tone: "bad"
            },
            {
              label: ["Два ответа потерялись", "Two lookups fail"],
              value: ["0 предупреждений · 2 UNKNOWN", "0 warnings · 2 UNKNOWN"],
              detail: ["Программа искала сведения обо всех четырёх пакетах. Для filter@1 и tokens@1 она не получила ответа. Считать эти версии проверенными пока рано.", "The checker looked up all four. It received no answer for filter@1 or tokens@1, so those two versions remain unassessed."],
              tone: "warn"
            }
          ]
        },
        check: ["Сколько пакетов нашли на диске? О скольких справочник дал ответ? Сколько версий попали под известное предупреждение? Сравните все три числа до и после исправления.", "How many packages were found on disk? How many got an answer from the database? How many matched a known warning? Compare all three numbers before and after the fix."],
        solutions: [
          {
            title: ["Обновить ветку со старой копией", "Update the branch with the old copy"],
            body: ["Посмотрите, какая версия renderer уже использует исправленный filter. Проверьте этот renderer в магазине. После установки перечитайте дерево: обе копии filter должны получить оценку.", "Find a renderer release that uses a fixed filter. Try that renderer in the shop. After installing it, inspect the tree again and assess both filter copies."],
            code: "npm ls filter --all"
          },
          {
            title: ["Повторить запросы без ответа", "Retry the unanswered lookups"],
            body: ["Сохраните точные имена и версии двух пакетов со статусом UNKNOWN. Проверьте доступ к справочнику и запросите эти пары заново. До получения ответов оставьте их отдельной строкой в отчёте.", "Keep the exact names and versions marked UNKNOWN. Restore access to the advisory source and retry those pairs. Keep them visible as unassessed items until the answers arrive."]
          }
        ]
      },
      {
        id: "audit-and-api",
        title: ["Исправили версию. Кто проверит SVG?", "The version is fixed. Does SVG still work?"],
        lead: ["Проект собирает SVG-иконки. Проверка безопасности просит обновить пакет, спрятанный внутри сборщика. Можно попросить npm поставить новую версию принудительно. Сразу возникают два вопроса. Исчезло ли предупреждение? Собираются ли теперь иконки?", "The project builds SVG icons. A security check flags a package buried inside the build tool. You can tell npm to force a newer version. Two questions follow. Is the warning gone? Do the icons still build?"],
        examples: [
          {
            title: ["Старая функция внутри сборки иконок", "An old function inside the icon build"],
            body: ["В отчёте Create React App сборщик дошёл от react-scripts до css-select, а от него до уязвимого nth-check@1.0.2. В обсуждении предложили поставить 2.1.1 через overrides в package.json. В отдельном маленьком опыте css-select@2.1.0 ждёт от require функцию. Версия 2.1.1 отдаёт объект с функцией внутри. Старый вызов ломается.", "A Create React App report traced a warning from react-scripts to css-select and then to nth-check@1.0.2. A reply suggested forcing 2.1.1 through overrides in package.json. In a separate small example, css-select@2.1.0 expects require to return a function. Version 2.1.1 returns an object containing that function. The old call breaks."],
            code: "// package.json\n{ \"overrides\": { \"nth-check\": \"2.1.1\" } }\n// css-select@2.1.0\nconst getNCheck = require('nth-check');\ngetNCheck('2n'); // TypeError: getNCheck is not a function"
          },
          {
            title: ["Девять обновлений и одна критическая уязвимость", "Nine updates and one critical warning"],
            body: ["В выдуманном проекте из десяти библиотек нужно обновить девять. Ещё одно условие выпуска — исправить все критические уязвимости. Девять библиотек обновились, но проблема именно в десятой, mailer. Команда пока запретила менять её версию. Выпуск всё ещё заблокирован.", "In a fictional project the team needs to update nine of ten libraries. A separate release rule requires fixing every critical vulnerability. Nine updates succeed, but the warning belongs to the tenth library, mailer. Its version is currently held by the team. The release is still blocked."],
            code: ["// package.json\n{ \"dependencies\": { \"mailer\": \"1.0.0\" } }\n\nОбновлено: 9/10\nCritical: mailer@1.0.0", "// package.json\n{ \"dependencies\": { \"mailer\": \"1.0.0\" } }\n\nUpdated: 9/10\nCritical: mailer@1.0.0"]
          }
        ],
        lab: {
          prompt: ["Правило :nth-child(2) выбирает второй элемент SVG. Выберите, какие библиотеки его обработают.", "The rule :nth-child(2) selects the second element in the SVG. Choose the libraries that will process it."],
          states: [
            {
              label: ["Оставить как есть", "Keep both versions"],
              value: ["Элемент выбран · уязвимость осталась", "Element selected · warning open"],
              detail: ["Старый css-select умеет вызвать функцию из nth-check@1.0.2. Но именно эта версия nth-check указана в предупреждении.", "The old css-select can call the function in nth-check@1.0.2. That version is listed in the advisory."],
              tone: "warn"
            },
            {
              label: ["Обновить nth-check", "Update nth-check"],
              value: ["getNCheck is not a function", "getNCheck is not a function"],
              detail: ["Версия исправлена. Но старый css-select по-прежнему пытается вызвать весь объект из require. Сборка до второго элемента не доходит.", "The affected version is gone. The old css-select still tries to call the whole object from require. Processing stops before it can select the second element."],
              tone: "bad"
            },
            {
              label: ["Обновить обе библиотеки", "Update both libraries"],
              value: ["Выбран второй элемент", "Second element selected"],
              detail: ["Здесь обновлённый css-select достаёт функцию из полученного объекта. Маленький пример проходит. Теперь можно проверить на настоящей иконке всю сборку проекта.", "Here the updated css-select gets the function out of the object. The small example works. Now run the project’s full build on a real icon."],
              tone: "ok"
            }
          ]
        },
        check: ["Узнайте через npm ls nth-check, где остались старые версии. Затем запустите обычную сборку на SVG, в котором действительно есть :nth-child.", "Use npm ls nth-check to locate any old versions. Then run the normal build on an SVG that actually contains :nth-child."],
        sources: [
          {
            label: ["Цепочка Create React App #13062", "Dependency chain in Create React App #13062"],
            url: "https://github.com/react/create-react-app/issues/13062"
          },
          {
            label: ["Затронутые версии nth-check", "Affected nth-check versions"],
            url: "https://github.com/advisories/GHSA-rp65-9cf3-cjxr"
          }
        ],
        solutions: [
          {
            title: ["Обновить библиотеку, которая вызывает nth-check", "Update the library that calls nth-check"],
            body: ["Найдите выпуск обработки SVG, в котором css-select умеет работать с исправленным nth-check. Предпочтите такой выпуск сборщика, если он подходит проекту. Проверьте его на файле с правилом :nth-child(2).", "Look for an SVG toolchain release in which css-select can call the fixed nth-check. Use that build-tool release if it fits the project, and test with a file containing :nth-child(2)."]
          },
          {
            title: ["Пересмотреть запрет для проблемного пакета", "Revisit the hold on the affected package"],
            body: ["В примере с mailer узнайте, зачем версия закреплена. Если её можно менять, отдельно испытайте исправленный выпуск. Если ограничение остаётся в силе, укажите конкретный пакет в причине блокировки выпуска.", "For the mailer example, find out why the version was pinned. If it can change, test a fixed release separately. If the hold stays, name the package in the release blocker."]
          }
        ]
      },
      {
        id: "tested-snapshot",
        title: ["Какой именно коммит был зелёным?", "Which commit actually passed?"],
        lead: ["Вчера тест открывал редактор и проходил. Утром в основную ветку добавили новый package-lock.json. Вчерашний результат всё ещё можно найти в отчёте. Но открылся ли редактор с сегодняшними версиями библиотек?", "Yesterday a test opened the editor and passed. This morning the main branch got a new package-lock.json. Yesterday’s result still appears in the report. Does the editor open with today’s library versions?"],
        examples: [
          {
            title: ["После проверки изменился package-lock.json", "package-lock.json changed after the check"],
            body: ["Expedia Group описала, как команда отслеживала изменения важных файлов перед объединением веток. Среди них был package-lock.json. Ниже учебные строки из истории заказа. Тест прошёл до изменения файла, в котором npm хранит выбранные версии библиотек.", "Expedia Group described checking for changes to important files before merging branches. One of those files was package-lock.json. The sample order-page history below shows why. The test ran before the file containing npm’s selected versions changed."],
            code: ["a13   order-editor.test.tsx    1 тест прошёл\nb24   package-lock.json       изменён после a13\n\ngit diff a13 b24 -- package-lock.json", "a13   order-editor.test.tsx    1 test passed\nb24   package-lock.json       changed after a13\n\ngit diff a13 b24 -- package-lock.json"]
          },
          {
            title: ["Команда завершилась, тест не нашёлся", "The command finished without finding the test"],
            body: ["В учебном проекте тест редактора перенесли в новую папку. В команде Vitest оставили старый путь и флаг passWithNoTests. Этот флаг разрешает успешное завершение, даже если Vitest вообще не нашёл тестов. В отчёте важно увидеть имя теста редактора.", "In a sample project the editor test moved to a new folder. The Vitest command still uses the old path and the passWithNoTests flag. This flag lets the command finish successfully even if Vitest finds no tests at all. Look for the editor test by name in the report."],
            code: "// package.json · scripts\n\"test:editor\": \"vitest run tests/old/editor --passWithNoTests\"\n\n// tests/orders/editor.test.tsx\nit('opens the editor', async () => { /* … */ });"
          }
        ],
        lab: {
          prompt: ["Тест прошёл на версии проекта a13. Утром появилась b24 с новым package-lock.json. Какой результат можно показать для каждой версии?", "The test passed on project revision a13. Revision b24 arrived this morning with a new package-lock.json. Which result is available for each revision?"],
          states: [
            {
              label: ["Вчера · a13", "Yesterday · a13"],
              value: ["Тест редактора прошёл", "Editor test passed"],
              detail: ["В отчёте указаны a13 и имя теста. Для этой версии знаем, что редактор открылся.", "The report names a13 and the editor test. We know the editor opened on this revision."],
              tone: "ok"
            },
            {
              label: ["Сегодня · b24", "Today · b24"],
              value: ["Ещё не проверено", "Not checked yet"],
              detail: ["Тесту из отчёта достались вчерашние библиотеки. Его нужно запустить на b24.", "The test in the report used yesterday’s libraries. It still needs to run on b24."],
              tone: "warn"
            },
            {
              label: ["b24 · старый путь", "b24 · old test path"],
              value: ["Выполнено 0 тестов", "0 tests ran"],
              detail: ["Версия проекта уже нужная, но Vitest смотрел в старую папку. Несмотря на успешное завершение команды, редактор никто не открывал.", "The revision now matches, but Vitest searched the old folder. The command succeeded without anyone opening the editor."],
              tone: "bad"
            }
          ]
        },
        check: ["В итоговом отчёте найдите два значения рядом: какой коммит проверялся и сколько нужных тестов действительно прошло. При переносе изменений из другой папки сравните также файлы и настройки запуска.", "In the final report look for the tested commit and the number of intended tests that actually passed. When copying changes back from another folder, compare the files and run settings too."],
        sources: [
          {
            label: ["Практика Expedia Group", "Expedia Group’s documented practice"],
            url: "https://github.com/ExpediaGroup/github-helpers/blob/main/README.md"
          },
          {
            label: ["Параметр Vitest passWithNoTests", "Vitest passWithNoTests option"],
            url: "https://vitest.dev/config/passwithnotests"
          }
        ],
        solutions: [
          {
            title: ["Запустить тест на результате объединения", "Test the merged revision"],
            body: ["Возьмите именно тот коммит, который собираетесь выпускать. Установите зависимости по его package-lock.json и запустите тест из его нынешней папки. Если в коммит позже внесли правки, повторите затронутый тест.", "Check out the exact revision that will ship. Install from its package-lock.json and run the test at its current path. If the revision changes again, repeat the affected test."],
            code: "npm ci\nnpm exec -- vitest run tests/orders/editor.test.tsx"
          },
          {
            title: ["Считать отсутствие обязательного теста ошибкой", "Fail when the required test is absent"],
            body: ["Исправьте путь в test:editor и уберите passWithNoTests из этой команды. Если во всём проекте опция включена в настройках, выключите её и там для обязательной проверки.", "Correct the test:editor path and remove passWithNoTests from this command. If the option is also enabled in project settings, turn it off for the required check there as well."]
          }
        ],
        layout: {
          intro: ["Где искать тест после переезда?", "Where did the test go?"],
          paths: [
            {
              path: "package.json",
              depth: 0,
              note: ["В scripts осталась команда со старым путём.", "The scripts entry still points to the old path."]
            },
            {
              path: "tests/",
              depth: 0,
              note: ["Папки с тестами.", "The test folders."]
            },
            {
              path: "orders/",
              depth: 1,
              note: ["Сюда перенесли проверку заказа.", "The order test moved into this folder."]
            },
            {
              path: "editor.test.tsx",
              depth: 2,
              note: ["Эта проверка действительно открывает редактор.", "This is the check that actually opens the editor."]
            }
          ]
        }
      },
      {
        id: "search-bounds",
        title: ["Что значит «решение не найдено»?", "What does “no solution found” mean?"],
        lead: ["Представьте редактор версии 2 и три выпуска плагина подсветки. К редактору подходит только средний выпуск. Если помощник посмотрит самый старый и самый новый, что он сможет сказать про средний?", "Imagine an editor on version 2 and three releases of a highlighting plugin. Only the middle release fits that editor. If a helper checks just the oldest and newest releases, what can it say about the one in between?"],
        examples: [
          {
            title: ["Подходящую версию пропустили", "The search skipped the working version"],
            body: ["В учебном каталоге плагин называется highlight, а редактор — editor. В package.json каждого выпуска плагина есть поле peerDependencies. В нём автор указывает, какую версию редактора плагин ожидает увидеть в приложении. Ниже выписаны три разных файла.", "In our sample catalog the plugin is highlight and the editor is editor. Each plugin release has a peerDependencies field in its package.json. The author uses it to say which editor version the app must provide. Below are lines from three different package files."],
            code: "highlight@1.0.0   \"peerDependencies\": { \"editor\": \"1.x\" }\nhighlight@1.1.0   \"peerDependencies\": { \"editor\": \"2.x\" }\nhighlight@1.2.0   \"peerDependencies\": { \"editor\": \"1.x\" }"
          },
          {
            title: ["Подсветка должна ещё появиться на экране", "Highlighting still has to appear on screen"],
            body: ["Когда помощник нашёл highlight@1.1.0, он пока сравнил только номера из package.json. Чтобы проверить сам плагин, установите пару в учебный проект, откройте редактор и введите строку с ключевым словом. Проверка должна найти выделенное слово.", "When the helper finds highlight@1.1.0, all it has compared are versions from package.json. To check the plugin itself, install the pair in the sample app, open the editor and enter a line with a keyword. The test should find the highlighted word."],
            code: "// package.json\n{ \"dependencies\": { \"editor\": \"2.0.0\", \"highlight\": \"1.1.0\" } }\n// highlight.test.ts\nawait user.type(screen.getByRole('textbox'), 'const n = 1');\nexpect(document.querySelector('.keyword')?.textContent).toBe('const');"
          }
        ],
        lab: {
          prompt: ["Оставьте editor@2.0.0. Какие записи каталога можно прочесть?", "Keep editor@2.0.0. Which catalog entries can the helper read?"],
          states: [
            {
              label: ["Первая и последняя", "First and last"],
              value: ["Не подошли 2 из 2 проверенных", "Neither of the 2 checked releases fits"],
              detail: ["Обе требуют editor 1.x. Запись для средней версии ещё никто не открывал.", "Both require editor 1.x. Nobody has opened the middle release’s entry yet."],
              tone: "warn"
            },
            {
              label: ["Средняя не загрузилась", "Middle entry unavailable"],
              value: ["UNKNOWN · не хватает сведений", "UNKNOWN · missing information"],
              detail: ["В списке есть highlight@1.1.0, но запрос её package.json завершился ошибкой. По двум соседним версиям угадать её требование нельзя.", "The list includes highlight@1.1.0, but the request for its package.json failed. The neighboring releases cannot tell us what it requires."],
              tone: "warn"
            },
            {
              label: ["Все три записи", "All three entries"],
              value: ["highlight@1.1.0 + editor@2.0.0", "highlight@1.1.0 + editor@2.0.0"],
              detail: ["Из файла средней версии видно, что ей подходит editor 2.x. Осталось открыть редактор с этой парой и проверить подсветку.", "The middle version’s file says it accepts editor 2.x. Open the editor with this pair and check the highlighting."],
              tone: "ok"
            }
          ]
        },
        check: ["Назовите проверенные версии плагина и ту, чей файл прочитать не удалось. Для выбранной пары откройте экран и проверьте нужное действие.", "List the plugin versions checked and any version whose file you could not read. Open the screen with the selected pair and test the intended action."],
        solutions: [
          {
            title: ["Проверить пропущенный выпуск", "Check the skipped release"],
            body: ["Добавьте 1.1.0 в список версий для сравнения. Если её файл не загрузился, повторите запрос к тому же разрешённому реестру пакетов. Менять версию editor ради двух неудачных попыток пока не нужно.", "Add 1.1.0 to the versions to compare. If its file failed to load, retry against the same approved registry. Two unsuccessful attempts are not a reason to change the editor version."],
            code: "// highlight@1.1.0/package.json\n{ \"peerDependencies\": { \"editor\": \"2.x\" } }"
          },
          {
            title: ["Испытать найденную пару в копии проекта", "Try the selected pair in a project copy"],
            body: ["В этом выдуманном проекте запишите editor@2.0.0 и highlight@1.1.0, обновите lock-файл и запустите тест подсветки. Так станет видно, что происходит после выбора версий.", "In this fictional project, set editor@2.0.0 and highlight@1.1.0, refresh the lockfile and run the highlighting test. That checks what happens after version selection."]
          }
        ]
      },
      {
        id: "repeat-codemod",
        title: ["Что будет, если повторить замену в коде?", "What happens if you run the rewrite twice?"],
        lead: ["При обновлении библиотеки часто приходится переименовать один и тот же импорт в десятках файлов. Такую замену можно поручить программе — codemod. Если запустить её ещё раз, на вход попадут уже исправленные файлы. Посмотрим, почему это важно для календаря.", "Upgrading a library can mean renaming the same import in dozens of files. A program called a codemod can do that for you. If you run it again, it reads the files it already changed. Here’s why that matters for a date picker."],
        examples: [
          {
            title: ["Второй запуск выбрал другой адаптер даты", "The second run picked a different date adapter"],
            body: ["Календарь MUI использует адаптер — небольшую прослойку для работы с библиотекой дат. Для date-fns v3 при переходе Date Pickers с v7 на v8 нужно поменять путь к адаптеру. Руководство MUI предупреждает, что второй запуск той же замены выберет уже адаптер для date-fns v2. Вот как меняется конец пути в одном и том же файле.", "The MUI picker uses an adapter, a small bridge to the date library. A project on date-fns v3 needs a new adapter path when upgrading Date Pickers from v7 to v8. MUI’s guide warns that running the same rewrite again selects the adapter for date-fns v2. Here is the changing end of the import path in one file."],
            code: ["// Calendar.tsx · путь после @mui/x-date-pickers/\nДо замены       AdapterDateFnsV3\nПосле 1 раза    AdapterDateFns\nПосле 2 раз     AdapterDateFnsV2", "// Calendar.tsx · path after @mui/x-date-pickers/\nBefore rewrite  AdapterDateFnsV3\nAfter one run   AdapterDateFns\nAfter two runs  AdapterDateFnsV2"]
          },
          {
            title: ["Старое имя спряталось в переменной", "The old name hides in a variable"],
            body: ["Допустим, программа умеет менять вызов picker.open() на picker.show(). Она исправит кнопку открытия календаря. А строка, где функция записана в переменную launch, под это правило не подходит. Когда TypeScript укажет на эту строку, повторный запуск её снова пропустит.", "Suppose the program rewrites picker.open() as picker.show(). It will fix the call behind an Open button. A line that stores the function in a variable called launch looks different. When TypeScript points to that line, another run will skip it again."],
            code: ["// Calendar.tsx · после замены\npicker.show();             // исправлено\nconst launch = picker.open; // осталось старое имя", "// Calendar.tsx · after the rewrite\npicker.show();             // updated\nconst launch = picker.open; // old name remains"]
          }
        ],
        lab: {
          prompt: ["В нашем проекте установлен date-fns v3. Выберите число запусков и посмотрите, какой путь окажется в Calendar.tsx.", "Our project has date-fns v3. Choose the number of runs and check which path ends up in Calendar.tsx."],
          states: [
            {
              label: ["До замены", "Before rewrite"],
              value: ["…/AdapterDateFnsV3", "…/AdapterDateFnsV3"],
              detail: ["Так календарь находил адаптер в Date Pickers v7. Файл ещё предстоит изменить для v8.", "This is how the calendar found its adapter in Date Pickers v7. The file still needs to change for v8."],
              tone: "neutral"
            },
            {
              label: ["Один запуск", "One run"],
              value: ["…/AdapterDateFns", "…/AdapterDateFns"],
              detail: ["Теперь путь подходит для Date Pickers v8 и установленной date-fns v3. Можно открыть календарь и выбрать день.", "The path now matches Date Pickers v8 and our installed date-fns v3. Open the picker and choose a day."],
              tone: "ok"
            },
            {
              label: ["Два запуска", "Two runs"],
              value: ["…/AdapterDateFnsV2", "…/AdapterDateFnsV2"],
              detail: ["Программа приняла новое имя за очередной случай для замены. Путь стал указывать на адаптер для date-fns v2.", "The program saw the new name as another match for its rules. The path now points to the adapter for date-fns v2."],
              tone: "bad"
            }
          ]
        },
        check: ["Посмотрите версию date-fns в проекте и путь импорта в Calendar.tsx. Запустите календарь, выберите дату мышью и введите другую вручную.", "Check the installed date-fns version and the import path in Calendar.tsx. Open the picker, choose a date with the mouse and type another date by hand."],
        sources: [
          {
            label: ["Миграция Date Pickers v7 → v8", "Date Pickers v7 → v8 migration"],
            url: "https://mui.com/x/migration/migration-pickers-v7/"
          }
        ],
        solutions: [
          {
            title: ["Вернуть путь после второго запуска", "Restore the path after the second run"],
            body: ["Если вы уже повторили замену, сравните Calendar.tsx с файлом после первого запуска. Для Date Pickers v8 с date-fns v3 восстановите правильный импорт. Затем проверьте остальные файлы, которые изменились при повторе.", "If the rewrite already ran twice, compare Calendar.tsx with its state after one run. Restore the correct import for Date Pickers v8 with date-fns v3. Inspect the other files touched by the second run too."],
            code: "import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';"
          },
          {
            title: ["Исправить пропущенную строку вручную", "Fix the missed line by hand"],
            body: ["Если TypeScript указывает на picker.open в переменной launch, исправьте именно это место. Для нового эксперимента с программой-заменой возьмите копию файлов, сделанную до первого запуска.", "If TypeScript points to picker.open in the launch variable, fix that reference directly. To try a different rewrite, start from a copy made before the first run."],
            code: "const launch = () => picker.show();"
          }
        ]
      }
    ]
  }
);
