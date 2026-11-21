globalThis.DepLoomBookChapters.push(
  {
    id: "replaying-installs",
    title: ["Как повторить установку", "How to repeat an install"],
    lessons: [
      {
        id: "lock-after-merge",
        title: ["После слияния в CI пропал пакет", "A package went missing after a merge"],
        lead: ["Аня добавила в приложение экспорт PDF, Борис — загрузку фотографий. После слияния в package.json остались оба изменения. Рядом лежит package-lock.json — список точных версий, которые должен поставить npm. Что произойдёт, если этот файл взяли только из ветки Ани?", "Anya added PDF export to an app. Boris added photo uploads. Both changes made it into package.json. Next to it is package-lock.json, the list of exact versions npm should install. What if the team took that file from Anya’s branch alone?"],
        examples: [
          {
            title: ["Два пакета в заявке, один в списке", "Two packages requested, one recorded"],
            body: ["Ане для PDF нужен pdfkit, Борису для картинок — sharp. В списке Ани sharp ещё не было. Сервер автоматической сборки (CI) запускает npm ci, сверяет файлы и останавливается ещё до сборки.", "Anya needs pdfkit for PDFs and Boris needs sharp for images. Anya’s list predates sharp. The build server (CI) runs npm ci, compares the two files and stops before the build starts."],
            code: ["// package.json после слияния, фрагмент\n\"dependencies\": { \"pdfkit\": \"0.15.0\", \"sharp\": \"0.33.5\" }\n// В package-lock.json из ветки Ани есть только pdfkit.", "// Excerpt from package.json after the merge\n\"dependencies\": { \"pdfkit\": \"0.15.0\", \"sharp\": \"0.33.5\" }\n// Anya’s package-lock.json only has pdfkit."]
          },
          {
            title: ["А если поправить цифру вручную?", "What if I edit the number by hand?"],
            body: ["Допустим, кто-то поменял у пакета только номер версии. Строкой ниже остался адрес прежнего архива. Теперь две строки об одном пакете противоречат друг другу.", "Suppose someone edited just the version number. One line below it, the download still points to the old release. The two lines now describe different packages."],
            code: ["// package-lock.json, учебный фрагмент с ошибкой\n\"version\": \"2.0.0\",\n\"resolved\": \"https://packages.example/parser-1.0.0.tgz\"", "// package-lock.json, example of a broken entry\n\"version\": \"2.0.0\",\n\"resolved\": \"https://packages.example/parser-1.0.0.tgz\""]
          }
        ],
        lab: {
          prompt: ["Какую версию файлов получит CI?", "Which files will CI get?"],
          states: [
            {
              label: ["Взяли lock Ани", "Anya’s lock"],
              value: ["npm ci не находит sharp", "npm ci cannot find sharp in the lock"],
              detail: ["В итоговом package.json есть sharp, а в списке Ани он отсутствует.", "The merged package.json asks for sharp, but Anya’s lock has no entry for it."],
              tone: "bad"
            },
            {
              label: ["Исправили у себя", "Fixed locally"],
              value: ["На сервере всё ещё ошибка", "The server still fails"],
              detail: ["npm install на ноутбуке дописал sharp. Разработчик ещё не отправил обновлённый файл в Git.", "npm install added sharp on the laptop. The developer hasn’t committed the updated file yet."],
              tone: "warn"
            },
            {
              label: ["Отправили оба файла", "Committed both files"],
              value: ["npm видит pdfkit и sharp", "npm finds pdfkit and sharp"],
              detail: ["Теперь CI получает оба файла с обоими пакетами. Можно переходить к сборке и проверить экспорт PDF и загрузку фото.", "CI now gets both files with both packages. The team can build the app and test PDF export and photo uploads."],
              tone: "ok"
            }
          ]
        },
        check: ["Откройте изменения package.json и package-lock.json рядом. Найдите каждый добавленный пакет в обоих файлах. Запустите npm ci в новой копии проекта из того же коммита, что и CI.", "Look at the changes to package.json and package-lock.json side by side. Find each added package in both files. Run npm ci in a fresh copy of the exact commit used by CI."],
        sources: [
          {
            label: ["npm · поведение npm ci", "npm · how npm ci works"],
            url: "https://docs.npmjs.com/cli/v11/commands/npm-ci/"
          },
          {
            label: ["npm · поля lock-файла", "npm · lockfile fields"],
            url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/"
          }
        ],
        solutions: [
          {
            title: ["Собрать список после слияния", "Rebuild the list after merging"],
            body: ["Сначала оставьте обе нужные зависимости в package.json. Затем обновите lock-файл той же версией npm, которой пользуется команда. Посмотрите изменения и отправьте оба файла вместе.", "First make sure package.json requests both dependencies. Update the lockfile using the team’s npm version, review what changed and commit both files together."],
            code: "npm install --package-lock-only\ngit diff -- package.json package-lock.json"
          }
        ],
        layout: {
          intro: ["Оба файла живут рядом и попадают в один коммит.", "Both files live together and go into the same commit."],
          paths: [
            {
              path: "app/",
              depth: 0,
              note: ["Приложение команды", "The team’s app"]
            },
            {
              path: "package.json",
              depth: 1,
              note: ["Какие библиотеки нужны для PDF и фото", "Which libraries the PDF and photo features need"]
            },
            {
              path: "package-lock.json",
              depth: 1,
              note: ["Какие точные версии выбрал npm", "The exact versions npm selected"]
            }
          ]
        }
      },
      {
        id: "lock-reselection",
        title: ["Удалили yarn.lock — почему сломался календарь?", "Why did deleting yarn.lock break the calendar?"],
        lead: ["Проект работал, пока разработчик не переустановил пакеты. Он удалил и папку node_modules, и файл yarn.lock. В папке лежали сами пакеты, в файле — выбранные для них версии. Теперь Yarn мог выбрать их заново.", "The project worked until a developer reinstalled its packages. They deleted node_modules and yarn.lock. The folder held the packages, and the file held their selected versions. Yarn was now free to choose those versions again."],
        examples: [
          {
            title: ["Календарь тот же, описание его типов изменилось", "Same calendar, different type definitions"],
            body: ["В отчёте DefinitelyTyped автор не обновлял код календаря. После переустановки TypeScript перестал принимать DatePicker в JSX. Одна из зависимостей разрешала любую версию типов React. Под это условие подошла новая версия 18, хотя в проекте ещё использовались старые типы.", "The DefinitelyTyped reporter hadn’t changed the calendar code. After reinstalling, TypeScript rejected DatePicker in JSX. A dependency allowed any version of React’s type definitions. The new version 18 qualified, even though the project still used older definitions."],
            code: ["// package.json одного из пакетов, условие из обсуждения\n\"@types/react\": \"*\"\n// При проверке проекта: TS2786 на компоненте DatePicker", "// A dependency’s package.json, as discussed in the issue\n\"@types/react\": \"*\"\n// Type-checking the app: TS2786 on DatePicker"]
          },
          {
            title: ["Генератор отчётов сам скачивает помощника", "The report generator needs a helper"],
            body: ["В учебном приложении генератор остался на 3.0.0. Но ему для чтения файлов нужен parser. Генератор разрешает любую версию parser от 2.1.0 до 3.0.0, не включая 3.0.0. Поэтому при новой установке его помощник может обновиться.", "In our example app the report generator stays at 3.0.0. It needs a helper called parser to read files. It accepts parser versions from 2.1.0 up to, but excluding, 3.0.0. A fresh install can therefore upgrade the helper."],
            code: ["// app/package.json\n\"report-generator\": \"3.0.0\"\n// report-generator/package.json\n\"parser\": \"^2.1.0\"", "// app/package.json\n\"report-generator\": \"3.0.0\"\n// report-generator/package.json\n\"parser\": \"^2.1.0\""]
          }
        ],
        lab: {
          prompt: ["В каталоге теперь есть parser 2.4.0. Какой parser получит генератор?", "The catalog now offers parser 2.4.0. Which one does the generator get?"],
          states: [
            {
              label: ["Оставить старый lock", "Keep the old lock"],
              value: ["parser@2.1.0", "parser@2.1.0"],
              detail: ["В файле уже выбрана 2.1.0, и она всё ещё подходит генератору.", "The file already selects 2.1.0, which still fits the generator’s request."],
              tone: "ok"
            },
            {
              label: ["Выбрать версии заново", "Resolve again"],
              value: ["parser@2.4.0", "parser@2.4.0"],
              detail: ["В нашем каталоге 2.4.0 — самая новая подходящая версия. Сам генератор по-прежнему 3.0.0.", "In our catalog, 2.4.0 is the newest version that fits. The generator is still at 3.0.0."],
              tone: "warn"
            }
          ]
        },
        check: ["Если ошибка появилась после переустановки, сравните старый и новый yarn.lock. В проекте на Yarn Classic команда yarn why @types/react поможет найти пакеты, которые запросили эти типы.", "If the error appeared after a reinstall, compare the old and new yarn.lock. In a Yarn Classic project, run yarn why @types/react to find which packages asked for those definitions."],
        sources: [
          {
            label: ["DefinitelyTyped · история с @types/react", "DefinitelyTyped · the @types/react report"],
            url: "https://github.com/DefinitelyTyped/DefinitelyTyped/issues/59802"
          }
        ],
        solutions: [
          {
            title: ["Вернуть рабочие версии", "Restore the working versions"],
            body: ["Если переустановка была случайной и package.json не менялся, верните yarn.lock из последнего рабочего коммита. В Yarn Classic повторите установку с --frozen-lockfile, чтобы он не выбрал версии заново.", "If the reinstall was accidental and package.json hasn’t changed, restore yarn.lock from the last working commit. With Yarn Classic, reinstall using --frozen-lockfile to keep the recorded versions."],
            code: "yarn install --frozen-lockfile"
          },
          {
            title: ["Обновить типы отдельно", "Upgrade the types separately"],
            body: ["Если новые типы нужны, найдите через yarn why библиотеку с требованием *. Проверьте, есть ли у неё выпуск с подходящими типами. Обновите её в отдельном изменении, где можно исправить и проверить календарь.", "If you do want the newer definitions, use yarn why to identify the library asking for *. Check for a release that uses compatible types. Upgrade that library in a separate change so you can fix and test the calendar."]
          }
        ]
      },
      {
        id: "npm-lock-reader",
        title: ["Почему npm отверг файл, который сам создал?", "Why did npm reject a file it just wrote?"],
        lead: ["Обычно npm install записывает версии, а npm ci повторяет установку по этому списку. В одном проекте вторая команда падала сразу после первой. Разгадка нашлась в версии самого npm.", "Usually npm install writes down the versions and npm ci repeats the install from that list. In one project the second command failed immediately after the first. The clue was the version of npm itself."],
        examples: [
          {
            title: ["Команда заменила версию trim-newlines", "The team asked npm to replace trim-newlines"],
            body: ["В отчёте npm/cli #4684 проект просил npm поставить более новую версию trim-newlines даже для пакета, который тянул старую. Для такой замены есть поле overrides. На npm 8.5.5 установка проходила. На 8.6 npm сообщил, что в его собственном файле не хватает старой версии.", "In npm/cli #4684 the project asked npm to install a newer trim-newlines even for a package that requested the old one. The overrides field expresses that replacement. npm 8.5.5 installed it. With 8.6, npm complained that the old version was missing from its own lockfile."],
            code: ["// package.json, фрагмент из отчёта\n\"overrides\": { \"trim-newlines\": \"^3.0.1\" }\n// npm ci: Missing: trim-newlines@1.0.0 from lock file", "// package.json, excerpt from the report\n\"overrides\": { \"trim-newlines\": \"^3.0.1\" }\n// npm ci: Missing: trim-newlines@1.0.0 from lock file"]
          },
          {
            title: ["Изменились строки или сами пакеты?", "Did the formatting change, or the packages?"],
            body: ["После обновления npm файл иногда сильно меняется. В учебном фрагменте изменился номер формата списка. Это ещё не говорит, что поменялась версия какой-нибудь библиотеки. Посмотрите строки version у самих пакетов и адреса их архивов.", "After an npm upgrade the lockfile can look very different. This example changes its file format number. That alone tells you nothing about whether a library was upgraded. Inspect the versions and download URLs of the individual packages."],
            code: ["// git diff -- package-lock.json\n-  \"lockfileVersion\": 2,\n+  \"lockfileVersion\": 3,", "// git diff -- package-lock.json\n-  \"lockfileVersion\": 2,\n+  \"lockfileVersion\": 3,"]
          }
        ],
        lab: {
          prompt: ["Что увидел автор отчёта на каждом шаге?", "What did the reporter see at each step?"],
          states: [
            {
              label: ["npm 8.5.5", "npm 8.5.5"],
              value: ["npm ci проходит", "npm ci passes"],
              detail: ["npm поставил версию, которую просила команда.", "npm installed the version the team requested."],
              tone: "ok"
            },
            {
              label: ["npm 8.6", "npm 8.6"],
              value: ["Требуется trim-newlines@1.0.0", "Missing trim-newlines@1.0.0"],
              detail: ["Сразу после npm install команда npm ci пожаловалась на lock-файл.", "Right after npm install, npm ci complained about the lockfile."],
              tone: "bad"
            },
            {
              label: ["Повторить install", "Run install again"],
              value: ["Установка прошла, замена исчезла", "Install passed, replacement disappeared"],
              detail: ["Автор снова запустил npm install. Ошибка исчезла, но в файле уже не была закреплена нужная замена. Позже разработчик npm сообщил об исправлении ошибки.", "The reporter ran npm install again. The error disappeared, but the lock no longer kept the intended replacement. An npm maintainer later reported a fix."],
              tone: "warn"
            }
          ]
        },
        check: ["Запишите вывод npm --version. После установки вызовите npm ls trim-newlines и проверьте, какая версия стоит под пакетом, для которого делали замену.", "Record npm --version. After installation, use npm ls trim-newlines to see which version sits under the package you meant to fix."],
        sources: [
          {
            label: ["npm/cli #4684 · overrides и lock", "npm/cli #4684 · overrides and the lockfile"],
            url: "https://github.com/npm/cli/issues/4684"
          }
        ],
        solutions: [
          {
            title: ["Использовать одну проверенную версию npm", "Use one tested npm version"],
            body: ["Если проблема появилась при переходе на другую версию npm, возьмите версию с исправлением и на ноутбуке, и в CI. Пересоздайте lock этой версией в отдельной копии проекта. Перед отправкой проверьте, осталась ли нужная замена.", "If the failure arrived with a change of npm version, use a release containing the fix on both the laptop and CI. Rebuild the lock with that version in a separate copy, then check whether the intended replacement survived."],
            code: "npm --version\nnpm install --package-lock-only\nnpm ci\nnpm ls trim-newlines"
          }
        ]
      },
      {
        id: "peer-install-mode",
        title: ["Почему дома ставится, а в CI — ERESOLVE?", "Why does it install locally but fail in CI?"],
        lead: ["Приложение на NestJS ходит в Elasticsearch. Для этого в нём две библиотеки. Одна отправляет запросы, другая подключает её к NestJS. Вторая указывает, с какими версиями первой умеет работать. Это условие npm называет peer dependency.", "A NestJS app talks to Elasticsearch using two libraries. One sends requests. The other connects it to NestJS. The connector says which versions of the first library it supports. npm calls this a peer dependency."],
        examples: [
          {
            title: ["Приложение попросило версию 5, а модулю нужна 7 или 8", "The app asks for 5, the connector needs 7 or 8"],
            body: ["В отчёте npm/cli #4998 приложение выбрало клиент 5.6.22. Модуль NestJS 8.1.0 принимал клиент 7-й ветки начиная с 7.4.0 или клиент 8-й ветки. Локально разработчик выключил эту проверку. В CI она была включена, поэтому npm остановился с ERESOLVE.", "In npm/cli #4998 the app selected client 5.6.22. The NestJS connector at 8.1.0 supported major 7 starting at 7.4.0, or major 8. The developer disabled this check locally. CI kept it enabled, so npm stopped with ERESOLVE."],
            code: ["// app/package.json\n\"@elastic/elasticsearch\": \"5.6.22\"\n// @nestjs/elasticsearch/package.json → peerDependencies\n\"@elastic/elasticsearch\": \"^7.4.0 || ^8.0.0\"", "// app/package.json\n\"@elastic/elasticsearch\": \"5.6.22\"\n// @nestjs/elasticsearch/package.json → peerDependencies\n\"@elastic/elasticsearch\": \"^7.4.0 || ^8.0.0\""]
          },
          {
            title: ["Одна и та же команда читает разные настройки", "The same command reads different settings"],
            body: ["Даже если оба запускают npm ci, npm может читать ещё и личные настройки. В учебном примере только на ноутбуке в домашней папке лежит .npmrc со строкой ниже. На сервере другой пользователь и другой домашний каталог.", "Even if both run npm ci, npm can also read personal settings. In this example only the laptop has the line below in its user’s home directory. The build server runs under a different account with its own home directory."],
            code: ["# ~/.npmrc на ноутбуке\nlegacy-peer-deps=true\n# Узнать, что видит npm в текущем проекте\nnpm config get legacy-peer-deps", "# ~/.npmrc on the laptop\nlegacy-peer-deps=true\n# Check what npm sees in the current project\nnpm config get legacy-peer-deps"]
          }
        ],
        lab: {
          prompt: ["Клиент всё ещё 5.6.22. Что скажет npm?", "The client is still 5.6.22. What does npm say?"],
          states: [
            {
              label: ["С проверкой версий", "Check versions"],
              value: ["ERESOLVE", "ERESOLVE"],
              detail: ["Модуль просит 7.4.0 или новее в ветке 7 либо версию из ветки 8. Выбранная версия 5 не подходит.", "The connector accepts 7.4.0 or later in major 7, or a version in major 8. Version 5 falls outside both."],
              tone: "bad"
            },
            {
              label: ["С --legacy-peer-deps", "With --legacy-peer-deps"],
              value: ["npm пропустил проверку", "npm skipped the check"],
              detail: ["Клиент остался на 5.6.22. Пройдёт ли настоящий запрос к Elasticsearch, пока неизвестно.", "The client is still 5.6.22. We have yet to see whether a real Elasticsearch request works."],
              tone: "warn"
            }
          ]
        },
        check: ["На ноутбуке и в CI сравните npm --version и npm config get legacy-peer-deps. После смены клиента запустите приложение и сделайте запрос к тестовому Elasticsearch.", "Compare npm --version and npm config get legacy-peer-deps on the laptop and in CI. After changing the client, start the app and send a request to a test Elasticsearch server."],
        sources: [
          {
            label: ["npm/cli #4998 · воспроизведение", "npm/cli #4998 · reproduction"],
            url: "https://github.com/npm/cli/issues/4998"
          },
          {
            label: ["npm · параметры установки", "npm · install configuration"],
            url: "https://docs.npmjs.com/cli/v11/using-npm/config/"
          }
        ],
        solutions: [
          {
            title: ["Подобрать клиент для этого модуля", "Pick a client supported by the connector"],
            body: ["Если сервер Elasticsearch поддерживает более новый клиент, выберите в package.json приложения версию клиента, которую принимает и модуль NestJS. Обновите lock-файл и попробуйте обычный npm ci.", "If your Elasticsearch server supports a newer client, choose a client version in the app’s package.json that the NestJS connector also accepts. Update the lockfile and try a normal npm ci."]
          },
          {
            title: ["Оставить старый клиент", "Keep the older client"],
            body: ["Если клиент 5.6.22 нужен для старого сервера, ищите версию модуля NestJS, в чьём package.json поле peerDependencies разрешает этот клиент. Если такой версии нет, потребуется изменить сам способ подключения.", "If the older server requires client 5.6.22, look for a NestJS connector whose package.json allows that client under peerDependencies. If none does, the app needs a different way to connect."]
          }
        ],
        layout: {
          intro: ["Одинаковая папка проекта может находиться у разных пользователей. npm читает и настройки проекта, и настройки пользователя.", "The same project can run under different accounts. npm reads both project and user settings."],
          paths: [
            {
              path: "~/",
              depth: 0,
              note: ["Домашняя папка разработчика на ноутбуке", "The developer’s home folder on the laptop"]
            },
            {
              path: ".npmrc",
              depth: 1,
              note: ["Здесь npm разрешили пропустить проверку версии клиента Elasticsearch", "This tells npm to skip the Elasticsearch client version check"]
            },
            {
              path: "app/",
              depth: 1,
              note: ["Копию этой папки из Git получит CI", "CI gets a copy of this folder from Git"]
            },
            {
              path: "package-lock.json",
              depth: 2,
              note: ["Общий файл команды с выбранными версиями", "The team’s shared list of selected versions"]
            }
          ]
        }
      },
      {
        id: "install-omissions",
        title: ["Куда делся Vite во время сборки?", "Where did Vite go during the build?"],
        lead: ["В package.json Vite есть, а на сервере команда сборки пишет, что не может его найти. Посмотрите на предыдущую команду. У npm можно попросить установить только то, что нужно уже готовому приложению.", "Vite is listed in package.json, yet the build server says it cannot find it. Check the command just before the build. npm can be told to install only what the finished app needs."],
        examples: [
          {
            title: ["Сначала пропустили Vite, потом попытались его вызвать", "Skipping Vite and then trying to run it"],
            body: ["В этом проекте Vite лежит в devDependencies — это инструменты для разработки и сборки. Параметр --omit=dev пропускает их. Следующая команда запускает сборку, но файла vite на диске уже нет.", "This project lists Vite in devDependencies, the tools it uses during development and build. --omit=dev skips those tools. The next command runs the build, but there’s no vite executable on disk."],
            code: ["// package.json\n\"scripts\": { \"build\": \"vite build\" },\n\"devDependencies\": { \"vite\": \"^5.0.0\" }\n# В CI: npm ci --omit=dev, затем npm run build", "// package.json\n\"scripts\": { \"build\": \"vite build\" },\n\"devDependencies\": { \"vite\": \"^5.0.0\" }\n# CI runs npm ci --omit=dev, then npm run build"]
          },
          {
            title: ["Папка пакета есть, а файла внутри нет", "The package exists, but one of its files doesn’t"],
            body: ["Другой учебный пакет после распаковки запускает команду postinstall. Она создаёт описание типов для TypeScript. Если отключить такие команды через --ignore-scripts, пакет распакуется, но файл так и не появится.", "Another example package runs a postinstall command after unpacking. It creates a type definition for TypeScript. With --ignore-scripts, npm unpacks the package but never creates that file."],
            code: ["// schema-kit/package.json\n\"scripts\": { \"postinstall\": \"node generate-types.js\" }\n// generate-types.js создаёт generated/schema.d.ts", "// schema-kit/package.json\n\"scripts\": { \"postinstall\": \"node generate-types.js\" }\n// generate-types.js writes generated/schema.d.ts"]
          }
        ],
        lab: {
          prompt: ["Для сборки нужны и Vite, и файл типов. Какую команду запустил сервер?", "The build needs both Vite and the type file. Which command did the server run?"],
          states: [
            {
              label: ["npm ci", "npm ci"],
              value: ["Оба файла на месте", "Both files present"],
              detail: ["Здесь сервер ставит инструменты разработки и разрешает пакету создать файл типов.", "Here the server installs development tools and lets the package generate its type file."],
              tone: "ok"
            },
            {
              label: ["--omit=dev", "--omit=dev"],
              value: ["Нет команды vite", "vite command missing"],
              detail: ["Пакет создал файл типов, но сервер пропустил весь раздел с инструментами сборки.", "The package created the type file, but the server skipped all development tools."],
              tone: "bad"
            },
            {
              label: ["--ignore-scripts", "--ignore-scripts"],
              value: ["Нет schema.d.ts", "schema.d.ts missing"],
              detail: ["Vite установлен. У пакета schema-kit не запустилась команда, которая пишет файл.", "Vite is installed. The command that writes the file inside schema-kit never ran."],
              tone: "bad"
            }
          ]
        },
        check: ["Повторите команды CI в том же порядке в новой копии проекта. Проверьте, что npm run build находит Vite и что внутри schema-kit появился generated/schema.d.ts.", "Repeat the CI commands in the same order in a fresh copy of the project. Check that npm run build finds Vite and that generated/schema.d.ts exists inside schema-kit."],
        sources: [
          {
            label: ["npm · omit и ignore-scripts", "npm · omit and ignore-scripts"],
            url: "https://docs.npmjs.com/cli/v11/commands/npm-ci/"
          }
        ],
        solutions: [
          {
            title: ["Оставить Vite до конца сборки", "Keep Vite until the build finishes"],
            body: ["На шаге сборки установите и инструменты разработки. В итоговый образ можно забрать уже собранные файлы и отдельно оставить там только пакеты, нужные для запуска.", "Install development tools during the build. The final image can take the built files and only the packages needed to run them."],
            code: "npm ci --include=dev\nnpm run build"
          },
          {
            title: ["Доставить готовый файл типов", "Ship the generated type file"],
            body: ["Если библиотека ваша, создайте schema.d.ts при сборке самой библиотеки и включите его в пакет. Если на сервере разрешён только явно заданный шаг генерации, добавьте этот шаг перед проверкой TypeScript.", "If you own the library, generate schema.d.ts when building it and include the file in the package. If your server allows only an explicit generation step, add that step before TypeScript runs."]
          }
        ],
        layout: {
          intro: ["После npm ci посмотрите, какой именно файл понадобился следующей команде.", "After npm ci, check which exact file the next command needs."],
          paths: [
            {
              path: "node_modules/",
              depth: 0,
              note: ["Сюда npm устанавливает пакеты", "Where npm installs the packages"]
            },
            {
              path: ".bin/vite",
              depth: 1,
              note: ["Команда сборки появляется вместе с Vite", "The build command comes with Vite"]
            },
            {
              path: "schema-kit/",
              depth: 1,
              note: ["Другой пакет, создающий типы", "A separate package that creates types"]
            },
            {
              path: "generated/schema.d.ts",
              depth: 2,
              note: ["Появляется только после запуска генератора", "Created only after the generator runs"]
            }
          ]
        }
      }
    ]
  },
  {
    id: "across-environments",
    title: ["Почему у коллеги всё иначе?", "Why is it different on my colleague’s machine?"],
    lessons: [
      {
        id: "rollup-platform",
        title: ["На Mac Rollup работает. Чего не хватает на Linux?", "Rollup runs on a Mac. What’s missing on Linux?"],
        lead: ["У сборщика Rollup есть часть, написанная специально под конкретную систему и процессор. На Mac с чипом Apple он загружает один пакет, на Linux с процессором x64 — другой. Можно прислать коллеге правильный код и всё равно забыть нужную ему версию этой части.", "Part of the Rollup build tool is compiled for a particular operating system and processor. An Apple Silicon Mac loads one package and x64 Linux loads another. You can send a colleague all the right source code and still leave out the part their machine needs."],
        examples: [
          {
            title: ["В общем списке остался только вариант автора", "The shared list kept only the author’s version"],
            body: ["В отчёте npm/cli #7961 автор на npm 10.9.2 увидел в новом package-lock.json 18 вариантов Rollup. Потом создал этот файл заново, оставив готовую папку node_modules на месте. В списке остался один вариант для его машины. Для другой машины нужный пакет мог исчезнуть из списка.", "In npm/cli #7961 the reporter used npm 10.9.2 and saw 18 Rollup variants in a fresh package-lock.json. Then they recreated that file while keeping the existing node_modules directory. Only their own platform’s variant remained listed. Another machine’s required package could disappear from the list."],
            code: ["// package-lock.json, примеры путей\nnode_modules/@rollup/rollup-darwin-arm64\nnode_modules/@rollup/rollup-linux-x64-gnu", "// Example paths in package-lock.json\nnode_modules/@rollup/rollup-darwin-arm64\nnode_modules/@rollup/rollup-linux-x64-gnu"]
          },
          {
            title: ["Даже у двух Linux может быть разный Rollup", "Two Linux systems can need different Rollup builds"],
            body: ["В Debian программы обычно используют системную библиотеку glibc, в Alpine — musl. При одинаковом процессоре Rollup для них тоже разный. Если скопировать готовую папку node_modules из Debian в Alpine, в копии может оказаться только вариант для Debian.", "On Debian, programs usually use a system library called glibc. Alpine uses musl. Rollup needs different builds even with the same CPU. Copying a ready-made node_modules folder from Debian to Alpine can leave only the Debian build in the copy."],
            code: ["Debian x64  →  @rollup/rollup-linux-x64-gnu\nAlpine x64  →  @rollup/rollup-linux-x64-musl", "Debian x64  →  @rollup/rollup-linux-x64-gnu\nAlpine x64  →  @rollup/rollup-linux-x64-musl"]
          }
        ],
        lab: {
          prompt: ["В списке есть только варианты для Mac ARM64 и Debian x64. Выберите, где запускают сборку.", "The list has only the Mac ARM64 and Debian x64 builds. Choose a machine."],
          states: [
            {
              label: ["Mac ARM64", "Mac ARM64"],
              value: ["Нужный пакет есть", "Required package listed"],
              detail: ["Rollup ищет rollup-darwin-arm64. Он есть в нашем списке.", "Rollup looks for rollup-darwin-arm64. Our list includes it."],
              tone: "ok"
            },
            {
              label: ["Debian x64", "Debian x64"],
              value: ["Нужный пакет есть", "Required package listed"],
              detail: ["Этой машине нужен rollup-linux-x64-gnu. Он тоже указан.", "This machine needs rollup-linux-x64-gnu. That one is listed too."],
              tone: "ok"
            },
            {
              label: ["Alpine x64", "Alpine x64"],
              value: ["Не хватает варианта musl", "musl variant missing"],
              detail: ["Этой машине нужен rollup-linux-x64-musl. Пакет Debian ей не подойдёт.", "This machine needs rollup-linux-x64-musl. The Debian package won’t work here."],
              tone: "bad"
            }
          ]
        },
        check: ["Проверьте по очереди те машины, на которых будет собираться приложение. На каждой в новой копии проекта выполните npm ci, затем обычную команду сборки.", "Test each machine that will actually build the app. On each one, run npm ci in a fresh copy of the project, followed by its usual build command."],
        sources: [
          {
            label: ["npm/cli #7961 · опыт с Rollup", "npm/cli #7961 · the Rollup experiment"],
            url: "https://github.com/npm/cli/issues/7961"
          }
        ],
        solutions: [
          {
            title: ["Вернуть в lock варианты всех систем", "Restore the variants for every target system"],
            body: ["Возьмите исправленную версию npm и обновите package-lock.json в свежей копии проекта без старой папки node_modules. Перед отправкой найдите в файле нужные варианты @rollup для машин команды.", "Use a version of npm containing the fix and update package-lock.json in a fresh project copy with no existing node_modules. Before committing, look for the @rollup variants needed by the team’s machines."]
          },
          {
            title: ["Устанавливать пакеты внутри образа", "Install packages inside the target image"],
            body: ["Если пропала только Linux-сборка, перестаньте переносить готовый node_modules с Mac или из другого Linux. Запускайте npm ci внутри того образа Debian или Alpine, в котором пойдёт сборка.", "If only the Linux build is missing, stop copying node_modules from a Mac or another Linux image. Run npm ci inside the Debian or Alpine image that actually performs the build."]
          }
        ]
      },
      {
        id: "consumer-tarball",
        title: ["У автора библиотека работает. Что получит коллега?", "It works for the library author. What does a colleague get?"],
        lead: ["Допустим, вы пишете библиотеку ui-kit с кнопкой, а коллега делает интернет-магазин shop и берёт вашу кнопку. У вас два проекта, у каждого свой package.json. У вас на диске все исходники кнопки. Коллега получит только файлы, которые вы упакуете.", "Say you write a library called ui-kit with a button. A colleague uses that button in an online shop called shop. You have two projects with separate package.json files. All the button’s source files live on your disk. Your colleague gets only what you put in the package."],
        examples: [
          {
            title: ["Чьи настройки читает npm?", "Whose settings does npm read?"],
            body: ["В реальном отчёте автор библиотеки использовал axios и модуль aws4-axios. В своём package.json он добавил overrides — просьбу к npm заменить версию, которую тянет другой пакет. В библиотеке это помогло. Когда автор установил её в отдельное тестовое приложение, npm взял настройки из package.json приложения. Старый конфликт вернулся.", "In a real report, a library author used axios and a module called aws4-axios. They added an overrides rule in their own package.json to replace a version pulled in by another package. That worked inside the library. But when the author installed it in a separate test app, npm read its settings from the app’s package.json. The old conflict returned."],
            code: ["# Проверка правила в двух папках (пример)\ncd ui-kit\nnpm ls axios\ncd ../shop\nnpm ls axios", "# Compare the rule in two folders (example)\ncd ui-kit\nnpm ls axios\ncd ../shop\nnpm ls axios"]
          },
          {
            title: ["Типы кнопки остались на компьютере автора", "The button’s type file stayed on the author’s computer"],
            body: ["В нашем примере поле types обещает TypeScript файл dist/index.d.ts. А поле files велит npm положить в архив только dist/index.js. Если магазин открыл папку ui-kit напрямую, файл типов виден. Если магазин установил архив, открыть этот файл уже негде.", "In our example the types field points TypeScript to dist/index.d.ts, while files tells npm to pack only dist/index.js. A shop linked directly to the ui-kit folder can see the type file. A shop that installs the archive has no such file to open."],
            code: ["// ui-kit/package.json\n\"types\": \"dist/index.d.ts\",\n\"files\": [\"dist/index.js\"]", "// ui-kit/package.json\n\"types\": \"dist/index.d.ts\",\n\"files\": [\"dist/index.js\"]"]
          }
        ],
        lab: {
          prompt: ["Коллега открывает проект магазина. Где его TypeScript будет искать описание кнопки?", "Your colleague opens the shop project. Where will its TypeScript look for the button’s types?"],
          states: [
            {
              label: ["Папка автора", "Author’s folder"],
              value: ["dist/index.d.ts найден", "dist/index.d.ts found"],
              detail: ["Магазин подключил библиотеку ссылкой на её папку. Там видны оба файла сборки.", "The shop links to the library directory, where both build outputs exist."],
              tone: "ok"
            },
            {
              label: ["Первый архив", "First archive"],
              value: ["dist/index.d.ts отсутствует", "dist/index.d.ts missing"],
              detail: ["В архив попал только JavaScript. В магазине код кнопки есть, а описание её типов не приехало.", "Only JavaScript went into the archive. The shop has the button code but none of its type declarations."],
              tone: "bad"
            },
            {
              label: ["Добавить типы в архив", "Include types in the archive"],
              value: ["dist/index.d.ts найден", "dist/index.d.ts found"],
              detail: ["Автор вложил и .js, и .d.ts. Теперь у коллеги есть оба файла из примера.", "The author included both the .js and the .d.ts. The colleague now has both files from the example."],
              tone: "ok"
            }
          ]
        },
        check: ["В папке библиотеки вызовите npm pack --dry-run и найдите dist/index.d.ts. Затем выполните npm pack, установите полученный .tgz в пустой проект и попробуйте импортировать кнопку и проверить типы.", "Run npm pack --dry-run in the library folder and look for dist/index.d.ts. Then run npm pack, install the resulting .tgz in an empty project and try importing and type-checking the button."],
        sources: [
          {
            label: ["npm #975 · библиотека в другом приложении", "npm #975 · installing the library in another app"],
            url: "https://github.com/npm/documentation/issues/975"
          },
          {
            label: ["npm · область действия overrides", "npm · override scope"],
            url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides"
          },
          {
            label: ["npm · упаковка библиотеки", "npm · packing a library"],
            url: "https://docs.npmjs.com/cli/v11/commands/npm-pack/"
          }
        ],
        solutions: [
          {
            title: ["Положить типы рядом с кодом кнопки", "Pack the button’s types with its code"],
            body: ["В package.json библиотеки включите в files папку dist, если оба готовых файла лежат в ней. Пересоберите библиотеку и архив перед установкой в shop.", "Include the dist directory in the library’s files list if both build outputs live there. Rebuild the library and its package before installing it in shop."],
            code: "// ui-kit/package.json\n\"types\": \"dist/index.d.ts\",\n\"files\": [\"dist/\"]"
          },
          {
            title: ["Исправить версию там, где ставят пакеты", "Set the version where installation happens"],
            body: ["Для долгого исправления автор может выбрать совместимые версии axios и aws4-axios в библиотеке и выпустить её заново. Если магазин временно вынужден применять своё правило overrides, оно должно лежать в shop/package.json. Если оба проекта лежат в одном Git-репозитории (монорепозитории) и npm install запускают из их общей папки, это правило кладут в package.json общей папки.", "For a lasting fix, the library author can choose compatible axios and aws4-axios versions and ship a new release. If the shop must apply a temporary overrides rule, it belongs in shop/package.json. If both projects share one Git repository (a monorepo) and npm install runs from their common root, put the rule in that root package.json."]
          }
        ],
        layout: {
          intro: ["Два проекта могут лежать рядом у одного разработчика. Команда npm install читает настройки того проекта, в котором её запустили.", "The two projects can sit side by side on one laptop. npm install uses the settings of the project where you run it."],
          paths: [
            {
              path: "ui-kit/",
              depth: 0,
              note: ["Здесь автор пишет библиотеку с кнопкой", "The author writes the button library here"]
            },
            {
              path: "package.json",
              depth: 1,
              note: ["Что нужно самой библиотеке и какие файлы упаковать", "What the library needs and which files to pack"]
            },
            {
              path: "dist/",
              depth: 1,
              note: ["Готовые index.js и index.d.ts", "The built index.js and index.d.ts"]
            },
            {
              path: "shop/",
              depth: 0,
              note: ["Здесь коллега делает интернет-магазин", "The colleague builds the shop here"]
            },
            {
              path: "package.json",
              depth: 1,
              note: ["Именно здесь магазин просит установить ui-kit", "The shop asks npm for ui-kit here"]
            },
            {
              path: "node_modules/ui-kit/",
              depth: 1,
              note: ["Сюда распакуется то, что прислал автор", "Only what the author packed is installed here"]
            }
          ]
        }
      },
      {
        id: "registry-view",
        title: ["Где npm ищет новую версию?", "Where is npm looking for the new version?"],
        lead: ["Коллега видит новую версию пакета в браузере, а у вас npm её не находит. Возможно, вы смотрите в разные каталоги. Адрес сервера, у которого npm спрашивает о пакетах, задаёт настройка registry.", "Your colleague can see a new release in a browser, but npm can’t find it on your machine. You might be looking at different catalogs. The registry setting tells npm which server to ask about packages."],
        examples: [
          {
            title: ["Для пакетов @studio указан другой сервер", "Packages under @studio go to a different server"],
            body: ["В учебном проекте обычные пакеты скачивают с публичного npm. Для пакетов с именем, которое начинается на @studio/, в файле .npmrc указан сервер команды. Если на нём нет @studio/theme, npm может вернуть E404, даже если пакет виден где-то ещё.", "Our example gets most packages from the public npm registry. For names beginning with @studio/, the project’s .npmrc points to the team’s server. If @studio/theme is missing there, npm may return E404 even if it’s listed somewhere else."],
            code: ["# .npmrc\nregistry=https://registry.npmjs.org/\n@studio:registry=https://packages.example/", "# .npmrc\nregistry=https://registry.npmjs.org/\n@studio:registry=https://packages.example/"]
          },
          {
            title: ["Ноутбук заглянул во вчерашний список", "The laptop opened yesterday’s list"],
            body: ["Вчера сервер команды перечислял версии до 2.1.0. Сегодня на нём появилась 2.2.0. Если ноутбук читает сохранённый вчера ответ, он покажет старый список. Такой список в кеше и реальное отставание сервера — две разные причины одного результата.", "Yesterday the team server listed releases up to 2.1.0. Today it has 2.2.0. A laptop reading yesterday’s saved response still shows the old list. An old local response and a server that really is behind can look identical."],
            code: ["# Из папки проекта, где лежит .npmrc\nnpm config get @studio:registry\nnpm view @studio/theme versions --json --prefer-online", "# From the project folder containing .npmrc\nnpm config get @studio:registry\nnpm view @studio/theme versions --json --prefer-online"]
          }
        ],
        lab: {
          prompt: ["Где вы ищете @studio/theme 2.2.0?", "Where are you looking for @studio/theme 2.2.0?"],
          states: [
            {
              label: ["На ноутбуке, из кеша", "Laptop cache"],
              value: ["Показана только 2.1.0", "Only 2.1.0 is listed"],
              detail: ["Это список, который ноутбук сохранил вчера. Чтобы узнать, что доступно сейчас, нужен свежий ответ сервера.", "This list was saved to the laptop yesterday. You need a fresh server response to see what is available today."],
              tone: "warn"
            },
            {
              label: ["На другом сервере", "Another server"],
              value: ["E404", "E404"],
              detail: ["Этот сервер пакет по такому имени не отдал. Загляните в .npmrc и проверьте адрес для @studio.", "This server didn’t return a package with that name. Check the @studio address in .npmrc."],
              tone: "warn"
            },
            {
              label: ["На сервере команды", "Team server"],
              value: ["2.2.0 есть в списке", "2.2.0 is listed"],
              detail: ["Сервер подтвердил, что знает о версии. Теперь можно проверить, скачивается ли архив.", "The server confirms it knows the release. You can now check whether its archive downloads."],
              tone: "ok"
            }
          ]
        },
        check: ["Сравните адрес из npm config get @studio:registry на обеих машинах. Запросите список версий у нужного сервера и проверьте точное имя пакета и доступ к нему.", "Compare npm config get @studio:registry on both machines. Ask the intended server for its version list and check the package’s spelling and your access to it."],
        sources: [
          {
            label: ["npm · как выбрать сервер по имени пакета", "npm · sending a group of packages to its own registry"],
            url: "https://docs.npmjs.com/cli/v11/using-npm/scope/"
          }
        ],
        solutions: [
          {
            title: ["Исправить адрес для @studio", "Set the right address for @studio"],
            body: ["Если запрос уходит не туда, исправьте строку @studio:registry в .npmrc проекта. Возьмите адрес сервера команды. Только пакеты с этим началом имени пойдут на него.", "If requests go to the wrong place, correct @studio:registry in the project’s .npmrc to the address supplied by your team. Only names starting with @studio/ will go there."]
          },
          {
            title: ["Обновить список с нужного сервера", "Refresh the list from the intended server"],
            body: ["Если адрес верный, запросите список с --prefer-online. Если сервер команды ещё не получил 2.2.0, дождитесь синхронизации или попросите ответственного за сервер проверить её. Чистка кеша на ноутбуке не добавит версию на сервер.", "If the address is correct, request the list with --prefer-online. If the team server still lacks 2.2.0, wait for it to sync or ask its owner to check. Clearing the laptop cache cannot add a release to the server."]
          }
        ],
        layout: {
          intro: ["За адресом сервера смотрят в настройки проекта, за именем пакета — в список его зависимостей.", "The project settings give you the server address. The dependency list gives you the package name."],
          paths: [
            {
              path: "shop/",
              depth: 0,
              note: ["Проект магазина", "Shop project"]
            },
            {
              path: "package.json",
              depth: 1,
              note: ["Магазину нужен пакет @studio/theme", "The shop requests @studio/theme"]
            },
            {
              path: ".npmrc",
              depth: 1,
              note: ["Здесь указано, где искать имена с @studio/", "Where to look for names starting with @studio/"]
            }
          ]
        }
      },
      {
        id: "registry-artifact",
        title: ["Версию нашли. Почему архив не скачивается?", "The release is listed. Why won’t it download?"],
        lead: ["На странице каталога есть номер версии и адрес файла. npm ещё нужно получить по этому адресу сам архив и убедиться, что внутри ожидаемое содержимое. Вот два случая, когда одного номера недостаточно.", "A catalog page gives you a version and a file address. npm still has to fetch that archive and check its contents. Here are two cases where the version number alone doesn’t get you a working install."],
        examples: [
          {
            title: ["Пакет left-pad вернули под другим номером", "A replacement for left-pad had a different version"],
            body: ["В 2016 году автор убрал left-pad из npm. Другой разработчик выложил версию 1.0.0 с тем же назначением. Но библиотека line-numbers просила ровно 0.0.3. Чтобы её снова можно было установить, npm вернул исходную 0.0.3 из резервной копии. Это было ещё до появления package-lock.json.", "In 2016 the author removed left-pad from npm. Another developer published 1.0.0 to do the same job. But a library called line-numbers asked for exactly 0.0.3. npm restored the original 0.0.3 from a backup so installs could work again. This happened before package-lock.json existed."],
            code: ["// line-numbers/package.json, требование к версии\n\"left-pad\": \"0.0.3\"", "// line-numbers/package.json, version requirement\n\"left-pad\": \"0.0.3\""]
          },
          {
            title: ["У коллеги уже есть копия, у нового сервера сборки — нет", "The laptop has a copy and the new build server doesn’t"],
            body: ["В учебном примере npm на ноутбуке берёт архив из кеша и успешно ставит пакет. Новый сервер просит файл по тому же адресу и получает 404. Если файл по адресу есть, но содержимое другое, npm сравнит его с контрольной суммой из поля integrity в package-lock.json и сообщит EINTEGRITY.", "In our example the laptop installs successfully from its cached archive. The new build server requests the same file and gets a 404. If a file is available but its contents differ, npm compares it with the digest in the lockfile’s integrity field and reports EINTEGRITY."],
            code: ["# Путь к архиву в каталоге пакетов\nnpm view left-pad@0.0.3 dist.tarball\n# Повторить установку проекта с новым кешем\nnpm ci --cache ./new-npm-cache", "# Look up the package’s download address\nnpm view left-pad@0.0.3 dist.tarball\n# Reinstall the project using a fresh cache directory\nnpm ci --cache ./new-npm-cache"]
          }
        ],
        lab: {
          prompt: ["Адрес архива известен. Откуда npm возьмёт файл?", "npm knows the download address. Where will it get the file?"],
          states: [
            {
              label: ["Из кеша на ноутбуке", "Laptop cache"],
              value: ["Пакет установлен", "Package installed"],
              detail: ["В кеше нашлась нужная копия. За файлом по сети npm в этом примере не ходил.", "The cache already had the right copy. This particular install didn’t need a network download."],
              tone: "ok"
            },
            {
              label: ["С сервера, ответ 404", "Server returns 404"],
              value: ["Скачивать нечего", "No file to download"],
              detail: ["Номер версии есть в списке, а по адресу архива сервер файл не отдал.", "The release appears in the list, but the server didn’t return the archive."],
              tone: "bad"
            },
            {
              label: ["С сервера, файл изменён", "Server sends a changed file"],
              value: ["EINTEGRITY", "EINTEGRITY"],
              detail: ["Содержимое не совпало с ожидаемой контрольной суммой. npm не сможет использовать этот файл, пока расхождение остаётся.", "The contents do not match the expected digest. npm cannot use this file while that mismatch remains."],
              tone: "bad"
            }
          ]
        },
        check: ["Создайте отдельную пустую папку для кеша и повторите установку с тем же package-lock.json и тем же сервером пакетов. Так старая локальная копия не замаскирует пропавший или изменившийся архив.", "Use a fresh cache directory and repeat the install with the same package-lock.json and registry. An old local copy can no longer hide a missing or changed archive."],
        sources: [
          {
            label: ["npm · история left-pad", "npm · the left-pad incident"],
            url: "https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm"
          },
          {
            label: ["npm · устройство кеша", "npm · how the cache works"],
            url: "https://docs.npmjs.com/cli/v11/commands/npm-cache/"
          }
        ],
        solutions: [
          {
            title: ["Вернуть нужный архив", "Restore the required archive"],
            body: ["Если пропал файл на сервере команды, попросите восстановить оригинальный архив из доверенного источника и проверить контрольную сумму. При EINTEGRITY сначала выясните, почему содержимое изменилось. Замена суммы на случайно полученную скроет проблему.", "If the team server lost the file, have its owner restore the original archive from a trusted source and verify its digest. For EINTEGRITY, first find out why the contents changed. Replacing the expected digest with the one you happened to receive would hide the problem."]
          },
          {
            title: ["Перейти на версию, которую можно получить", "Move to a release you can obtain"],
            body: ["Если вернуть архив нельзя, найдите выпуск библиотеки, которая его запрашивает, с зависимостью на доступную версию. Обновите эту библиотеку в приложении и проверьте то действие, ради которого она понадобилась.", "If the old archive cannot be recovered, find a release of the requesting library that accepts an available dependency version. Update that library in the app and test the feature that uses it."]
          }
        ]
      }
    ]
  }
);
