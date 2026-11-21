globalThis.DepLoomBookChapters.push(
  {
    id: "replaying-installs",
    title: ["Как повторить установку", "Reproducing an install"],
    lessons: [
      {
        id: "lock-after-merge",
        title: ["Чей lock-файл брать после merge?", "Which lockfile survives a merge?"],
        lead: [
          "В одной ветке добавили генератор PDF, в другой — обработку изображений. В итоговом package.json нужны обе библиотеки. Что попадёт в CI, если при конфликте выбрать целиком lock-файл первой ветки?",
          "One branch adds PDF export and another adds image processing. The merged package.json needs both libraries. What reaches CI if you take the first branch’s entire lockfile?"
        ],
        examples: [
          {
            title: ["Потерянная запись", "A missing entry"],
            body: ["В учебном проекте после merge в манифесте есть pdfkit и sharp. В lock-файле ветки с PDF записи для sharp нет. npm ci останавливается на расхождении. Обычный npm install может дописать запись локально, а в коммите по-прежнему лежит старый файл.", "After the example merge, the manifest lists pdfkit and sharp. The PDF branch’s lockfile has no sharp entry, so npm ci stops. A local npm install can fill the gap while the commit still contains the old file."]
          },
          {
            title: ["Версия в строке поменялась, архив остался прежним", "A new version label on the old archive"],
            body: ["У записи в npm lock-файле есть связанные поля. version называет выпуск, resolved указывает, откуда брать архив, integrity фиксирует его содержимое. Ручная правка одного поля может оставить снимок, который описывает сразу два разных выпуска.", "An npm lock entry ties several fields together. version names a release, resolved locates its tarball, and integrity identifies its contents. Editing just one field can leave an entry describing two different releases."]
          }
        ],
        lab: {
          prompt: ["В обеих ветках тесты прошли. Выберите, какие файлы получит чистый CI.", "Both branches passed their own tests. Choose the files a clean CI job receives."],
          states: [
            {label: ["Lock от PDF", "PDF lockfile"], value: ["Нет записи sharp", "sharp entry missing"], detail: ["Манифест объединён, а выбранный lock был создан до добавления sharp. npm ci не дописывает зависимости.", "The merged manifest requests sharp, but the selected lock predates it. npm ci will not add the missing dependency."], tone: "bad"},
            {label: ["Только локальный install", "Local install only"], value: ["В CI всё ещё старый lock", "CI still has the old lock"], detail: ["На ноутбуке появился исправленный файл. Свежий checkout получает только то, что вошло в коммит.", "The laptop now has the repaired file. A fresh checkout receives only the committed files."], tone: "warn"},
            {label: ["Согласованные файлы", "Reconciled files"], value: ["pdfkit и sharp записаны", "pdfkit and sharp recorded"], detail: ["Обе записи сохранены вместе с объединённым манифестом. Это устраняет данное расхождение. Сборку и экспорт PDF проверяют отдельно.", "Both entries were committed with the merged manifest. This resolves the discrepancy. Building and exporting a PDF are separate checks."], tone: "ok"}
          ]
        },
        check: ["Посмотрите diff package.json и lock-файла рядом. Затем запустите npm ci из чистого checkout именно того коммита, который отправится в CI.", "Read the manifest and lockfile diffs side by side. Run npm ci from a clean checkout of the exact commit CI will receive."],
        sources: [{label: ["npm · поведение npm ci", "npm · how npm ci works"], url: "https://docs.npmjs.com/cli/v11/commands/npm-ci/"}, {label: ["npm · поля lock-файла", "npm · lockfile fields"], url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/"}]
      },
      {
        id: "lock-reselection",
        title: ["Удалили lock — откуда новые типы?", "Where did the new types come from?"],
        lead: ["Удаление node_modules очищает установленное дерево. Если удалить ещё и lock-файл, при следующей установке менеджер заново выберет версии, подходящие под диапазоны. Даже если исходный код никто не трогал.", "Removing node_modules clears the installed tree. Remove the lockfile too and the next install gets to choose versions within the allowed ranges again, even if nobody touched the source."],
        examples: [
          {
            title: ["DatePicker внезапно не компилируется", "DatePicker suddenly fails to compile"],
            body: ["В DefinitelyTyped #59802 разработчик удалил yarn.lock и node_modules. После установки TypeScript отверг DatePicker и SVG-компоненты с TS2786. В обсуждении показали, как требование * у сторонних пакетов допускало @types/react 18 рядом с более старыми типами проекта.", "In DefinitelyTyped #59802 a developer removed yarn.lock and node_modules. After reinstalling, TypeScript rejected DatePicker and SVG components with TS2786. The discussion traced how a third-party * requirement admitted @types/react 18 alongside the project’s older types."]
          },
          {
            title: ["Закрепили верхний пакет", "Pinning the top-level package"],
            body: ["Представьте генератор отчётов, закреплённый на 3.0.0. Внутри он использует parser@^2.1.0. Между двумя установками вышел parser 2.4.0. В новом дереве изменится разбор отчёта, хотя сам генератор остался на 3.0.0.", "Imagine pinning a report generator to 3.0.0. It depends on parser@^2.1.0. If parser 2.4.0 appears between installs, rebuilding the lock can change how reports are parsed while the generator stays at 3.0.0."]
          }
        ],
        lab: {
          prompt: ["В учебном каталоге есть parser 2.1.0 и 2.4.0. Раньше был записан 2.1.0. Что увидит генератор?", "The example registry offers parser 2.1.0 and 2.4.0. The old lock recorded 2.1.0. Which parser reaches the generator?"],
          states: [
            {label: ["Сохранить lock", "Keep the lock"], value: ["parser@2.1.0", "parser@2.1.0"], detail: ["Чистая установка по согласованному lock восстанавливает записанную версию.", "A clean frozen install restores the version recorded in the consistent lock."], tone: "ok"},
            {label: ["Пересоздать lock", "Regenerate the lock"], value: ["parser@2.4.0", "parser@2.4.0"], detail: ["В этой модели менеджер выбирает старшую доступную версию из ^2.1.0. Диапазон записан внутри генератора.", "The example resolver selects the highest available version satisfying ^2.1.0. That range belongs to the generator."], tone: "warn"}
          ]
        },
        check: ["Сравните старое и новое деревья. Для упавшего пакета типов выясните, кто его запросил, с каким диапазоном и на каком пути он оказался.", "Compare the two resolved trees. For the failing type package, identify its requester, the declared range and the installed path."],
        sources: [{label: ["DefinitelyTyped · история с @types/react", "DefinitelyTyped · the @types/react report"], url: "https://github.com/DefinitelyTyped/DefinitelyTyped/issues/59802"}]
      },
      {
        id: "npm-lock-reader",
        title: ["Почему npm отверг собственный lock?", "Why did npm reject its own lock?"],
        lead: ["Файл создаёт программа, и читает его тоже программа. Иногда обновление самого npm меняет формат записи или обнаруживает ошибку в обработке зависимостей.", "A program writes the file, and a program reads it. Updating npm itself can change the format or expose a bug in how dependencies are handled."],
        examples: [
          {
            title: ["История trim-newlines", "The trim-newlines report"],
            body: ["В npm/cli #4684 проект с overrides проходил npm ci на npm 8.5.5. С npm 8.6 автор получил сообщение о недостающем trim-newlines@1.0.0. После повторного npm install команда ci заработала, но нужная подмена в lock исчезла. Мейнтейнер связал сбой с исправлением #4709.", "In npm/cli #4684 a project using overrides passed npm ci with npm 8.5.5. With npm 8.6 the reporter saw a missing trim-newlines@1.0.0 entry. Another npm install made ci pass but lost the intended override in the lock. A maintainer linked the bug to fix #4709."]
          },
          {
            title: ["Большой diff после смены формата", "A large format-only diff"],
            body: ["В учебном diff сотни строк меняются при переходе на новое поколение lock-файла. Сравните имя, версию и путь каждой копии, а затем resolved и integrity. Так видно, какие записи получили новые метаданные, а какие ведут к другому архиву.", "In an example format upgrade, hundreds of lines change. Compare each installed copy’s name, version and path, then its resolved URL and integrity. That separates new metadata from a change in the downloaded archive."]
          }
        ],
        lab: {
          prompt: ["Проследите за одной подменой в отчёте #4684. Какой результат вы бы пропустили, глядя только на код выхода?", "Follow one override through report #4684. What would you miss by looking only at the exit code?"],
          states: [
            {label: ["npm 8.5.5", "npm 8.5.5"], value: ["npm ci проходит", "npm ci passes"], detail: ["С этой версией npm автор наблюдал рабочую установку с заданной подменой.", "The reporter observed a working installation with the configured override using this npm version."], tone: "ok"},
            {label: ["npm 8.6", "npm 8.6"], value: ["Missing: trim-newlines@1.0.0", "Missing: trim-newlines@1.0.0"], detail: ["В проблемном сценарии npm ci отверг lock после npm install.", "In the reported scenario npm ci rejected the lock after npm install."], tone: "bad"},
            {label: ["Ещё раз install", "Install again"], value: ["ci проходит, подмена потеряна", "ci passes, override lost"], detail: ["Установка снова завершается, а проверка версии вложенной зависимости обнаруживает второе расхождение.", "Installation succeeds again, but inspecting the nested version reveals a second discrepancy."], tone: "warn"}
          ]
        },
        check: ["Зафиксируйте версию npm. Если цель изменения — заменить конкретную транзитивную копию, проверьте её путь и версию после чистой установки.", "Record the npm version. If the goal is to replace a particular transitive copy, verify its path and version after a clean install."],
        sources: [{label: ["npm/cli #4684 · overrides и lock", "npm/cli #4684 · overrides and the lockfile"], url: "https://github.com/npm/cli/issues/4684"}]
      },
      {
        id: "peer-install-mode",
        title: ["На ноутбуке проходит, в CI — ERESOLVE", "It installs locally. Why does CI say ERESOLVE?"],
        lead: ["В lock-файле записан выбранный пакет. Решение о том, проверять ли требования соседних пакетов, зависит ещё и от режима npm.", "The lockfile records the selected package. Whether npm enforces peer requirements also depends on the install settings."],
        examples: [
          {
            title: ["NestJS и клиент Elasticsearch", "NestJS and its Elasticsearch client"],
            body: ["В npm/cli #4998 адаптер @nestjs/elasticsearch@8.1.0 ожидал клиент ^7.4.0 или ^8.0.0. В проекте стоял 5.6.22. Lock подготовили с --legacy-peer-deps, а обычный npm ci остановился на несовместимом требовании.", "In npm/cli #4998, @nestjs/elasticsearch@8.1.0 expected a client in ^7.4.0 or ^8.0.0. The project had 5.6.22. Its lock was prepared using --legacy-peer-deps, and an ordinary npm ci stopped at the conflicting requirement."]
          },
          {
            title: ["Скрытая настройка в домашнем каталоге", "An invisible setting in the home directory"],
            body: ["Представьте, что у разработчика в пользовательском .npmrc выставлен legacy-peer-deps=true. Он и CI вводят одинаковую команду, а настройки получаются разными. npm config get legacy-peer-deps в обоих окружениях быстро выявит причину.", "Suppose a developer’s user-level .npmrc sets legacy-peer-deps=true. The developer and CI type the same command but get different settings. Running npm config get legacy-peer-deps in each environment exposes the difference."]
          }
        ],
        lab: {
          prompt: ["Оставьте клиент 5.6.22 и адаптер 8.1.0. Как изменится оценка их единственного peer-требования?", "Keep client 5.6.22 and adapter 8.1.0. What happens to their one peer requirement?"],
          states: [
            {label: ["Обычный режим", "Default mode"], value: ["ERESOLVE", "ERESOLVE"], detail: ["5.6.22 лежит за пределами обоих объявленных диапазонов.", "5.6.22 falls outside both declared ranges."], tone: "bad"},
            {label: ["legacy-peer-deps", "legacy-peer-deps"], value: ["Проверка peer пропущена", "Peer check skipped"], detail: ["npm игнорирует это требование при построении дерева. Запрос к Elasticsearch ещё предстоит проверить.", "npm ignores this requirement when it builds the tree. A real Elasticsearch request still needs testing."], tone: "warn"}
          ]
        },
        check: ["Сопоставьте версию npm, эффективные параметры и строки Found/peer из лога. Если меняете клиент ради адаптера, проверьте реальный запрос к серверу.", "Compare npm versions, effective settings and the Found/peer lines in the log. If you switch the client to satisfy the adapter, exercise a real server request."],
        sources: [{label: ["npm/cli #4998 · воспроизведение", "npm/cli #4998 · reproduction"], url: "https://github.com/npm/cli/issues/4998"}, {label: ["npm · параметры установки", "npm · install configuration"], url: "https://docs.npmjs.com/cli/v11/using-npm/config/"}]
      },
      {
        id: "install-omissions",
        title: ["Запись есть, а файла на диске нет", "Recorded in the lock, missing on disk"],
        lead: ["CI может пропустить часть зависимостей или отключить скрипты установки. В обоих случаях номер версии в lock останется прежним, а содержимое рабочего каталога изменится.", "CI can omit part of the tree or disable install scripts. Either choice can change the working directory while leaving the version in the lockfile untouched."],
        examples: [
          {title: ["Vite нужен до упаковки приложения", "Vite is needed before packaging"], body: ["Если vite объявлен только в devDependencies, npm ci --omit=dev оставит его за пределами node_modules. Когда следующий шаг вызовет vite build, локального исполняемого файла не окажется. Готовый уже собранный сайт и каталог для сборки требуют разного набора файлов.", "If vite is only in devDependencies, npm ci --omit=dev leaves it off disk. A subsequent vite build cannot find the local executable. A finished site and the directory that builds it need different files."]},
          {title: ["Типы рождаются при установке", "Types generated during installation"], body: ["В учебном пакете postinstall создаёт generated/schema.d.ts. При --ignore-scripts сам пакет распакуется, а TypeScript позже остановится на отсутствующем файле. Здесь важно определить, какой шаг создаёт нужный результат.", "In the example package, postinstall creates generated/schema.d.ts. With --ignore-scripts the package unpacks, but a later TypeScript build cannot find that file. Trace which step normally produces it."]}
        ],
        lab: {
          prompt: ["В учебной сборке нужны Vite из devDependencies и файл схемы из postinstall обычной зависимости. Выберите режим установки.", "This example build needs Vite from devDependencies and a schema generated by a production dependency’s postinstall. Pick an install mode."],
          states: [
            {label: ["Все зависимости", "Full install"], value: ["Оба файла на месте", "Both files present"], detail: ["В этой модели установлены devDependencies и разрешён скрипт генерации.", "The example installs devDependencies and allows the generator to run."], tone: "ok"},
            {label: ["--omit=dev", "--omit=dev"], value: ["Нет node_modules/.bin/vite", "node_modules/.bin/vite missing"], detail: ["Схема создана, но инструмент сборки был исключён.", "The schema was generated, but the build tool was omitted."], tone: "bad"},
            {label: ["--ignore-scripts", "--ignore-scripts"], value: ["Нет generated/schema.d.ts", "generated/schema.d.ts missing"], detail: ["Инструмент сборки установлен, а генератор схемы не запускался.", "The build tool was installed, but the schema generator never ran."], tone: "bad"}
          ]
        },
        check: ["Найдите первый отсутствующий файл. Это файл из архива, исполняемый файл инструмента разработки или результат скрипта? Сверьте ответ с параметрами установки на этом шаге CI.", "Find the first missing file. Was it shipped in the tarball, provided by a development tool, or generated by a script? Compare that answer with the install flags in this CI stage."],
        sources: [{label: ["npm · omit и ignore-scripts", "npm · omit and ignore-scripts"], url: "https://docs.npmjs.com/cli/v11/commands/npm-ci/"}]
      }
    ]
  },
  {
    id: "across-environments",
    title: ["На другой машине и у потребителя", "On another machine and in a consumer app"],
    lessons: [
      {
        id: "rollup-platform",
        title: ["Какой Rollup достанется Linux?", "Which Rollup binary reaches Linux?"],
        lead: ["У нативного пакета могут быть разные сборки для каждой ОС, архитектуры и системной библиотеки. В общем lock-файле могут находиться сразу несколько вариантов. Каждой машине нужен свой.", "A native package can ship different builds for each OS, CPU and system library. A shared lockfile can record multiple variants. Each machine needs its own."],
        examples: [
          {
            title: ["Восемнадцать записей превратились в одну", "Eighteen entries became one"],
            body: ["В npm/cli #7961 автор указал npm 10.9.2 и описал опыт с Rollup. После создания lock в чистом каталоге в нём было 18 платформенных вариантов. Когда lock пересоздали с уже установленным node_modules, осталась одна запись для текущей платформы. Поэтому полезно указывать точную версию npm и состояние каталога.", "The reporter in npm/cli #7961 listed npm 10.9.2 and described a Rollup experiment. A lock created in a clean directory listed 18 platform variants. Recreating it with node_modules still present left just the current platform’s entry. Record both the npm version and the starting directory state when investigating."]
          },
          {
            title: ["Оба агента Linux x64, а бинарники разные", "Both workers say Linux x64 but need different binaries"],
            body: ["Обычный Debian использует glibc, Alpine — musl. Кеш готового node_modules с варианта linux-x64-gnu может не содержать linux-x64-musl. Кеш скачанных архивов и кеш уже установленного дерева решают разные задачи.", "A typical Debian image uses glibc and Alpine uses musl. A node_modules cache prepared for linux-x64-gnu can lack linux-x64-musl. Caching downloaded tarballs and caching an installed tree preserve different things."]
          }
        ],
        lab: {
          prompt: ["Учебный lock содержит варианты darwin-arm64 и linux-x64-gnu. Какой пакет запросит загрузчик на выбранной машине?", "The example lock records darwin-arm64 and linux-x64-gnu. Which package does the loader need on each machine?"],
          states: [
            {label: ["Mac ARM64", "Mac ARM64"], value: ["@rollup/rollup-darwin-arm64", "@rollup/rollup-darwin-arm64"], detail: ["Вариант для Apple Silicon есть в этом lock.", "The Apple Silicon variant is present in this lock."], tone: "ok"},
            {label: ["Debian x64", "Debian x64"], value: ["@rollup/rollup-linux-x64-gnu", "@rollup/rollup-linux-x64-gnu"], detail: ["Есть сборка под x64 и glibc.", "The lock includes a build for x64 and glibc."], tone: "ok"},
            {label: ["Alpine x64", "Alpine x64"], value: ["Нет linux-x64-musl", "linux-x64-musl missing"], detail: ["Архитектура совпала с Debian, но сборке для musl нужна отдельная запись. Смена процессора была бы ещё одной причиной выбрать другой бинарник.", "The CPU matches Debian’s, but musl needs a separate entry. Changing the CPU would independently change the required binary."], tone: "bad"}
          ]
        },
        check: ["Запустите чистую установку и загрузку нативного модуля на целевых ОС, CPU и libc. Для воспроизведения различайте исходный lock, наличие node_modules и восстановление кеша CI.", "Run a clean install and load the native module on each target OS, CPU and libc. Record the starting lock, presence of node_modules and whether CI restored a cache."],
        sources: [{label: ["npm/cli #7961 · опыт с Rollup", "npm/cli #7961 · the Rollup experiment"], url: "https://github.com/npm/cli/issues/7961"}]
      },
      {
        id: "consumer-tarball",
        title: ["Что получит пользователь библиотеки?", "What does a library consumer actually get?"],
        lead: ["В рабочем репозитории вы управляете корневым package.json и видите все исходники. У пользователя свой корень, свои зависимости и только те файлы вашей библиотеки, которые попали в архив.", "Inside the library repo you control the root package.json and can see every source file. A consumer has a different root, its own dependencies and only the library files that made it into the tarball."],
        examples: [
          {
            title: ["Исправление axios осталось в репозитории", "The axios fix stayed in the repository"],
            body: ["Автор отчёта npm/documentation #975 согласовал axios и aws4-axios через overrides. В репозитории библиотеки всё работало, в тестовом приложении конфликт вернулся. npm берёт overrides из корня установки. По той же причине запись в манифесте отдельного workspace не задаёт правило для всей монорепы.", "The reporter in npm/documentation #975 reconciled axios and aws4-axios with overrides. The library repo worked, but the conflict returned in a test consumer. npm reads overrides from the install root. For the same reason, an override in a workspace member does not set policy for the whole monorepo."]
          },
          {
            title: ["Файл существует только в checkout", "A file that exists only in the checkout"],
            body: ["Представьте пакет, у которого types указывает на dist/index.d.ts, а в список files включили только JavaScript. Локальная workspace-ссылка видит собранные типы, у клиента архив их не содержит. Кроме того, обычный package-lock.json библиотеки не фиксирует дерево зависимостей приложения-потребителя.", "Imagine types points to dist/index.d.ts but the files list only includes JavaScript. A local workspace link can see the generated declarations, while the consumer tarball lacks them. A library’s ordinary package-lock.json also does not pin the consuming application’s tree."]
          }
        ],
        lab: {
          prompt: ["В учебном пакете dist/index.d.ts есть на диске, но отсутствует в архиве. Выберите, откуда его подключит TypeScript.", "The example has dist/index.d.ts on disk but leaves it out of the tarball. Choose what TypeScript consumes."],
          states: [
            {label: ["Workspace-ссылка", "Workspace link"], value: ["dist/index.d.ts найден", "dist/index.d.ts found"], detail: ["Ссылка ведёт в рабочий каталог библиотеки. Компилятор видит файл после локальной сборки.", "The link points to the working directory where the library was built. The compiler can see the declarations."], tone: "ok"},
            {label: ["Первый архив", "Original tarball"], value: ["Объявления отсутствуют", "Declarations missing"], detail: ["Поле types называет путь, но распаковка не создаст не включённый в архив файл.", "The types field names a path. Unpacking cannot create a file omitted from the tarball."], tone: "bad"},
            {label: ["Архив с типами", "Tarball with types"], value: ["dist/index.d.ts найден", "dist/index.d.ts found"], detail: ["Теперь файл включён в пакет. Чистое приложение может проверить тот же публичный импорт, которым воспользуется клиент.", "The package now includes the file. A clean consumer can type-check the same public import its users will write."], tone: "ok"}
          ]
        },
        check: ["Посмотрите список файлов через npm pack --dry-run. Соберите архив с помощью npm pack, установите его в отдельное пустое приложение и проверьте импорт, типы и итоговые версии зависимостей.", "Inspect the file list with npm pack --dry-run. Build the tarball with npm pack, install it in a fresh consumer and verify its import, declarations and resolved dependency versions."],
        sources: [{label: ["npm/documentation #975 · проверка у потребителя", "npm/documentation #975 · the consumer report"], url: "https://github.com/npm/documentation/issues/975"}, {label: ["npm · область действия overrides", "npm · override scope"], url: "https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides"}, {label: ["npm · упаковка библиотеки", "npm · packing a library"], url: "https://docs.npmjs.com/cli/v11/commands/npm-pack/"}]
      },
      {
        id: "registry-view",
        title: ["Куда ушёл запрос за версией?", "Which registry answered the request?"],
        lead: ["На странице пакета есть новый релиз, а установка в офисе его не видит. Начните с имени пакета и адреса реестра, из которого менеджер получил список версий.", "The package page shows a new release, but the office install cannot see it. Start with the package name and the registry that actually supplied the version list."],
        examples: [
          {
            title: ["Префикс имени меняет адрес", "A name prefix changes the destination"],
            body: ["Если для @studio задан отдельный registry, запрос @studio/theme уйдёт туда, даже когда реестр по умолчанию содержит другой набор пакетов. E404 описывает ответ на конкретный запрос. Проверьте написание имени, адрес и доступ к пакету в этом окружении.", "With a registry configured for @studio, a request for @studio/theme goes there even when the default registry has a different catalog. E404 describes the response to that request. Check the spelling, destination and whether this environment can access the package."],
            code: "npm config get registry\nnpm config get @studio:registry"
          },
          {
            title: ["Зеркало и локальный кеш помнят разное", "A mirror and a local cache remember different releases"],
            body: ["В учебном примере зеркало вчера показывало theme 2.1.0. Сегодня на нём уже есть 2.2.0, а старый кеш метаданных по-прежнему перечисляет только 2.1.0. До проверки у нужного источника вывод о доступных обновлениях ограничен моментом снимка.", "Suppose the mirror listed theme 2.1.0 yesterday. It now offers 2.2.0, but an old metadata cache still lists only 2.1.0. Until you check the intended source, the available-update result describes the time of that snapshot."]
          }
        ],
        lab: {
          prompt: ["В учебном каталоге @studio/theme ищут три клиента. Что каждый из них может сказать о версии 2.2.0?", "Three clients in this example look up @studio/theme. What evidence does each have for 2.2.0?"],
          states: [
            {label: ["Старый кеш", "Old cache"], value: ["В списке только 2.1.0", "Only 2.1.0 listed"], detail: ["Это вчерашний перечень. Появление версии после его записи остаётся возможным.", "This is yesterday’s list. A release may have appeared since it was recorded."], tone: "warn"},
            {label: ["Чужой registry", "Different registry"], value: ["E404", "E404"], detail: ["По этому адресу имя не найдено. Чтобы узнать состояние нужного каталога, проверьте маршрут scope.", "The name was not found at this destination. Inspect the scope mapping to check the intended catalog."], tone: "warn"},
            {label: ["Нужное зеркало", "Intended mirror"], value: ["Есть метаданные 2.2.0", "2.2.0 metadata found"], detail: ["Свежий ответ подтверждает запись в нужном каталоге. Скачивание самого архива — следующий отдельный шаг.", "A fresh response confirms the entry in the intended catalog. Fetching its tarball is a separate step."], tone: "ok"}
          ]
        },
        check: ["Запишите имя со scope, версию, выбранный registry и возраст метаданных. Если источник недоступен, оставьте вопрос о совместимых версиях открытым.", "Record the scoped name, version, registry and metadata age. If the source is unavailable, leave the question of compatible releases open."],
        sources: [{label: ["npm · маршрутизация по scope", "npm · associating a scope with a registry"], url: "https://docs.npmjs.com/cli/v11/using-npm/scope/"}]
      },
      {
        id: "registry-artifact",
        title: ["Версия известна. Можно ли её скачать?", "The version is known. Can you fetch its bytes?"],
        lead: ["Менеджер находит подходящий выпуск, получает его архив и сверяет содержимое. Успех на одном шаге ещё ничего не говорит о следующем.", "An install has to identify a suitable release, fetch its tarball and verify its contents. Each step needs its own evidence."],
        examples: [
          {
            title: ["Почему left-pad@1.0.0 не спас сборки", "Why left-pad@1.0.0 did not rescue the builds"],
            body: ["В 2016 году left-pad сняли с публикации. Появился функционально аналогичный выпуск 1.0.0, но line-numbers запрашивал ровно 0.0.3. npm восстановил исходный 0.0.3 из резервной копии. История произошла ещё до появления package-lock.json.", "In 2016 left-pad was unpublished. A functionally equivalent 1.0.0 appeared, but line-numbers requested exactly 0.0.3. npm restored the original 0.0.3 from a backup. This happened before package-lock.json existed."]
          },
          {
            title: ["Тёплый кеш скрывает недоступный архив", "A warm cache hides an unavailable tarball"],
            body: ["В учебном CI старый агент уже хранит правильные байты. Новый агент получает метаданные, но зеркало отвечает 404 на запрос за архивом. Если зеркало вместо этого отдаст другие байты, установка с записанным integrity обнаружит несовпадение контрольной суммы.", "An old CI worker in this example already holds the correct bytes. A new worker gets metadata but the mirror returns 404 for the tarball. If it serves different bytes instead, the recorded integrity value lets the installer detect the mismatch."]
          }
        ],
        lab: {
          prompt: ["URL и ожидаемый integrity уже записаны. Что получится при чтении архива?", "The URL and expected integrity are recorded. What happens when the installer reads the tarball?"],
          states: [
            {label: ["Тёплый кеш", "Warm cache"], value: ["Байты совпали", "Matching bytes"], detail: ["Локально нашёлся архив с ожидаемой суммой. Этот запуск ничего не узнал о доступности зеркала.", "The expected content was available locally. This run learned nothing about mirror availability."], tone: "ok"},
            {label: ["Пустой кеш + 404", "Empty cache + 404"], value: ["Архив не получен", "Tarball unavailable"], detail: ["Полученные метаданные описывают выпуск, но не заменяют его файлы.", "The metadata describes the release but cannot supply its files."], tone: "bad"},
            {label: ["Другие байты", "Different bytes"], value: ["EINTEGRITY", "EINTEGRITY"], detail: ["Если при повторном чтении содержимое всё ещё отличается от записанной суммы, такой архив не проходит проверку.", "If the content still differs from the recorded digest after retry, the tarball fails verification."], tone: "bad"}
          ]
        },
        check: ["Для проверки воспроизводимости попробуйте чистый изолированный кеш, сохранив тот же источник. Укажите, удалось ли найти версию, скачать архив и проверить integrity.", "To check reproducibility, use a fresh isolated cache against the same source. Record whether the installer identified the version, fetched the archive and verified its integrity."],
        sources: [{label: ["npm · история left-pad", "npm · the left-pad incident"], url: "https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm"}, {label: ["npm · устройство кеша", "npm · how the cache works"], url: "https://docs.npmjs.com/cli/v11/commands/npm-cache/"}]
      }
    ]
  }
);
