
// DepLoom Handbook: beginner-friendly bilingual order and worked explanations.
'use strict';
(() => {
  if (globalThis.DepLoomBookCoachLoaded) return;
  const DATA = {
  "chapters": [
    {
      "id": "first-install",
      "title": [
        "Сначала разберёмся с установкой",
        "Start with installing"
      ],
      "level": [
        "Для начала",
        "Beginner"
      ],
      "lessons": [
        "range-and-lock",
        "lock-after-merge",
        "lock-reselection",
        "install-omissions",
        "registry-view",
        "registry-artifact",
        "missing-release"
      ]
    },
    {
      "id": "connected-tools",
      "title": [
        "Когда библиотека зависит от другой",
        "When tools must agree"
      ],
      "level": [
        "Базовый +",
        "Getting comfortable"
      ],
      "lessons": [
        "upgrade-cohorts",
        "peer-install-mode",
        "eslint-family",
        "stylelint-family",
        "storybook-family",
        "shared-host"
      ]
    },
    {
      "id": "where-packages-live",
      "title": [
        "Почему важны папки и копии",
        "Why files and copies matter"
      ],
      "level": [
        "Продолжаем",
        "Intermediate"
      ],
      "lessons": [
        "nested-copies",
        "borrowed-dependency",
        "react-instance",
        "consumer-tarball"
      ]
    },
    {
      "id": "merges-and-platforms",
      "title": [
        "Что меняется после merge и в CI",
        "Merges, platforms and CI"
      ],
      "level": [
        "Продолжаем",
        "Intermediate"
      ],
      "lessons": [
        "merged-branches",
        "npm-lock-reader",
        "across-environments",
        "rollup-platform",
        "module-loader"
      ]
    },
    {
      "id": "code-after-install",
      "title": [
        "Когда установка прошла, а код нет",
        "When the install works but code breaks"
      ],
      "level": [
        "Сложнее",
        "Advanced"
      ],
      "lessons": [
        "angular-ts-limit",
        "type-boundaries",
        "user-actions",
        "quill-react19",
        "browser-and-server",
        "audit-and-api"
      ]
    },
    {
      "id": "proof-and-checks",
      "title": [
        "Как убедиться, что всё действительно работает",
        "How to verify the result"
      ],
      "level": [
        "Сложнее",
        "Advanced"
      ],
      "lessons": [
        "audit-coverage",
        "tested-snapshot",
        "search-bounds",
        "repeat-codemod"
      ]
    }
  ],
  "lessons": {
    "range-and-lock": {
      "id": "range-and-lock",
      "level": 1,
      "title": [
        "Почему npm ставит не самую новую версию?",
        "Why does npm install an older version?"
      ],
      "lead": [
        "Вы набрали npm install. Откуда npm знает, какую версию взять? Посмотрим на два файла: один разрешает версии, второй записывает конкретную.",
        "You ran npm install. How does npm choose a version? Two files are involved: one allows versions, the other records the actual one."
      ],
      "steps": [
        [
          "В package.json написано, какие библиотеки нужны проекту.",
          "package.json lists the libraries the project needs."
        ],
        [
          "Значок ^ перед номером разрешает некоторые более новые выпуски. Но не любые.",
          "The ^ symbol allows some newer releases, but not every release."
        ],
        [
          "package-lock.json или yarn.lock запоминает точный выбор. Поэтому новая установка часто повторяет старую.",
          "package-lock.json or yarn.lock records the exact choice. That is why reinstalling often keeps an older release."
        ]
      ],
      "examples": [
        {
          "title": [
            "Сначала посмотрите запрос",
            "First, inspect the request"
          ],
          "body": [
            "Здесь приложение просит любую подходящую версию price-label 1.x. ^ — это диапазон, а не обещание обновляться автоматически.",
            "This app allows a matching price-label 1.x release. ^ is a range, not a promise to upgrade automatically."
          ],
          "file": [
            "package.json",
            "package.json"
          ],
          "code": [
            "\"dependencies\": { \"price-label\": \"^1.2.0\" }",
            "\"dependencies\": { \"price-label\": \"^1.2.0\" }"
          ]
        },
        {
          "title": [
            "Теперь посмотрите, что выбрали",
            "Then see what was picked"
          ],
          "body": [
            "Версия 1.2.4 подходит. Даже если появилась 1.9.0, npm ci воспроизведёт запись из lock-файла.",
            "Version 1.2.4 still fits. Even if 1.9.0 is now available, npm ci reproduces the lockfile."
          ],
          "file": [
            "package-lock.json (короткая вырезка)",
            "package-lock.json (short excerpt)"
          ],
          "code": [
            "\"node_modules/price-label\": { \"version\": \"1.2.4\" }",
            "\"node_modules/price-label\": { \"version\": \"1.2.4\" }"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Нужно обновить именно эту библиотеку",
            "To upgrade only this library"
          ],
          "body": [
            "Укажите желаемую версию через npm install с именем пакета, проверьте два файла и тесты.",
            "Install the desired version by name, inspect both files, then run the tests."
          ],
          "code": [
            "npm install price-label@1.9.0",
            "npm install price-label@1.9.0"
          ]
        },
        {
          "title": [
            "Нужно повторить существующую установку",
            "To reproduce the existing install"
          ],
          "body": [
            "Используйте npm ci: он берёт версии из lock-файла и не подбирает новые без вашего решения.",
            "Use npm ci: it follows the lockfile rather than silently choosing newer versions."
          ],
          "code": [
            "npm ci",
            "npm ci"
          ]
        }
      ],
      "check": [
        "Откройте package.json и package-lock.json: совпадает ли диапазон с установленной версией? Попробуйте npm ls price-label.",
        "Open package.json and package-lock.json: does the installed version fit the range? Try npm ls price-label."
      ],
      "terms": [
        {
          "term": [
            "Lock-файл",
            "Lockfile"
          ],
          "meaning": [
            "Файл с точными выбранными версиями, который сохраняют в Git.",
            "A file with the exact selected versions that is committed to Git."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "lock-after-merge": {
      "id": "lock-after-merge",
      "level": 1,
      "title": [
        "Почему npm ci упал после слияния веток?",
        "Why did npm ci fail after merging branches?"
      ],
      "lead": [
        "Два разработчика добавили разные библиотеки. Git объединил package.json, но lock-файл остался только от одного. npm ci заметил несоответствие.",
        "Two developers added different libraries. Git merged package.json but kept one branch’s lockfile. npm ci noticed."
      ],
      "steps": [
        [
          "Аня добавила экспорт PDF. Борис — загрузку файлов. Оба изменения нужны.",
          "Anya added PDF export and Boris added uploads. Both changes are needed."
        ],
        [
          "В package.json оказались обе библиотеки. В package-lock.json — только одна.",
          "package.json has both libraries, but package-lock.json has only one."
        ],
        [
          "npm ci не исправляет такой файл сам: он останавливается, чтобы не менять установку незаметно.",
          "npm ci stops instead of silently rewriting the lockfile."
        ]
      ],
      "examples": [
        {
          "title": [
            "После объединения",
            "After merging"
          ],
          "body": [
            "Манифест требует оба пакета.",
            "The manifest requests both packages."
          ],
          "file": [
            "package.json",
            "package.json"
          ],
          "code": [
            "\"dependencies\": { \"pdf-lib\": \"^1.17.1\", \"multer\": \"^1.4.5-lts.1\" }",
            "\"dependencies\": { \"pdf-lib\": \"^1.17.1\", \"multer\": \"^1.4.5-lts.1\" }"
          ]
        },
        {
          "title": [
            "Но lock запомнил только PDF",
            "But the lock only remembers PDF"
          ],
          "body": [
            "Если записи о multer нет, чистая установка не сможет подтвердить выбор.",
            "If multer is missing, a clean install cannot confirm the intended versions."
          ],
          "file": [
            "package-lock.json — упрощённо",
            "package-lock.json — simplified"
          ],
          "code": [
            "\"node_modules/pdf-lib\": { \"version\": \"1.17.1\" }\n// Записи node_modules/multer нет",
            "\"node_modules/pdf-lib\": { \"version\": \"1.17.1\" }\n// No node_modules/multer entry"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Пересчитать lock, не теряя оба изменения",
            "Recalculate the lock with both changes"
          ],
          "body": [
            "После завершения merge запустите npm install из корня проекта и сохраните новый package-lock.json вместе с package.json.",
            "After merging, run npm install from the project root and commit the new package-lock.json with package.json."
          ],
          "code": [
            "npm install\ngit diff -- package.json package-lock.json",
            "npm install\ngit diff -- package.json package-lock.json"
          ]
        },
        {
          "title": [
            "Проверить как в CI",
            "Verify like CI"
          ],
          "body": [
            "На чистом окружении выполните npm ci. Не лечите ошибку удалением нужной зависимости из package.json.",
            "Run npm ci on a clean install. Do not “fix” this by deleting a needed dependency from package.json."
          ],
          "code": [
            "npm ci",
            "npm ci"
          ]
        }
      ],
      "check": [
        "npm ci должен завершиться успешно, а npm ls pdf-lib multer — показать оба пакета.",
        "npm ci should succeed and npm ls pdf-lib multer should list both packages."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "lock-reselection": {
      "id": "lock-reselection",
      "level": 1,
      "title": [
        "Зачем вообще нужен lock-файл?",
        "Why keep a lockfile at all?"
      ],
      "lead": [
        "Удаление lock-файла кажется простым исправлением. Но оно разрешает npm или Yarn заново выбрать версии сразу для множества библиотек.",
        "Deleting a lockfile looks like a quick fix. But it lets npm or Yarn select many versions again."
      ],
      "steps": [
        [
          "Приложение собиралось вчера. Сегодня вы удалили yarn.lock и установили всё заново.",
          "The app built yesterday. Today you removed yarn.lock and reinstalled."
        ],
        [
          "Никакие строки в package.json не менялись, а установленные версии всё равно могли измениться.",
          "package.json did not change, yet the installed versions can change."
        ],
        [
          "Новый пакет типов React может не подойти старому коду календаря. Ошибку заметит TypeScript.",
          "Newer React type definitions may no longer fit old calendar code. TypeScript reports the problem."
        ]
      ],
      "examples": [
        {
          "title": [
            "Как выглядит скрытый выбор",
            "What the hidden choice looks like"
          ],
          "body": [
            "Символ * означает «любой выпуск»; без lock-файла выбор может перескочить на новый большой выпуск типов.",
            "The * range means “any version”; without a lockfile a fresh install may pick a new major type release."
          ],
          "file": [
            "package.json сторонней библиотеки",
            "A dependency’s package.json"
          ],
          "code": [
            "\"peerDependencies\": { \"@types/react\": \"*\" }",
            "\"peerDependencies\": { \"@types/react\": \"*\" }"
          ]
        },
        {
          "title": [
            "Какая ошибка может появиться",
            "What error might appear"
          ],
          "body": [
            "React 17 и набор типов React 18 иногда описывают компоненты по-разному. Это отдельная проблема типов, а не ошибка установки.",
            "React 17 and React 18 type declarations can describe components differently. This is a type-checking issue, not an install failure."
          ],
          "file": [
            "Пример сообщения TypeScript",
            "Example TypeScript error"
          ],
          "code": [
            "TS2786: component cannot be used as a JSX component",
            "TS2786: component cannot be used as a JSX component"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Вернуть известный рабочий выбор",
            "Restore the known-good selection"
          ],
          "body": [
            "Если lock случайно удалён, верните его из Git и проверьте npm ci.",
            "If the lockfile was removed by accident, restore it from Git and run npm ci."
          ],
          "code": [
            "git restore package-lock.json\nnpm ci",
            "git restore package-lock.json\nnpm ci"
          ]
        },
        {
          "title": [
            "Если обновление действительно нужно",
            "If you actually want to upgrade"
          ],
          "body": [
            "Обновляйте нужные пакеты отдельно и смотрите diff lock-файла, вместо удаления всего файла.",
            "Update the intended packages and review the lockfile diff instead of deleting everything."
          ],
          "code": [
            "npm install @types/react@17",
            "npm install @types/react@17"
          ]
        }
      ],
      "check": [
        "Сравните список изменившихся версий в diff lock-файла. Запустите сборку TypeScript.",
        "Review the changed versions in the lockfile diff and run TypeScript compilation."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "install-omissions": {
      "id": "install-omissions",
      "level": 1,
      "title": [
        "Почему приложение не собирается без devDependencies?",
        "Why can an install without devDependencies not build?"
      ],
      "lead": [
        "В проекте инструменты сборки часто лежат в devDependencies. Это не означает, что они не нужны для сборки.",
        "Build tools often live in devDependencies. That does not mean the build can run without them."
      ],
      "steps": [
        [
          "Приложение использует Vite для сборки, но Vite записан в devDependencies.",
          "The app builds with Vite, which is listed under devDependencies."
        ],
        [
          "В CI запускают npm ci --omit=dev: Vite не устанавливается.",
          "CI runs npm ci --omit=dev, which skips Vite."
        ],
        [
          "Следующий шаг npm run build падает: команды vite нет.",
          "The next step, npm run build, fails because vite is missing."
        ]
      ],
      "examples": [
        {
          "title": [
            "Вот откуда берётся vite",
            "Where vite comes from"
          ],
          "body": [
            "Посмотрите оба поля: команду сборки и сам пакет.",
            "Check both the build command and the package."
          ],
          "file": [
            "package.json",
            "package.json"
          ],
          "code": [
            "\"scripts\": { \"build\": \"vite build\" },\n\"devDependencies\": { \"vite\": \"^6.0.0\" }",
            "\"scripts\": { \"build\": \"vite build\" },\n\"devDependencies\": { \"vite\": \"^6.0.0\" }"
          ]
        },
        {
          "title": [
            "Что забыли установить",
            "What was omitted"
          ],
          "body": [
            "В среде без devDependencies нет исполняемого файла vite.",
            "Without devDependencies there is no vite executable."
          ],
          "file": [
            "Лог CI",
            "CI log"
          ],
          "code": [
            "sh: vite: not found",
            "sh: vite: not found"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Установить инструменты перед сборкой",
            "Install build tools before building"
          ],
          "body": [
            "Для этапа сборки ставьте devDependencies, соберите проект, затем переносите готовые файлы в runtime-образ.",
            "Install devDependencies in the build stage, build the app, then copy the output into the runtime image."
          ],
          "code": [
            "npm ci\nnpm run build",
            "npm ci\nnpm run build"
          ]
        },
        {
          "title": [
            "Проверить скрипты установки",
            "Check install scripts too"
          ],
          "body": [
            "Если библиотека готовит бинарник при установке, --ignore-scripts может оставить её неподготовленной. Смотрите документацию конкретного пакета.",
            "Some packages prepare binaries during install. --ignore-scripts may leave them unusable; check that package’s documentation."
          ],
          "code": [
            "npm ci --ignore-scripts  # не всегда безопасно",
            "npm ci --ignore-scripts  # not always safe"
          ]
        }
      ],
      "check": [
        "Убедитесь, что сборка проходит в чистом CI, а не благодаря старому node_modules.",
        "Confirm the build works in a clean CI environment, not only with an old node_modules folder."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "registry-view": {
      "id": "registry-view",
      "level": 1,
      "title": [
        "Откуда npm берёт список версий?",
        "Where does npm get the version list?"
      ],
      "lead": [
        "npm не хранит все версии у вас на компьютере. Обычно он спрашивает реестр — сервер, где опубликованы пакеты.",
        "npm does not have every version locally. It normally asks a registry—a server that lists published packages."
      ],
      "steps": [
        [
          "У компании может быть свой реестр. Там иногда ещё нет свежего выпуска.",
          "A company can use a private registry, where a new release may not be available yet."
        ],
        [
          "Пакеты с @company/ могут идти на другой сервер, чем обычные пакеты.",
          "Packages named @company/... may use a different server than public packages."
        ],
        [
          "Поэтому «версия не найдена» не всегда означает, что автор её не выпускал.",
          "So “version not found” does not always mean the author never published it."
        ]
      ],
      "examples": [
        {
          "title": [
            "Куда смотрит npm",
            "Where npm looks"
          ],
          "body": [
            "Эта команда покажет адрес используемого реестра.",
            "This command shows the configured registry URL."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "npm config get registry",
            "npm config get registry"
          ]
        },
        {
          "title": [
            "А пакет с префиксом @company?",
            "And a scoped @company package?"
          ],
          "body": [
            "В .npmrc можно настроить отдельный адрес. Это учебный пример, не адрес реального сервера.",
            "An .npmrc can point that scope elsewhere. This is an illustration, not a real server URL."
          ],
          "file": [
            ".npmrc (пример)",
            "Example .npmrc"
          ],
          "code": [
            "@company:registry=https://registry.example.test/",
            "@company:registry=https://registry.example.test/"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить доступность требуемой версии",
            "Check whether the version is available"
          ],
          "body": [
            "Посмотрите метаданные пакета через тот registry, который одобрен для проекта. Не переключайтесь на сторонний сервер без разрешения.",
            "Read metadata from the registry approved for your project. Do not switch to another server without approval."
          ],
          "code": [
            "npm view your-package versions",
            "npm view your-package versions"
          ]
        },
        {
          "title": [
            "Если в реестре выпуск отсутствует",
            "If the version is absent"
          ],
          "body": [
            "Проверьте синхронизацию зеркала или выберите совместимый доступный выпуск. Ошибку доступа не называйте «не существует».",
            "Check whether the mirror has synced, or choose a compatible available release. Do not call an access error “non-existent”."
          ],
          "code": [
            "npm view your-package@1.2.3 version",
            "npm view your-package@1.2.3 version"
          ]
        }
      ],
      "check": [
        "Запишите, какой реестр проверяли и что ответил сервер. Это важно для повторения результата.",
        "Record which registry was queried and its response. That is essential for reproducing the result."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "registry-artifact": {
      "id": "registry-artifact",
      "level": 2,
      "title": [
        "Версия нашлась. Почему пакет не скачивается?",
        "The version exists. Why will the package not download?"
      ],
      "lead": [
        "npm сначала получает описание пакета, а затем скачивает архив с файлами. Это два разных шага.",
        "npm first fetches package metadata, then downloads an archive of files. They are separate steps."
      ],
      "steps": [
        [
          "Сервер сообщает: версия 2.0.0 есть.",
          "The registry reports that version 2.0.0 exists."
        ],
        [
          "Но ссылка на архив ведёт на недоступный сервер или возвращает ошибку.",
          "But the archive URL points to an unavailable server or returns an error."
        ],
        [
          "Не стоит считать установку успешной только потому, что список версий получен.",
          "A successful version lookup is not proof that installation works."
        ]
      ],
      "examples": [
        {
          "title": [
            "Описание пакета",
            "Package metadata"
          ],
          "body": [
            "Поле dist.tarball указывает, откуда скачивать сам пакет.",
            "The dist.tarball field points to the actual package archive."
          ],
          "file": [
            "npm metadata — упрощённо",
            "npm metadata — simplified"
          ],
          "code": [
            "\"dist\": { \"tarball\": \"https://registry.example.test/pkg/-/pkg-2.0.0.tgz\" }",
            "\"dist\": { \"tarball\": \"https://registry.example.test/pkg/-/pkg-2.0.0.tgz\" }"
          ]
        },
        {
          "title": [
            "Ошибка на втором шаге",
            "Failure at the second step"
          ],
          "body": [
            "npm мог прочитать описание, но не получить содержимое.",
            "npm could read the description but could not retrieve the content."
          ],
          "file": [
            "Лог установки — пример",
            "Example install log"
          ],
          "code": [
            "npm ERR! 404 GET .../pkg-2.0.0.tgz",
            "npm ERR! 404 GET .../pkg-2.0.0.tgz"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить адрес архива",
            "Inspect the archive URL"
          ],
          "body": [
            "Проверьте источник, права доступа и ответ на скачивание. Не вставляйте корпоративные токены в логи.",
            "Check the origin, access permissions, and download response. Never paste corporate tokens into logs."
          ],
          "code": [
            "npm view pkg@2.0.0 dist.tarball",
            "npm view pkg@2.0.0 dist.tarball"
          ]
        },
        {
          "title": [
            "Не подменять факты",
            "Avoid guessing"
          ],
          "body": [
            "Разделяйте «версия известна», «архив скачан» и «пакет установлен». Если один этап неизвестен, результат установки тоже неизвестен.",
            "Separate “version listed”, “archive retrieved”, and “package installed”. If a step is unknown, the outcome remains unknown."
          ],
          "code": [
            "npm ci  # реальная проверка установки",
            "npm ci  # actual installation check"
          ]
        }
      ],
      "check": [
        "Повторите установку в чистом окружении с разрешённым реестром. Убедитесь, что скачивание завершилось.",
        "Repeat a clean install against the approved registry and confirm the download completes."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "upgrade-cohorts": {
      "id": "upgrade-cohorts",
      "level": 2,
      "title": [
        "Почему Jest пришлось обновлять вместе с ts-jest?",
        "Why did Jest and ts-jest need upgrading together?"
      ],
      "lead": [
        "Короткий ответ: да, одного Jest недостаточно. Jest запускает тесты, а ts-jest помогает ему читать тесты на TypeScript. Старый помощник не всегда понимает новый Jest. На этом история заканчивается — Angular разберём позже.",
        "Short answer: yes, upgrading Jest alone was not enough. Jest runs tests; ts-jest helps it read TypeScript tests. An older helper may not support a newer Jest. Angular is a separate lesson later."
      ],
      "steps": [
        [
          "Вы хотите обновить Jest 24 до 25. Пока ничего больше не трогаете.",
          "You want to upgrade Jest 24 to Jest 25. Nothing else changes yet."
        ],
        [
          "В проекте есть ts-jest: он переводит .ts-тест в понятный Jest JavaScript.",
          "The project uses ts-jest to turn .ts tests into JavaScript Jest can run."
        ],
        [
          "Но установленный ts-jest был рассчитан на Jest 24. Он сообщает это в требованиях пакета.",
          "The installed ts-jest was built for Jest 24. Its package metadata says so."
        ],
        [
          "Выбираем подходящий выпуск ts-jest для Jest 25, обновляем два пакета и запускаем один настоящий тест.",
          "Find a ts-jest release compatible with Jest 25, upgrade both, and run a real test."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что лежит в простом проекте",
            "Files in a small project"
          ],
          "body": [
            "Файл test.ts проверяет функцию. jest.config.js указывает, кто переводит TypeScript перед запуском теста.",
            "test.ts checks a function. jest.config.js tells Jest how to transform TypeScript before running the test."
          ],
          "file": [
            "jest.config.js",
            "jest.config.js"
          ],
          "code": [
            "module.exports = {\n  transform: { '^.+\\.tsx?$': 'ts-jest' }\n}",
            "module.exports = {\n  transform: { '^.+\\.tsx?$': 'ts-jest' }\n}"
          ]
        },
        {
          "title": [
            "Где именно конфликт",
            "Where the mismatch comes from"
          ],
          "body": [
            "Вот упрощённая модель: Jest 25 установили, а старый ts-jest разрешает только Jest 24. Это ограничение придумал автор ts-jest, не npm.",
            "Simplified example: Jest 25 is installed, but the old ts-jest declares support only for Jest 24. That rule comes from ts-jest, not from npm."
          ],
          "file": [
            "package.json — старое → новое",
            "package.json — before → after"
          ],
          "code": [
            "ДО:    \"jest\": \"24.x\", \"ts-jest\": \"24.x\"\nПОСЛЕ: \"jest\": \"25.x\", \"ts-jest\": \"24.x\"  // не подходит",
            "BEFORE: \"jest\": \"24.x\", \"ts-jest\": \"24.x\"\nAFTER:  \"jest\": \"25.x\", \"ts-jest\": \"24.x\"  // mismatch"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Подобрать версию помощника",
            "Choose a matching helper release"
          ],
          "body": [
            "Проверьте опубликованные требования выбранного выпуска. Затем обновите оба пакета одной правкой. Не надо обновлять вообще весь проект.",
            "Read the published requirements for a candidate release. Upgrade the two tools together—not the whole project."
          ],
          "code": [
            "npm view ts-jest@25 peerDependencies\nnpm install -D jest@25 ts-jest@25",
            "npm view ts-jest@25 peerDependencies\nnpm install -D jest@25 ts-jest@25"
          ]
        },
        {
          "title": [
            "Если подходящего выпуска нет",
            "If no compatible release exists"
          ],
          "body": [
            "Останьтесь на рабочей паре Jest 24 + ts-jest 24 либо выберите другой способ запускать TS-тесты. Обход peer-проверки не делает их совместимыми.",
            "Keep the working Jest 24 + ts-jest 24 pair or use another supported TypeScript transformer. Ignoring peer checks cannot make the tools compatible."
          ],
          "code": [
            "npm ci\nnpm test",
            "npm ci\nnpm test"
          ]
        }
      ],
      "check": [
        "Убедитесь, что npm ls jest ts-jest не показывает конфликт, затем запустите тест .ts. TypeScript 3.8 и Angular к этой проверке не относятся.",
        "Check npm ls jest ts-jest for conflicts, then run a .ts test. Angular and TypeScript 3.8 are not part of this issue."
      ],
      "terms": [
        {
          "term": [
            "ts-jest",
            "ts-jest"
          ],
          "meaning": [
            "Помощник Jest, который умеет обрабатывать тесты на TypeScript.",
            "The Jest helper that transforms TypeScript tests."
          ]
        },
        {
          "term": [
            "peerDependencies",
            "peerDependencies"
          ],
          "meaning": [
            "Требования пакета к библиотекам, с которыми он будет работать в одном проекте.",
            "The packages and version ranges a plugin expects to work alongside."
          ]
        }
      ],
      "layout": {
        "intro": [
          "Обычный небольшой проект, не монорепозиторий.",
          "An ordinary small project, not a monorepo."
        ],
        "paths": [
          {
            "path": "package.json",
            "depth": 0,
            "note": [
              "Здесь записаны jest и ts-jest.",
              "Lists jest and ts-jest."
            ]
          },
          {
            "path": "jest.config.js",
            "depth": 0,
            "note": [
              "Здесь включён перевод .ts-тестов.",
              "Configures transformation of .ts tests."
            ]
          },
          {
            "path": "src/sum.ts",
            "depth": 0,
            "note": [
              "Обычная функция.",
              "An ordinary function."
            ]
          },
          {
            "path": "src/sum.test.ts",
            "depth": 0,
            "note": [
              "Тест этой функции.",
              "The test for that function."
            ]
          }
        ]
      },
      "lab": {
        "prompt": [
          "Обновите связку из двух пакетов",
          "Upgrade the two-tool pair"
        ],
        "states": [
          {
            "label": [
              "До обновления",
              "Before upgrading"
            ],
            "value": [
              "Jest 24 + ts-jest 24 — подходят",
              "Jest 24 + ts-jest 24 — compatible"
            ],
            "detail": [
              "Оба выпуска рассчитаны друг на друга.",
              "The two releases support each other."
            ],
            "tone": "ok"
          },
          {
            "label": [
              "Обновить только Jest",
              "Upgrade Jest only"
            ],
            "value": [
              "Jest 25 + ts-jest 24 — конфликт",
              "Jest 25 + ts-jest 24 — mismatch"
            ],
            "detail": [
              "Старый помощник не обещает поддержку Jest 25.",
              "The old transformer does not claim to support Jest 25."
            ],
            "tone": "bad"
          },
          {
            "label": [
              "Обновить оба",
              "Upgrade both"
            ],
            "value": [
              "Jest 25 + ts-jest 25 — подходят",
              "Jest 25 + ts-jest 25 — compatible"
            ],
            "detail": [
              "Теперь осталось проверить настоящие тесты.",
              "Now run real tests to verify behavior."
            ],
            "tone": "ok"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "Dependabot: оригинальная история",
            "Dependabot: original report"
          ],
          "url": "https://github.com/dependabot/dependabot-core/issues/2032"
        }
      ]
    },
    "peer-install-mode": {
      "id": "peer-install-mode",
      "level": 2,
      "title": [
        "Почему npm install работает, а npm ci ругается?",
        "Why does npm install work but npm ci fail?"
      ],
      "lead": [
        "Иногда установка удаётся только из-за специального флага. В CI этого флага нет, и npm снова проверяет несовместимые требования.",
        "Sometimes installation succeeds only because a flag skips conflict checks. CI does not use that flag, so npm reports the mismatch."
      ],
      "steps": [
        [
          "NestJS-плагин для Elasticsearch требует клиент версии 7 или 8.",
          "A NestJS Elasticsearch plugin requires client version 7 or 8."
        ],
        [
          "В приложении стоит Elasticsearch client версии 5. В таком сочетании плагин может не работать.",
          "The application has client version 5. The plugin may not work with it."
        ],
        [
          "С флагом --legacy-peer-deps npm не обращает внимания на это требование. Но конфликт не исчезает.",
          "--legacy-peer-deps tells npm to ignore the requirement. It does not resolve the mismatch."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что попросил плагин",
            "What the plugin requested"
          ],
          "body": [
            "Это требование к версии клиента, с которым плагин будет работать.",
            "This is the client version range the plugin expects."
          ],
          "file": [
            "Зависимости из package.json — схематично",
            "Dependencies from package.json — sketch"
          ],
          "code": [
            "\"@nestjs/elasticsearch\": \"8.1.0\"\n\"@elastic/elasticsearch\": \"5.6.22\"",
            "\"@nestjs/elasticsearch\": \"8.1.0\"\n\"@elastic/elasticsearch\": \"5.6.22\""
          ]
        },
        {
          "title": [
            "Почему флаг скрывает проблему",
            "Why the flag hides the problem"
          ],
          "body": [
            "--legacy-peer-deps пропускает проверку совместимости, а не исправляет код.",
            "--legacy-peer-deps skips compatibility checking; it does not repair code."
          ],
          "file": [
            "Два варианта установки",
            "Two install modes"
          ],
          "code": [
            "npm ci                      # ERESOLVE\nnpm ci --legacy-peer-deps   # может пройти",
            "npm ci                      # ERESOLVE\nnpm ci --legacy-peer-deps   # may proceed"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Сначала исправить версии",
            "Fix the version pair first"
          ],
          "body": [
            "Проверьте, какую версию клиента поддерживает установленный плагин. Обновите клиент или выберите совместимый выпуск плагина.",
            "Check the plugin’s supported client versions. Upgrade the client or pick a compatible plugin release."
          ],
          "code": [
            "npm view @nestjs/elasticsearch@8.1.0 peerDependencies",
            "npm view @nestjs/elasticsearch@8.1.0 peerDependencies"
          ]
        },
        {
          "title": [
            "Если нужен временный обход",
            "If a temporary bypass is unavoidable"
          ],
          "body": [
            "Задокументируйте флаг в проектной .npmrc, одинаково используйте его локально и в CI и обязательно проверяйте работу приложения.",
            "Document the flag in project .npmrc, use it consistently in local and CI installs, and test actual functionality."
          ],
          "code": [
            "legacy-peer-deps=true  # .npmrc",
            "legacy-peer-deps=true  # .npmrc"
          ]
        }
      ],
      "check": [
        "Запустите чистую установку и реальный запрос к Elasticsearch. Зелёная установка с обходным флагом не доказывает совместимость.",
        "Run a clean install and a real Elasticsearch request. A successful bypassed install is not proof of compatibility."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "eslint-family": {
      "id": "eslint-family",
      "level": 2,
      "title": [
        "Обновили ESLint. Почему он перестал читать настройки?",
        "ESLint upgraded. Why will it not read the config?"
      ],
      "lead": [
        "ESLint проверяет код по правилам. В девятой большой версии изменился рекомендуемый формат конфигурации. Одного нового номера версии может быть мало.",
        "ESLint checks code using rules. ESLint 9 introduced a different default configuration format. Changing the version alone may not be enough."
      ],
      "steps": [
        [
          "В старом проекте правила лежат в .eslintrc.json.",
          "The project used .eslintrc.json for rules."
        ],
        [
          "После установки ESLint 9 команда eslint . может не найти нужную конфигурацию.",
          "After installing ESLint 9, eslint . may not find that config by default."
        ],
        [
          "Это отдельная правка настроек, не «испорченный npm».",
          "This is a configuration migration, not a broken npm install."
        ]
      ],
      "examples": [
        {
          "title": [
            "Старый вариант",
            "Old configuration"
          ],
          "body": [
            "В ESLint 8 такой файл был обычным выбором.",
            "This file was common with ESLint 8."
          ],
          "file": [
            ".eslintrc.json",
            ".eslintrc.json"
          ],
          "code": [
            "{ \"extends\": [\"eslint:recommended\"] }",
            "{ \"extends\": [\"eslint:recommended\"] }"
          ]
        },
        {
          "title": [
            "Новый вариант",
            "New configuration"
          ],
          "body": [
            "Для ESLint 9 используйте flat config и подходящие версии плагинов. Это минимальный пример, не готовая замена всех правил.",
            "ESLint 9 defaults to flat config; choose plugins that support it. This is a minimal sketch, not a complete migration of every rule."
          ],
          "file": [
            "eslint.config.mjs",
            "eslint.config.mjs"
          ],
          "code": [
            "import js from '@eslint/js';\nexport default [js.configs.recommended];",
            "import js from '@eslint/js';\nexport default [js.configs.recommended];"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Перенести конфигурацию",
            "Migrate configuration"
          ],
          "body": [
            "Посмотрите миграционный гайд, перенесите правила и обновите плагины, которым нужен новый ESLint.",
            "Follow the migration guide, migrate rules, and upgrade plugins that need a compatible ESLint."
          ],
          "code": [
            "npm install -D eslint@9 @eslint/js\nnpx eslint .",
            "npm install -D eslint@9 @eslint/js\nnpx eslint ."
          ]
        },
        {
          "title": [
            "Если миграция пока не входит в задачу",
            "If migration is out of scope"
          ],
          "body": [
            "Оставьте ESLint 8 и сохраните существующую конфигурацию до отдельной задачи.",
            "Keep ESLint 8 and the working configuration until you can migrate it as a separate task."
          ],
          "code": [
            "npm install -D eslint@8",
            "npm install -D eslint@8"
          ]
        }
      ],
      "check": [
        "Проверьте, что линтер реально прочитал правила и нашёл заранее добавленную контрольную ошибку.",
        "Confirm lint actually loads the rules and catches a deliberately introduced sample violation."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "Это отдельная правка настроек, не «испорченный npm».",
              "This is a configuration migration, not a broken npm install."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Перенести конфигурацию",
              "Migrate configuration"
            ],
            "detail": [
              "Посмотрите миграционный гайд, перенесите правила и обновите плагины, которым нужен новый ESLint.",
              "Follow the migration guide, migrate rules, and upgrade plugins that need a compatible ESLint."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "ESLint: переход на v9",
            "ESLint: migration to v9"
          ],
          "url": "https://eslint.org/docs/latest/use/configure/migration-guide"
        }
      ]
    },
    "stylelint-family": {
      "id": "stylelint-family",
      "level": 2,
      "title": [
        "Почему новый stylelint не дружит со старым плагином?",
        "Why does new stylelint conflict with an old plugin?"
      ],
      "lead": [
        "stylelint ищет ошибки в CSS. Плагины добавляют к нему правила. Версия плагина должна поддерживать выбранный stylelint.",
        "stylelint checks CSS, and plugins add rules. Each plugin version must support the chosen stylelint version."
      ],
      "steps": [
        [
          "Обновили stylelint, но оставили старый набор правил.",
          "The team upgraded stylelint but kept an older plugin."
        ],
        [
          "Набор правил ожидает старый API либо загружается старым способом.",
          "The rules package may expect an older API or module format."
        ],
        [
          "Даже когда npm согласился установить пакеты, сама проверка CSS может падать.",
          "Even when npm installs them, CSS linting may fail."
        ]
      ],
      "examples": [
        {
          "title": [
            "Где подключается плагин",
            "Where the plugin is configured"
          ],
          "body": [
            "В конфигурации явно написано, какой плагин загружается.",
            "The config explicitly names the plugin to load."
          ],
          "file": [
            ".stylelintrc.json — пример",
            ".stylelintrc.json — example"
          ],
          "code": [
            "{ \"plugins\": [\"stylelint-order\"], \"rules\": { \"order/properties-order\": [] } }",
            "{ \"plugins\": [\"stylelint-order\"], \"rules\": { \"order/properties-order\": [] } }"
          ]
        },
        {
          "title": [
            "Что уточнить перед установкой",
            "What to inspect before installing"
          ],
          "body": [
            "У опубликованного плагина есть заявленный диапазон поддерживаемых версий stylelint.",
            "The published plugin declares which stylelint versions it supports."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "npm view stylelint-order peerDependencies",
            "npm view stylelint-order peerDependencies"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Обновить совместимую пару",
            "Upgrade a compatible pair"
          ],
          "body": [
            "Сначала найдите версию плагина под нужный stylelint, затем обновите оба и запустите проверку CSS.",
            "Find a plugin release for the target stylelint, upgrade both, then lint real CSS."
          ],
          "code": [
            "npm install -D stylelint@latest stylelint-order@latest",
            "npm install -D stylelint@latest stylelint-order@latest"
          ]
        },
        {
          "title": [
            "Если подходящего плагина пока нет",
            "If no matching plugin release exists"
          ],
          "body": [
            "Останьтесь на старой паре или замените плагин. Не используйте --force как доказательство, что правила заработают.",
            "Keep the older pair or replace the plugin. Do not use --force as proof the rules will work."
          ],
          "code": [
            "npx stylelint \"src/**/*.css\"",
            "npx stylelint \"src/**/*.css\""
          ]
        }
      ],
      "check": [
        "Проверьте конфиг и запуск реального правила на тестовом CSS. Установка без ошибок — лишь первый шаг.",
        "Check the config and run a real rule on sample CSS. Installation is only the first step."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "Даже когда npm согласился установить пакеты, сама проверка CSS может падать.",
              "Even when npm installs them, CSS linting may fail."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Обновить совместимую пару",
              "Upgrade a compatible pair"
            ],
            "detail": [
              "Сначала найдите версию плагина под нужный stylelint, затем обновите оба и запустите проверку CSS.",
              "Find a plugin release for the target stylelint, upgrade both, then lint real CSS."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "stylelint: документация конфигурации",
            "stylelint: configuration docs"
          ],
          "url": "https://stylelint.io/user-guide/configure/"
        }
      ]
    },
    "storybook-family": {
      "id": "storybook-family",
      "level": 2,
      "title": [
        "Обновили Storybook. Почему сломалась одна вкладка?",
        "Storybook upgraded. Why did one panel break?"
      ],
      "lead": [
        "Storybook — отдельное приложение для просмотра компонентов. Дополнительные вкладки создают addons, и они тоже должны подходить новой версии.",
        "Storybook is an app for browsing UI components. Addons add extra panels and must support your Storybook version."
      ],
      "steps": [
        [
          "Команда обновила Storybook 7 до 8, но забыла про один addon.",
          "The team upgraded Storybook 7 to 8 but left one addon behind."
        ],
        [
          "Основное окно может открыться, а вкладка старого addon не появится.",
          "The main page may open while the old addon panel does not."
        ],
        [
          "У addon своя версия и свои требования к Storybook.",
          "An addon has its own version and compatibility requirements."
        ]
      ],
      "examples": [
        {
          "title": [
            "Где видны подключённые дополнения",
            "Where addons are listed"
          ],
          "body": [
            "Это условный список: важно, что каждый addon — отдельный пакет.",
            "Illustrative list: each addon is a separate package."
          ],
          "file": [
            ".storybook/main.ts — пример",
            ".storybook/main.ts — example"
          ],
          "code": [
            "export default {\n  addons: ['@storybook/addon-links', '@storybook/addon-a11y']\n};",
            "export default {\n  addons: ['@storybook/addon-links', '@storybook/addon-a11y']\n};"
          ]
        },
        {
          "title": [
            "Почему есть два номера",
            "Why there are two version numbers"
          ],
          "body": [
            "Версия основного Storybook и выпуск addon не обязаны совпадать цифрами, но должны быть совместимы.",
            "Storybook and its addon have different version numbers; the important thing is compatibility."
          ],
          "file": [
            "package.json — пример",
            "package.json — example"
          ],
          "code": [
            "\"storybook\": \"8.x\", \"@storybook/addon-a11y\": \"7.x\"",
            "\"storybook\": \"8.x\", \"@storybook/addon-a11y\": \"7.x\""
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Согласовать версии addons",
            "Align addon releases"
          ],
          "body": [
            "Проверьте список установленных addons и требования каждого. Выберите выпуски под целевой Storybook.",
            "List all addons, inspect each requirement, and select releases compatible with the target Storybook."
          ],
          "code": [
            "npm ls storybook @storybook/addon-a11y",
            "npm ls storybook @storybook/addon-a11y"
          ]
        },
        {
          "title": [
            "Отложить одно сложное обновление",
            "Delay a risky upgrade"
          ],
          "body": [
            "Если критичный addon ещё не поддерживает новую версию, безопаснее оставить прежний Storybook или заменить addon.",
            "If an essential addon has no compatible release, keep the older Storybook or replace the addon."
          ],
          "code": [
            "npm run storybook",
            "npm run storybook"
          ]
        }
      ],
      "check": [
        "Откройте Storybook и проверьте не только главную страницу, но и работу конкретной вкладки addon.",
        "Open Storybook and test the actual addon panel—not only the main page."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "У addon своя версия и свои требования к Storybook.",
              "An addon has its own version and compatibility requirements."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Согласовать версии addons",
              "Align addon releases"
            ],
            "detail": [
              "Проверьте список установленных addons и требования каждого. Выберите выпуски под целевой Storybook.",
              "List all addons, inspect each requirement, and select releases compatible with the target Storybook."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "Storybook: как обновлять",
            "Storybook: upgrading"
          ],
          "url": "https://storybook.js.org/docs/configure/upgrading"
        }
      ]
    },
    "shared-host": {
      "id": "shared-host",
      "level": 2,
      "title": [
        "Почему любые два плагина работают, а все три — нет?",
        "Why can any two plugins work, but not all three?"
      ],
      "lead": [
        "Три плагина работают внутри одного редактора. Каждый знает разные версии редактора. Любые два можно подобрать, но для трёх сразу общей версии нет.",
        "Three plugins share one editor. Each supports different editor versions. Every pair can work, but no single editor version works for all three."
      ],
      "steps": [
        [
          "A поддерживает редактор 1 или 2.",
          "A supports editor 1 or 2."
        ],
        [
          "B поддерживает редактор 2 или 3.",
          "B supports editor 2 or 3."
        ],
        [
          "C поддерживает редактор 1 или 3.",
          "C supports editor 1 or 3."
        ],
        [
          "Для редактора 2 подходят A и B, а C нет. Значит, ищем новый C с поддержкой редактора 2.",
          "Editor 2 works with A and B, but not C. So look for a newer C that supports editor 2."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что именно проверяет npm",
            "What npm checks"
          ],
          "body": [
            "В каждом плагине автор пишет, какие выпуски editor он поддерживает. Это не три разных редактора: все плагины должны работать с одним.",
            "Each plugin declares which editor releases it supports. These are not three separate editors: all plugins share one."
          ],
          "file": [
            "C@1/package.json — условный пример",
            "C@1/package.json — illustrative"
          ],
          "code": [
            "\"peerDependencies\": { \"editor\": \"1 || 3\" }",
            "\"peerDependencies\": { \"editor\": \"1 || 3\" }"
          ]
        },
        {
          "title": [
            "Как выглядел бы подходящий выпуск",
            "What a compatible release looks like"
          ],
          "body": [
            "Если автор C выпустил новую версию с поддержкой editor 2, можно оставить все три плагина.",
            "If C releases support for editor 2, all three plugins can remain."
          ],
          "file": [
            "C@2/package.json — условный пример",
            "C@2/package.json — illustrative"
          ],
          "code": [
            "\"peerDependencies\": { \"editor\": \"2 || 3\" }",
            "\"peerDependencies\": { \"editor\": \"2 || 3\" }"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Начать с выбранного редактора",
            "Start with the editor version you want"
          ],
          "body": [
            "Выберите редактор 2 и найдите строку плагина с прочерком. Посмотрите, появился ли новый выпуск именно этого плагина.",
            "Choose editor 2 and find the row with a dash. Check whether that plugin has a new compatible release."
          ],
          "code": [
            "npm view plugin-c versions",
            "npm view plugin-c versions"
          ]
        },
        {
          "title": [
            "Если никто не выпустил подходящую версию",
            "If no compatible release exists"
          ],
          "body": [
            "Можно оставить старый редактор с другими плагинами, отключить C или заменить его. --force не добавит C поддержку editor 2.",
            "Keep another editor version with a different plugin set, disable C, or replace it. --force cannot add editor 2 support to C."
          ],
          "code": [
            "npm view plugin-c@2 peerDependencies",
            "npm view plugin-c@2 peerDependencies"
          ]
        }
      ],
      "check": [
        "В интерактивной таблице выберите редактор 2 и «Обновить C». В реальном приложении после установки проверьте действие всех трёх плагинов.",
        "In the interactive table select editor 2 and “Upgrade C”. Then test each plugin in the real application."
      ],
      "terms": [
        {
          "term": [
            "Общий движок",
            "Shared engine"
          ],
          "meaning": [
            "Один пакет-основа, которым одновременно пользуются несколько плагинов.",
            "One host package used by multiple plugins at the same time."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "nested-copies": {
      "id": "nested-copies",
      "level": 2,
      "title": [
        "Почему в проекте две версии одного пакета?",
        "Why does the project contain two copies of one package?"
      ],
      "lead": [
        "node_modules может содержать несколько копий одной библиотеки. Это нормально, если разные части приложения требуют несовместимые версии.",
        "node_modules may hold more than one version of a package. That can be normal when different dependencies need different versions."
      ],
      "steps": [
        [
          "Приложение использует утилиту kleur 4.",
          "The app uses kleur 4."
        ],
        [
          "Старый инструмент внутри себя использует kleur 3.",
          "An older tool uses kleur 3 internally."
        ],
        [
          "Обновить корневую копию — не то же самое, что обновить вложенную копию.",
          "Updating the root copy does not update the nested one."
        ]
      ],
      "examples": [
        {
          "title": [
            "Где находится каждая копия",
            "Where each copy lives"
          ],
          "body": [
            "У node_modules/legacy-tool есть собственный node_modules. Его файлы будут загружать вложенную версию, если она там есть.",
            "node_modules/legacy-tool has its own node_modules. Its code loads the nested version if present."
          ],
          "file": [
            "Структура установки — пример",
            "Example install tree"
          ],
          "code": [
            "node_modules/kleur/                 4.0.0\nnode_modules/legacy-tool/node_modules/kleur/ 3.0.3",
            "node_modules/kleur/                 4.0.0\nnode_modules/legacy-tool/node_modules/kleur/ 3.0.3"
          ]
        },
        {
          "title": [
            "Что покажет поиск",
            "What a search shows"
          ],
          "body": [
            "Команда npm ls перечисляет обе версии. Одна свежая запись не означает, что старая исчезла везде.",
            "npm ls lists both versions. One up-to-date entry does not mean the old one is gone."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "npm ls kleur --all",
            "npm ls kleur --all"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Найти, кто держит старую копию",
            "Find who keeps the older copy"
          ],
          "body": [
            "Посмотрите npm explain и обновляйте тот инструмент, которому нужна старая версия.",
            "Use npm explain and upgrade the tool that still needs the older version."
          ],
          "code": [
            "npm explain kleur",
            "npm explain kleur"
          ]
        },
        {
          "title": [
            "Если обе копии допустимы",
            "If both copies are acceptable"
          ],
          "body": [
            "Не заставляйте их обязательно стать одной. Сначала проверьте, что использование старой версии безопасно и что проект работает.",
            "Do not force them into one copy without a reason. Check the old version’s security and runtime behavior first."
          ],
          "code": [
            "npm audit",
            "npm audit"
          ]
        }
      ],
      "check": [
        "Укажите путь к каждой копии и того, кто её установил. После обновления сравните npm ls до и после.",
        "Record each copy’s path and which package brought it in. Compare npm ls before and after."
      ],
      "terms": [
        {
          "term": [
            "Вложенная зависимость",
            "Nested dependency"
          ],
          "meaning": [
            "Копия пакета внутри папки другого пакета.",
            "A package copy inside another package’s folder."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "borrowed-dependency": {
      "id": "borrowed-dependency",
      "level": 3,
      "title": [
        "Что такое монорепозиторий и как приложение меняет чужую форму?",
        "What is a monorepo, and why can one app affect another form?"
      ],
      "lead": [
        "Монорепозиторий — один Git-репозиторий с несколькими приложениями и общими библиотеками. Форму сделали один раз в папке ui. Она использует Formik, но забыла указать это в своём package.json.",
        "A monorepo is one Git repository containing several apps and shared libraries. The ui folder supplies a shared form using Formik but forgot to declare it in its own package.json."
      ],
      "steps": [
        [
          "Сайт установил Formik 1, и общая форма нашла эту копию в общей папке.",
          "The website installed Formik 1, and the shared form found it in a common folder."
        ],
        [
          "Добавили приложение отчётов, использующее Formik 2. Yarn по-другому разложил пакеты.",
          "A Reports app using Formik 2 was added. Yarn changed where it placed the packages."
        ],
        [
          "Код формы остался прежним, а импорт стал загружать Formik 2.",
          "The form code stayed the same, but its import began loading Formik 2."
        ],
        [
          "Просто установить Formik 1 внутри ui тоже может быть недостаточно: страница и поле должны работать с согласованной копией.",
          "Simply pinning Formik 1 inside ui may not fix everything: the page and field need to use compatible instances."
        ]
      ],
      "examples": [
        {
          "title": [
            "Чего не хватает в ui",
            "What is missing from ui"
          ],
          "body": [
            "EmailField импортирует Formik, но собственный манифест ui не сообщает, что он нужен. Раньше это случайно работало.",
            "EmailField imports Formik, but ui’s own manifest does not mention it. It used to work by accident."
          ],
          "file": [
            "packages/ui/EmailField.tsx",
            "packages/ui/EmailField.tsx"
          ],
          "code": [
            "import { Field } from 'formik';\nexport const EmailField = () => <Field name='email' />;",
            "import { Field } from 'formik';\nexport const EmailField = () => <Field name='email' />;"
          ]
        },
        {
          "title": [
            "Почему «своя копия» — не всегда решение",
            "Why a private copy is not always a fix"
          ],
          "body": [
            "Страница отчётов открывает форму через Formik 2. Если EmailField использует собственный Formik 1, они могут не делиться данными одной формы.",
            "Reports creates a form using Formik 2. If EmailField uses a separate Formik 1, they may not share the same form context."
          ],
          "file": [
            "packages/reports/Filter.tsx",
            "packages/reports/Filter.tsx"
          ],
          "code": [
            "import { Formik } from 'formik';  // версия 2\nimport { EmailField } from '@demo/ui';  // версия 1",
            "import { Formik } from 'formik';  // version 2\nimport { EmailField } from '@demo/ui';  // version 1"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Явно описать требования ui",
            "Declare ui’s requirements"
          ],
          "body": [
            "Общая библиотека должна объявить Formik в подходящем поле зависимостей (часто peerDependencies для разделяемой формы), а приложение — предоставить совместимый выпуск.",
            "The shared ui library should declare its Formik requirement (often peerDependencies for a shared form), and the app should supply a compatible release."
          ],
          "code": [
            "\"peerDependencies\": { \"formik\": \"^1.5.8\" }",
            "\"peerDependencies\": { \"formik\": \"^1.5.8\" }"
          ]
        },
        {
          "title": [
            "Если нужен Formik 2",
            "If the app needs Formik 2"
          ],
          "body": [
            "Перепишите общую форму под Formik 2 и проверьте приложения, которые её используют. Не делайте вид, что оба выпуска равнозначны.",
            "Migrate the shared form to Formik 2 and test the apps using it. Do not assume the major releases are interchangeable."
          ],
          "code": [
            "yarn why formik",
            "yarn why formik"
          ]
        }
      ],
      "check": [
        "Запустите форму в каждом приложении, в котором она используется. Проверьте ввод текста и отправку, а не только установку.",
        "Open the form in every app that uses it. Test typing and submitting, not just installation."
      ],
      "terms": [
        {
          "term": [
            "Монорепозиторий",
            "Monorepo"
          ],
          "meaning": [
            "Несколько приложений или библиотек в одном Git-репозитории.",
            "Multiple apps or libraries in one Git repository."
          ]
        },
        {
          "term": [
            "Hoisting",
            "Hoisting"
          ],
          "meaning": [
            "Пакетный менеджер может вынести общую копию в верхний node_modules. Это способ расположения файлов, а не гарантия совместимости.",
            "A package manager may place a shared copy in a parent node_modules. That describes placement, not guaranteed compatibility."
          ]
        }
      ],
      "layout": {
        "intro": [
          "Все папки ниже живут в одном Git-репозитории. Это и называется монорепозиторием.",
          "All these folders live in one Git repository. That is a monorepo."
        ],
        "paths": [
          {
            "path": "package.json",
            "depth": 0,
            "note": [
              "Общие настройки workspaces.",
              "Shared workspace setup."
            ]
          },
          {
            "path": "packages/site/package.json",
            "depth": 1,
            "note": [
              "Старый сайт просит Formik 1.",
              "Older site requests Formik 1."
            ]
          },
          {
            "path": "packages/reports/package.json",
            "depth": 1,
            "note": [
              "Новое приложение просит Formik 2.",
              "New Reports app requests Formik 2."
            ]
          },
          {
            "path": "packages/ui/package.json",
            "depth": 1,
            "note": [
              "Общие поля забыли объявить Formik.",
              "Shared ui forgot its Formik requirement."
            ]
          },
          {
            "path": "packages/ui/EmailField.tsx",
            "depth": 2,
            "note": [
              "Здесь стоит import из formik.",
              "Contains an import from formik."
            ]
          }
        ]
      },
      "lab": null,
      "sources": []
    },
    "react-instance": {
      "id": "react-instance",
      "level": 3,
      "title": [
        "Почему две копии React ломают компонент?",
        "Why can two React copies break a component?"
      ],
      "lead": [
        "Иногда даже одинаковые номера версии не спасают. Компонент и приложение должны пользоваться одной и той же копией React, а не двумя отдельными.",
        "Sometimes even identical version numbers are not enough. A component and its renderer need to use the same React instance, not two separate copies."
      ],
      "steps": [
        [
          "Приложение рисует кнопку через react-dom.",
          "The app renders a button using react-dom."
        ],
        [
          "Локальная библиотека Button импортирует вторую копию react из своей папки.",
          "A locally linked Button library imports another react copy from its folder."
        ],
        [
          "Хуки могут вызвать Invalid hook call, хотя npm install завершился успешно.",
          "Hooks may produce Invalid hook call even though npm install succeeded."
        ]
      ],
      "examples": [
        {
          "title": [
            "Одинаковый номер, разные папки",
            "Same number, different folders"
          ],
          "body": [
            "Файлы — две отдельные копии. Это важнее, чем совпадающие номера.",
            "These are separate files. That matters more than the matching versions."
          ],
          "file": [
            "Структура node_modules — пример",
            "Example node_modules tree"
          ],
          "code": [
            "app/node_modules/react/                 19.0.0\nui/node_modules/react/                  19.0.0",
            "app/node_modules/react/                 19.0.0\nui/node_modules/react/                  19.0.0"
          ]
        },
        {
          "title": [
            "Где ошибка проявляется",
            "Where the error appears"
          ],
          "body": [
            "Компонент использует useState, но его React не связан с тем, через который страница отрисовывается.",
            "The component calls useState from an instance different from the renderer’s React."
          ],
          "file": [
            "ui/Button.tsx",
            "ui/Button.tsx"
          ],
          "code": [
            "import { useState } from 'react';\nexport function Button() { const [n,setN] = useState(0); return <button onClick={() => setN(n+1)}>{n}</button>; }",
            "import { useState } from 'react';\nexport function Button() { const [n,setN] = useState(0); return <button onClick={() => setN(n+1)}>{n}</button>; }"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Не устанавливать отдельный React для UI",
            "Avoid a private React in a UI library"
          ],
          "body": [
            "Обычно библиотека объявляет React как peerDependency, чтобы приложение предоставило свой экземпляр. В сборке библиотеки React оставляют внешним пакетом.",
            "UI libraries typically declare React as a peer dependency so the app supplies one instance. Keep React external when bundling the library."
          ],
          "code": [
            "\"peerDependencies\": { \"react\": \"^19.0.0\" }",
            "\"peerDependencies\": { \"react\": \"^19.0.0\" }"
          ]
        },
        {
          "title": [
            "Проверить симлинки и настройки сборщика",
            "Inspect symlinks and bundler aliases"
          ],
          "body": [
            "В linked-пакетах проверьте, к какой физической папке ведёт react. Дедупликация и алиасы зависят от инструмента сборки.",
            "For linked packages, check which physical react directory resolves. Dedupe and alias settings vary by bundler."
          ],
          "code": [
            "npm ls react react-dom",
            "npm ls react react-dom"
          ]
        }
      ],
      "check": [
        "Откройте компонент и вызовите хук. Проверьте, что renderer и компонент видят один React.",
        "Render the component and call a hook. Verify that the renderer and component resolve the same React."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "React: Invalid hook call",
            "React: Invalid hook call"
          ],
          "url": "https://react.dev/warnings/invalid-hook-call-warning"
        }
      ]
    },
    "consumer-tarball": {
      "id": "consumer-tarball",
      "level": 3,
      "title": [
        "Почему библиотека работает у автора, а у другого человека нет?",
        "Why does a library work locally but fail for its users?"
      ],
      "lead": [
        "Разработчик проверяет исходники у себя. Пользователь устанавливает опубликованный архив. В архиве может не оказаться нужного файла, а настройки библиотеки могут не передаться чужому приложению.",
        "The author tests their local source. Users install a published archive, which might omit needed files or not carry over root-only settings."
      ],
      "steps": [
        [
          "Библиотека читает файл dist/index.js. Локально он есть.",
          "A library loads dist/index.js. It exists on the author’s machine."
        ],
        [
          "При публикации этот файл случайно не вошёл в архив.",
          "The file was accidentally omitted from the published archive."
        ],
        [
          "В другом приложении import ломается.",
          "Import fails in the consuming app."
        ]
      ],
      "examples": [
        {
          "title": [
            "Откуда пакет ожидает код",
            "Where the package expects code"
          ],
          "body": [
            "Поле main говорит Node, какой файл открыть.",
            "The main field tells Node which file to open."
          ],
          "file": [
            "package.json библиотеки",
            "Library package.json"
          ],
          "code": [
            "\"main\": \"dist/index.js\",\n\"files\": [\"src\"]",
            "\"main\": \"dist/index.js\",\n\"files\": [\"src\"]"
          ]
        },
        {
          "title": [
            "Другая ловушка: overrides",
            "Another trap: overrides"
          ],
          "body": [
            "Автор исправил axios через overrides в своём приложении. Установив библиотеку, другой проект не наследует эти overrides автоматически.",
            "The author fixed axios via an override in their root project. Another app installing the library does not automatically inherit that override."
          ],
          "file": [
            "package.json (корень проекта автора)",
            "package.json (author’s project root)"
          ],
          "code": [
            "\"overrides\": { \"axios\": \"1.7.0\" }",
            "\"overrides\": { \"axios\": \"1.7.0\" }"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить содержимое публикации",
            "Inspect what will be published"
          ],
          "body": [
            "Соберите библиотеку и посмотрите, что попадёт в tarball. Затем установите его в отдельный чистый проект.",
            "Build the library, inspect the tarball, then install it in a separate clean application."
          ],
          "code": [
            "npm pack --dry-run\nnpm pack",
            "npm pack --dry-run\nnpm pack"
          ]
        },
        {
          "title": [
            "Исправить требования пакета",
            "Fix the package declaration"
          ],
          "body": [
            "Нужные зависимости и файлы должны быть описаны в манифесте самой библиотеки. Не рассчитывайте на корневые overrides пользователя.",
            "Declare required files and dependencies in the library manifest. Do not rely on a user app inheriting your overrides."
          ],
          "code": [
            "\"files\": [\"dist\"]",
            "\"files\": [\"dist\"]"
          ]
        }
      ],
      "check": [
        "Установите полученный tarball в пустое приложение и проверьте import и основной сценарий работы.",
        "Install the resulting tarball in an empty app and test its import and main behavior."
      ],
      "terms": [
        {
          "term": [
            "Tarball",
            "Tarball"
          ],
          "meaning": [
            "Архив с опубликованными файлами пакета. Это то, что реально скачает npm.",
            "An archive containing the published package files; this is what npm downloads."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "merged-branches": {
      "id": "merged-branches",
      "level": 3,
      "title": [
        "Почему две зелёные ветки могут сломаться после merge?",
        "Why can two green branches fail after merging?"
      ],
      "lead": [
        "Один разработчик обновил библиотеку. Другой в это время написал код для старой версии. В каждой ветке всё работало, а после merge получилась новая комбинация.",
        "One developer upgraded a library. Another wrote code against the old version. Each branch worked independently; the merge creates a new combination."
      ],
      "steps": [
        [
          "Аня обновила функцию, которая отправляет запросы.",
          "Anya upgraded a request library."
        ],
        [
          "Борис в своей ветке добавил кнопку, которая использует старый метод.",
          "Boris added a button using the old method."
        ],
        [
          "Git объединил файлы, но не проверил, совместим ли метод с новой версией.",
          "Git merged the files but did not verify the old method still exists."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что добавил Борис",
            "What Boris added"
          ],
          "body": [
            "В его ветке старый метод ещё существовал.",
            "The old method still existed on his branch."
          ],
          "file": [
            "src/export.ts — ветка Бориса",
            "src/export.ts — Boris’s branch"
          ],
          "code": [
            "import { oldExport } from \"report-kit\";\noldExport(data);",
            "import { oldExport } from \"report-kit\";\noldExport(data);"
          ]
        },
        {
          "title": [
            "Что поменяла Аня",
            "What Anya changed"
          ],
          "body": [
            "В новой версии пакет предлагает другой вызов; обновлённый код Бориса в merge не появился.",
            "The new release has a different API; Boris’s code was not migrated during merge."
          ],
          "file": [
            "package.json — ветка Ани",
            "package.json — Anya’s branch"
          ],
          "code": [
            "\"report-kit\": \"2.0.0\"  // oldExport удалён",
            "\"report-kit\": \"2.0.0\"  // oldExport removed"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить именно объединённый код",
            "Test the merged state"
          ],
          "body": [
            "После merge выполните чистую установку и проверку действия кнопки. В идеале CI должен запускаться на итоговом кандидате в main.",
            "After merge, reinstall and test the button. Ideally CI runs on the actual candidate that will enter main."
          ],
          "code": [
            "npm ci\nnpm test",
            "npm ci\nnpm test"
          ]
        },
        {
          "title": [
            "Исправить вызов",
            "Update the call"
          ],
          "body": [
            "Если старый API удалён, перепишите новый код под новую версию библиотеки или откатите обновление.",
            "If the old API is gone, migrate the new call or revert the incompatible upgrade."
          ],
          "code": [
            "import { exportReport } from \"report-kit\";",
            "import { exportReport } from \"report-kit\";"
          ]
        }
      ],
      "check": [
        "Проверьте конкретный коммит после объединения, а не только два старых статуса отдельных PR.",
        "Test the exact merged commit, not only the two old PR statuses."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "npm-lock-reader": {
      "id": "npm-lock-reader",
      "level": 3,
      "title": [
        "Почему сам npm не принимает свой lock-файл?",
        "Why can npm reject a lockfile it created?"
      ],
      "lead": [
        "Иногда дело не в вашем коде: у разных версий npm бывали ошибки при обновлении lock-файла с overrides.",
        "Sometimes your code is fine: npm versions have had bugs involving overrides and lockfile updates."
      ],
      "steps": [
        [
          "Проект заставляет npm выбрать определённую версию вложенного пакета.",
          "A project forces npm to select a particular nested package version."
        ],
        [
          "Одной версией npm файл создаётся, следующая версия npm ci говорит, что запись отсутствует.",
          "One npm release creates the lock; another npm ci says an entry is missing."
        ],
        [
          "Поэтому при расследовании важно записать версию самого npm.",
          "Record the npm version when investigating."
        ]
      ],
      "examples": [
        {
          "title": [
            "Как выглядит override",
            "What an override looks like"
          ],
          "body": [
            "Это просьба корневого проекта заменить выбранную версию вложенной зависимости.",
            "An override asks npm at the project root to replace a nested dependency version."
          ],
          "file": [
            "package.json",
            "package.json"
          ],
          "code": [
            "\"overrides\": { \"trim-newlines\": \"1.0.0\" }",
            "\"overrides\": { \"trim-newlines\": \"1.0.0\" }"
          ]
        },
        {
          "title": [
            "Как проявилась ошибка",
            "How the error appeared"
          ],
          "body": [
            "В реальном issue одна версия npm ожидала запись, которой не было в lock-файле.",
            "In a real npm issue, one npm version expected an entry absent from the lockfile."
          ],
          "file": [
            "Ошибка npm ci",
            "npm ci error"
          ],
          "code": [
            "Missing: trim-newlines@1.0.0 from lock file",
            "Missing: trim-newlines@1.0.0 from lock file"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Сравнить npm на двух машинах",
            "Compare npm versions"
          ],
          "body": [
            "Не меняйте сразу все зависимости. Для начала сравните версии Node/npm и воспроизведите на чистой установке.",
            "Do not immediately change all dependencies. First compare Node/npm versions and reproduce on a clean install."
          ],
          "code": [
            "node -v\nnpm -v\nnpm ci",
            "node -v\nnpm -v\nnpm ci"
          ]
        },
        {
          "title": [
            "Взять исправленный npm",
            "Use a fixed npm release"
          ],
          "body": [
            "Если проблема подтверждена как баг npm, обновите или зафиксируйте проверенный выпуск менеджера. Следите, чтобы override остался в lock.",
            "If it is a confirmed npm bug, upgrade or pin a tested npm release. Verify the override remains effective."
          ],
          "code": [
            "git diff -- package-lock.json",
            "git diff -- package-lock.json"
          ]
        }
      ],
      "check": [
        "Сравните lock после npm install, проверьте саму подмену и повторите npm ci.",
        "Compare the lock after npm install, verify the override still works, and rerun npm ci."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "npm issue #4684",
            "npm issue #4684"
          ],
          "url": "https://github.com/npm/cli/issues/4684"
        }
      ]
    },
    "across-environments": {
      "id": "across-environments",
      "level": 3,
      "title": [
        "Почему у коллеги установка ведёт себя иначе?",
        "Why does installation behave differently on another machine?"
      ],
      "lead": [
        "Один и тот же Git-коммит может устанавливаться по-разному, если отличаются Node, npm, настройки или операционная система.",
        "The same Git commit can install differently when Node, npm, settings, or the operating system differ."
      ],
      "steps": [
        [
          "У вас npm 11, у коллеги npm 10.",
          "You use npm 11, your teammate uses npm 10."
        ],
        [
          "У вас есть персональный .npmrc с флагом, у коллеги его нет.",
          "Your personal .npmrc contains a flag; your teammate’s does not."
        ],
        [
          "При одинаковом package.json установка может дать разные результаты.",
          "Even with the same package.json, installation can differ."
        ]
      ],
      "examples": [
        {
          "title": [
            "Начните с версий инструментов",
            "Start with tool versions"
          ],
          "body": [
            "Это две простые команды, которые полезно приложить к отчёту об ошибке.",
            "These two commands are useful in an issue report."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "node -v\nnpm -v",
            "node -v\nnpm -v"
          ]
        },
        {
          "title": [
            "Где может скрываться разница",
            "Where a difference may hide"
          ],
          "body": [
            "Настройка в пользовательском .npmrc влияет на установку даже при неизменном Git.",
            "A user-level .npmrc can affect installation even when Git did not change."
          ],
          "file": [
            ".npmrc — учебный пример",
            ".npmrc — illustrative"
          ],
          "code": [
            "legacy-peer-deps=true",
            "legacy-peer-deps=true"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Зафиксировать окружение",
            "Pin the environment"
          ],
          "body": [
            "Документируйте поддерживаемые Node/npm, а важные режимы установки держите в проектной конфигурации.",
            "Document supported Node/npm releases and keep important installation modes in project configuration."
          ],
          "code": [
            "\"engines\": { \"node\": \">=20\" }",
            "\"engines\": { \"node\": \">=20\" }"
          ]
        },
        {
          "title": [
            "Сравнить чистые установки",
            "Compare clean installs"
          ],
          "body": [
            "Не переносите старый node_modules. Выполните npm ci на обеих машинах с одинаковыми параметрами.",
            "Do not reuse old node_modules. Run npm ci on both machines with the same flags."
          ],
          "code": [
            "npm ci",
            "npm ci"
          ]
        }
      ],
      "check": [
        "Запишите Node, npm, OS/архитектуру, registry, настройки и результат npm ci.",
        "Record Node, npm, OS/architecture, registry, install settings, and the npm ci result."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "При одинаковом package.json установка может дать разные результаты.",
              "Even with the same package.json, installation can differ."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Зафиксировать окружение",
              "Pin the environment"
            ],
            "detail": [
              "Документируйте поддерживаемые Node/npm, а важные режимы установки держите в проектной конфигурации.",
              "Document supported Node/npm releases and keep important installation modes in project configuration."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": []
    },
    "rollup-platform": {
      "id": "rollup-platform",
      "level": 3,
      "title": [
        "Почему Rollup работает на Mac, но падает в Linux?",
        "Why does Rollup work on Mac but fail on Linux?"
      ],
      "lead": [
        "Некоторым сборщикам нужны разные маленькие пакеты для разных систем. Если в lock-файле сохранилась только версия для Mac, Linux не найдёт свою.",
        "Some build tools use different small packages per operating system. If the lockfile only includes the macOS variant, Linux may be missing its own."
      ],
      "steps": [
        [
          "На Mac npm подобрал специальный пакет для macOS.",
          "On a Mac npm selects a macOS-specific binary package."
        ],
        [
          "Из-за ошибки старой версии npm в lock-файле могли пропасть варианты для других платформ.",
          "A bug in an older npm release could drop other platform variants from the lockfile."
        ],
        [
          "В Linux CI Rollup пытается загрузить свою библиотеку и не находит её.",
          "Linux CI tries to load its own binary package and cannot find it."
        ]
      ],
      "examples": [
        {
          "title": [
            "Разные имена для разных систем",
            "Different names for different systems"
          ],
          "body": [
            "Эти пакеты относятся к одному Rollup, но предназначены для разных систем.",
            "Both packages belong to Rollup, but target different systems."
          ],
          "file": [
            "lock-файл — упрощённо",
            "Simplified lockfile"
          ],
          "code": [
            "@rollup/rollup-darwin-arm64  # Mac ARM\n@rollup/rollup-linux-x64-gnu # Linux x64",
            "@rollup/rollup-darwin-arm64  # Mac ARM\n@rollup/rollup-linux-x64-gnu # Linux x64"
          ]
        },
        {
          "title": [
            "Что видит Linux",
            "What Linux sees"
          ],
          "body": [
            "Нужного Linux-варианта нет в фиксированном наборе.",
            "The pinned dependency tree lacks the Linux-specific variant."
          ],
          "file": [
            "Лог CI — пример",
            "Example CI log"
          ],
          "code": [
            "Cannot find module @rollup/rollup-linux-x64-gnu",
            "Cannot find module @rollup/rollup-linux-x64-gnu"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить lock и npm",
            "Inspect the lock and npm version"
          ],
          "body": [
            "Убедитесь, что lock содержит пакеты для поддерживаемых платформ. Для известного бага npm используйте исправленный выпуск.",
            "Ensure the lock includes variants for your supported platforms. Use a fixed npm version for the known npm bug."
          ],
          "code": [
            "npm -v\nnode -v",
            "npm -v\nnode -v"
          ]
        },
        {
          "title": [
            "Проверить вторую систему",
            "Test another OS"
          ],
          "body": [
            "Не копируйте node_modules с Mac на Linux. Собирайте через npm ci в Linux CI.",
            "Never copy Mac node_modules to Linux. Run npm ci in Linux CI."
          ],
          "code": [
            "npm ci\nnpm run build",
            "npm ci\nnpm run build"
          ]
        }
      ],
      "check": [
        "Проверьте lock и успешный build на каждой целевой платформе. Один Mac — не доказательство для Linux.",
        "Inspect the lock and build on each target platform. A working Mac is not proof for Linux."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "npm issue #7961",
            "npm issue #7961"
          ],
          "url": "https://github.com/npm/cli/issues/7961"
        }
      ]
    },
    "module-loader": {
      "id": "module-loader",
      "level": 3,
      "title": [
        "Почему в файле import, а ошибка говорит require?",
        "Why does the source say import but the error says require?"
      ],
      "lead": [
        "TypeScript-файл — не всегда тот код, который запускает Node. Компилятор может заменить import на require. Новый пакет может принимать только import.",
        "The TypeScript source is not always what Node runs. The compiler may turn import into require, while a new dependency supports import only."
      ],
      "steps": [
        [
          "Разработчик написал import chalk from \"chalk\".",
          "The developer wrote import chalk from \"chalk\"."
        ],
        [
          "tsconfig.json велел создавать CommonJS.",
          "tsconfig.json requested CommonJS output."
        ],
        [
          "В итоговом JavaScript оказался require(\"chalk\"). В прежних окружениях Chalk 5 на таком вызове падал.",
          "The emitted JavaScript contained require(\"chalk\"). In the reported older environment, Chalk 5 rejected that loading style."
        ]
      ],
      "examples": [
        {
          "title": [
            "То, что вы написали",
            "What you wrote"
          ],
          "body": [
            "На первый взгляд современный импорт.",
            "At first glance, a modern import."
          ],
          "file": [
            "src/report.ts",
            "src/report.ts"
          ],
          "code": [
            "import chalk from 'chalk';\nconsole.log(chalk.green('OK'));",
            "import chalk from 'chalk';\nconsole.log(chalk.green('OK'));"
          ]
        },
        {
          "title": [
            "То, что получилось после компиляции",
            "What compilation emitted"
          ],
          "body": [
            "При module: commonjs импорт обычно превращается в require. Поведение зависит от версии Node и конфигурации.",
            "With module: commonjs, the import typically becomes require. Exact behavior depends on Node version and settings."
          ],
          "file": [
            "tsconfig.json → dist/report.js",
            "tsconfig.json → dist/report.js"
          ],
          "code": [
            "\"module\": \"commonjs\"\n// dist/report.js: require(\"chalk\")",
            "\"module\": \"commonjs\"\n// dist/report.js: require(\"chalk\")"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Выбрать поддерживаемый формат",
            "Use a supported module format"
          ],
          "body": [
            "Если приложение готово к ESM, настройте TypeScript и Node на ESM и проверьте итоговый .js.",
            "If the app is ready for ESM, configure TypeScript and Node accordingly and inspect emitted .js."
          ],
          "code": [
            "\"module\": \"NodeNext\"",
            "\"module\": \"NodeNext\""
          ]
        },
        {
          "title": [
            "Если перейти на ESM нельзя",
            "If ESM migration is not feasible"
          ],
          "body": [
            "Можно остаться на совместимом Chalk 4 и вынести переход в отдельную задачу. Это не универсальный совет для всех пакетов.",
            "Keep a compatible Chalk 4 until the project can migrate. This is not a universal rule for every dependency."
          ],
          "code": [
            "npm install chalk@4.1.2",
            "npm install chalk@4.1.2"
          ]
        }
      ],
      "check": [
        "Посмотрите итоговый dist/report.js и запустите его под той же версией Node, что используется в CI.",
        "Inspect dist/report.js and run it under the same Node version as CI."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "Chalk issue #527",
            "Chalk issue #527"
          ],
          "url": "https://github.com/chalk/chalk/issues/527"
        }
      ]
    },
    "angular-ts-limit": {
      "id": "angular-ts-limit",
      "level": 3,
      "title": [
        "Почему Angular не разрешает обновить TypeScript?",
        "Why does Angular block a TypeScript upgrade?"
      ],
      "lead": [
        "Это отдельная история, не продолжение ошибки Jest. Angular использует TypeScript для сборки, и его компилятор поддерживает определённые версии языка.",
        "This is a separate issue, not part of the Jest story. Angular uses TypeScript to compile applications; its compiler supports a specific version range."
      ],
      "steps": [
        [
          "Разработчик хочет TypeScript 3.8.",
          "The developer wants TypeScript 3.8."
        ],
        [
          "В проекте стоит @angular/compiler-cli@9.0.5. Он рассчитан на TypeScript от 3.6 до, но не включая, 3.8.",
          "The project has @angular/compiler-cli@9.0.5, which supports TypeScript 3.6 or higher but below 3.8."
        ],
        [
          "Значит, новый TypeScript нельзя просто подставить. Надо проверить поддержку нового компилятора Angular.",
          "So the compiler must be upgraded or the TypeScript target postponed."
        ]
      ],
      "examples": [
        {
          "title": [
            "Где написано ограничение",
            "Where the limit is declared"
          ],
          "body": [
            "Знак < значит «строго меньше». Поэтому 3.7 подходит, а 3.8 — уже нет.",
            "The < sign means “strictly less than”. So 3.7 fits; 3.8 does not."
          ],
          "file": [
            "@angular/compiler-cli@9.0.5/package.json",
            "@angular/compiler-cli@9.0.5/package.json"
          ],
          "code": [
            "\"peerDependencies\": { \"typescript\": \">=3.6 <3.8\" }",
            "\"peerDependencies\": { \"typescript\": \">=3.6 <3.8\" }"
          ]
        },
        {
          "title": [
            "Чем этот случай отличается от Jest",
            "How this differs from Jest"
          ],
          "body": [
            "Здесь проверяется связка компилятора Angular и языка TypeScript. Jest и ts-jest в ней не участвуют.",
            "This time the pair is the Angular compiler and TypeScript. Jest and ts-jest are unrelated."
          ],
          "file": [
            "package.json — пример",
            "package.json — example"
          ],
          "code": [
            "\"@angular/compiler-cli\": \"9.0.5\",\n\"typescript\": \"3.8.0\"  // конфликт",
            "\"@angular/compiler-cli\": \"9.0.5\",\n\"typescript\": \"3.8.0\"  // mismatch"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Найти поддерживающий Angular",
            "Find a compatible Angular compiler"
          ],
          "body": [
            "Уточните, какая версия Angular поддерживает нужный TypeScript. Обычно компилятор обновляют вместе с соответствующими пакетами Angular.",
            "Find which Angular release supports the desired TypeScript. Angular compiler and framework packages usually need coordinated upgrades."
          ],
          "code": [
            "npm view @angular/compiler-cli@9.0.5 peerDependencies",
            "npm view @angular/compiler-cli@9.0.5 peerDependencies"
          ]
        },
        {
          "title": [
            "Не менять компилятор сейчас",
            "Keep the compiler unchanged"
          ],
          "body": [
            "Если переход на Angular не планируется, оставьте подходящий TypeScript и отложите обновление языка.",
            "If Angular migration is out of scope, keep a supported TypeScript release."
          ],
          "code": [
            "npm ci\nnpm run build",
            "npm ci\nnpm run build"
          ]
        }
      ],
      "check": [
        "Пересоберите Angular-приложение после подбора версий. Не переносите результаты проверки Jest на эту проблему.",
        "Rebuild the Angular app with the selected versions. A Jest test does not verify this constraint."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "Значит, новый TypeScript нельзя просто подставить. Надо проверить поддержку нового компилятора Angular.",
              "So the compiler must be upgraded or the TypeScript target postponed."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Найти поддерживающий Angular",
              "Find a compatible Angular compiler"
            ],
            "detail": [
              "Уточните, какая версия Angular поддерживает нужный TypeScript. Обычно компилятор обновляют вместе с соответствующими пакетами Angular.",
              "Find which Angular release supports the desired TypeScript. Angular compiler and framework packages usually need coordinated upgrades."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "Dependabot: случай Jest и Angular",
            "Dependabot: Jest and Angular report"
          ],
          "url": "https://github.com/dependabot/dependabot-core/issues/2032"
        }
      ]
    },
    "type-boundaries": {
      "id": "type-boundaries",
      "level": 3,
      "title": [
        "Почему TypeScript ругается на библиотеку, которую вы не трогали?",
        "Why does TypeScript complain about a library you never edited?"
      ],
      "lead": [
        "Некоторые пакеты приносят файлы с описанием типов. Новый файл может требовать более свежий TypeScript, даже если ваш собственный код не менялся.",
        "Some packages bring type declaration files. New declarations may require a newer TypeScript even when your app code is unchanged."
      ],
      "steps": [
        [
          "Приложение использует старый TypeScript.",
          "The app uses an older TypeScript compiler."
        ],
        [
          "Обновился @types/node: в нём появились новые записи.",
          "@types/node was updated with newer declaration syntax."
        ],
        [
          "Старый TypeScript не умеет прочитать эти записи и падает до проверки вашего кода.",
          "The older compiler cannot parse them and fails before checking your own code."
        ]
      ],
      "examples": [
        {
          "title": [
            "Где находится чужой файл",
            "Where the unfamiliar file lives"
          ],
          "body": [
            "Он лежит в установленном пакете типов. @types/node — не сам Node, а подсказки компилятору.",
            "It lives in an installed types package. @types/node describes Node APIs to TypeScript; it is not Node itself."
          ],
          "file": [
            "node_modules/@types/node/ — пример",
            "node_modules/@types/node/ — example"
          ],
          "code": [
            "node_modules/@types/node/ts4.8/util.d.ts",
            "node_modules/@types/node/ts4.8/util.d.ts"
          ]
        },
        {
          "title": [
            "Почему установка прошла",
            "Why the install succeeded"
          ],
          "body": [
            "npm скачал файлы без проблем. Ошибка возникает позже, когда TypeScript пытается их разобрать.",
            "npm downloaded the files successfully. The failure happens later when TypeScript parses the declarations."
          ],
          "file": [
            "Лог typecheck — пример",
            "Example typecheck log"
          ],
          "code": [
            "error TS1005: \";\" expected",
            "error TS1005: \";\" expected"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Подобрать совместимую пару",
            "Choose compatible releases"
          ],
          "body": [
            "Посмотрите минимальную версию TypeScript, которую поддерживает @types/node, и либо обновите компилятор, либо выберите совместимый пакет типов.",
            "Inspect the TypeScript version supported by @types/node. Upgrade the compiler or select compatible declarations."
          ],
          "code": [
            "npm ls typescript @types/node",
            "npm ls typescript @types/node"
          ]
        },
        {
          "title": [
            "Не обновлять TypeScript вслепую",
            "Do not blindly upgrade TypeScript"
          ],
          "body": [
            "Если его использует Angular или другой сборщик, сначала проверьте их требования.",
            "If Angular or another tool uses that compiler, check its requirements first."
          ],
          "code": [
            "npx tsc --noEmit",
            "npx tsc --noEmit"
          ]
        }
      ],
      "check": [
        "Выполните typecheck на чистой установке; в отчёте укажите версии TypeScript и @types/node.",
        "Run typecheck on a clean install and record the TypeScript and @types/node versions."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "DefinitelyTyped: старый TS и @types/node",
            "DefinitelyTyped: old TS and @types/node"
          ],
          "url": "https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/64262"
        }
      ]
    },
    "user-actions": {
      "id": "user-actions",
      "level": 3,
      "title": [
        "Сборка зелёная. Почему подсказка не появляется?",
        "The build is green. Why does the tooltip not appear?"
      ],
      "lead": [
        "Сборка проверяет, что файлы удалось собрать. Она не проверяет каждое действие пользователя.",
        "A build checks that files compile. It does not test every user interaction."
      ],
      "steps": [
        [
          "Библиотека кнопок обновилась. Иконка всё ещё видна.",
          "The button library was upgraded. The icon still appears."
        ],
        [
          "Но при наведении подсказка не открывается: новая версия не передала ref к настоящей кнопке.",
          "But the tooltip no longer appears: the new component stopped forwarding ref to the button."
        ],
        [
          "Проверка «иконка на экране» пройдёт, хотя подсказка сломана.",
          "An “icon exists” test passes even though the tooltip is broken."
        ]
      ],
      "examples": [
        {
          "title": [
            "Как используется компонент",
            "How the component is used"
          ],
          "body": [
            "Tooltip оборачивает кнопку и пытается привязать к ней всплывающую подсказку.",
            "Tooltip wraps the button and needs a reference to its actual DOM element."
          ],
          "file": [
            "src/Help.tsx — пример",
            "src/Help.tsx — example"
          ],
          "code": [
            "<Tooltip title=\"Подсказка\"><IconButton /></Tooltip>",
            "<Tooltip title=\"Help\"><IconButton /></Tooltip>"
          ]
        },
        {
          "title": [
            "Какой тест чего не заметит",
            "What a weak test misses"
          ],
          "body": [
            "Проверить лишь наличие кнопки — недостаточно. Нужно навести указатель или перейти клавиатурой.",
            "Checking that the button exists is insufficient. You need to hover or focus it."
          ],
          "file": [
            "Тест Playwright — идея",
            "Playwright test idea"
          ],
          "code": [
            "await page.getByRole('button', {name:'Help'}).hover();\nawait expect(page.getByRole('tooltip')).toBeVisible();",
            "await page.getByRole('button', {name:'Help'}).hover();\nawait expect(page.getByRole('tooltip')).toBeVisible();"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Передать ref правильно",
            "Forward the DOM ref"
          ],
          "body": [
            "Если вы поддерживаете обёртку над кнопкой, проверьте, что она передаёт ref на правильный DOM-элемент.",
            "If you own the button wrapper, forward its ref to the correct DOM element."
          ],
          "code": [
            "const IconButton = React.forwardRef((props, ref) => <button ref={ref} {...props} />);",
            "const IconButton = React.forwardRef((props, ref) => <button ref={ref} {...props} />);"
          ]
        },
        {
          "title": [
            "Проверить сценарий",
            "Test user behavior"
          ],
          "body": [
            "Проверьте подсказку мышью и клавиатурой. Для модального окна проверяйте фокус, для drag-and-drop — перенос элемента.",
            "Test the tooltip with mouse and keyboard. For dialogs test focus; for drag-and-drop test moving an item."
          ],
          "code": [
            "npm run test:e2e",
            "npm run test:e2e"
          ]
        }
      ],
      "check": [
        "Проверка должна подтверждать появление подсказки, а не просто успешную отрисовку иконки.",
        "The check must confirm the tooltip appears, not only that the icon rendered."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "browser-and-server": {
      "id": "browser-and-server",
      "level": 3,
      "title": [
        "Почему страница работает в браузере, а на сервере падает?",
        "Why does a page work in the browser but fail on the server?"
      ],
      "lead": [
        "Некоторые приложения сначала собирают HTML на сервере. Это SSR. На сервере нет window и document, а некоторые библиотеки предполагают, что они есть.",
        "Some apps render HTML on the server first. This is SSR. The server has no window or document, but some libraries assume those exist."
      ],
      "steps": [
        [
          "В браузере React-компонент открывается нормально.",
          "A React component works in the browser."
        ],
        [
          "Сервер пытается сформировать HTML до запуска браузера.",
          "The server tries to render HTML before a browser starts."
        ],
        [
          "Библиотека обращается к window сразу при импорте — Node выдаёт ошибку.",
          "A dependency reads window at import time, and Node throws an error."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что значит SSR",
            "What SSR means"
          ],
          "body": [
            "Браузер и сервер выполняют код в разных условиях.",
            "Browser and server execute code in different environments."
          ],
          "file": [
            "Упрощённая схема",
            "Simplified flow"
          ],
          "code": [
            "Сервер → HTML → Браузер → клики",
            "Server → HTML → Browser → clicks"
          ]
        },
        {
          "title": [
            "Строка, которая мешает серверу",
            "The line that breaks server rendering"
          ],
          "body": [
            "В Node нет window. Ошибка не связана с npm install.",
            "Node does not have window. The problem is not npm installation."
          ],
          "file": [
            "src/widget.ts — пример",
            "src/widget.ts — example"
          ],
          "code": [
            "const width = window.innerWidth;  // на сервере ошибка",
            "const width = window.innerWidth;  // throws on server"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Отложить браузерную работу",
            "Delay browser-only work"
          ],
          "body": [
            "Обращайтесь к window в клиентской части, например после монтирования компонента, если это подходит архитектуре.",
            "Read window only in browser-only code, e.g. after mounting when appropriate for the framework."
          ],
          "code": [
            "React.useEffect(() => { /* window можно читать тут */ }, []);",
            "React.useEffect(() => { /* window is available here */ }, []);"
          ]
        },
        {
          "title": [
            "Проверить SSR отдельно",
            "Test SSR separately"
          ],
          "body": [
            "Запустите серверную сборку/рендер. Обычный client build не заменяет эту проверку.",
            "Run the server build or render. A normal client build does not replace it."
          ],
          "code": [
            "npm run build\nnpm run test:ssr",
            "npm run build\nnpm run test:ssr"
          ]
        }
      ],
      "check": [
        "Проверьте и серверное формирование HTML, и открытие страницы в браузере.",
        "Test both server HTML rendering and opening the result in a browser."
      ],
      "terms": [
        {
          "term": [
            "SSR",
            "SSR"
          ],
          "meaning": [
            "Когда сервер заранее формирует HTML страницы, а браузер затем продолжает работу.",
            "When the server renders page HTML before the browser takes over."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "audit-and-api": {
      "id": "audit-and-api",
      "level": 3,
      "title": [
        "Уязвимость исправили. Почему обработка SVG сломалась?",
        "A vulnerability was fixed. Why did SVG processing break?"
      ],
      "lead": [
        "Можно заменить небезопасную версию вложенной библиотеки, но старый вызывающий код иногда не понимает её новый API.",
        "A vulnerable nested package can be replaced, but the older code calling it may not understand its new API."
      ],
      "steps": [
        [
          "Проект использует css-select, а он вызывает функции из nth-check.",
          "The project uses css-select, which calls functions from nth-check."
        ],
        [
          "Команда заставляет npm установить новый nth-check 2 вместо старого 1.",
          "The team forces npm to install nth-check 2 instead of the older 1."
        ],
        [
          "Новая версия изменила способ экспорта. Старый css-select вызывает её по-старому, и SVG-проверка ломается.",
          "The new release changed its export shape. The old css-select calls it in the old way, and SVG handling fails."
        ]
      ],
      "examples": [
        {
          "title": [
            "Кто кого вызывает",
            "Which package calls which"
          ],
          "body": [
            "Это цепочка обычных библиотек, а не одна большая библиотека.",
            "This is a chain of separate dependencies."
          ],
          "file": [
            "Дерево зависимостей — упрощённо",
            "Simplified dependency chain"
          ],
          "code": [
            "react-scripts → svgo → css-select → nth-check",
            "react-scripts → svgo → css-select → nth-check"
          ]
        },
        {
          "title": [
            "Где обнаружилась несовместимость",
            "Where incompatibility appeared"
          ],
          "body": [
            "В старом коде ожидается функция, а новый пакет экспортирует её по-другому.",
            "Old code expects a function, while the newer package exports it differently."
          ],
          "file": [
            "Ошибка выполнения",
            "Runtime error"
          ],
          "code": [
            "getNCheck is not a function",
            "getNCheck is not a function"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Обновить того, кто вызывает функцию",
            "Upgrade the caller"
          ],
          "body": [
            "Найдите версию css-select, которая умеет работать с новым nth-check, и обновите совместимую связку.",
            "Find a css-select release compatible with the newer nth-check, and upgrade the pair."
          ],
          "code": [
            "npm explain nth-check",
            "npm explain nth-check"
          ]
        },
        {
          "title": [
            "Если исправление недоступно",
            "If no compatible update is available"
          ],
          "body": [
            "Проверьте другой поддерживаемый путь миграции или замену уязвимого инструмента. Одного overrides недостаточно для проверки поведения.",
            "Consider another supported migration or replace the vulnerable tool. An override alone cannot verify runtime behavior."
          ],
          "code": [
            "npm run build\nnpm test",
            "npm run build\nnpm test"
          ]
        }
      ],
      "check": [
        "Запустите реальную обработку SVG. Аудит без уязвимости и работающий SVG — два разных условия.",
        "Run actual SVG handling. A clean advisory report and a working SVG are two distinct requirements."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "Create React App issue #13062",
            "Create React App issue #13062"
          ],
          "url": "https://github.com/facebook/create-react-app/issues/13062"
        }
      ]
    },
    "audit-coverage": {
      "id": "audit-coverage",
      "level": 3,
      "title": [
        "Ноль уязвимостей — значит, всё безопасно?",
        "Does zero vulnerabilities mean everything is safe?"
      ],
      "lead": [
        "Нет. Сначала нужно узнать, сколько пакетов удалось проверить. Если половину пропустили, «0 найдено» не означает «проблем нет».",
        "No. First check how many packages were actually scanned. If half were skipped, “0 found” does not mean everything is safe."
      ],
      "steps": [
        [
          "В приложении 100 библиотек.",
          "The app has 100 packages."
        ],
        [
          "База уязвимостей смогла оценить только 60; 40 остались без результата.",
          "The advisory database could evaluate only 60; 40 have no result."
        ],
        [
          "Ноль находок относится к 60 проверенным, а не ко всем 100.",
          "Zero findings apply to the 60 checked packages, not all 100."
        ]
      ],
      "examples": [
        {
          "title": [
            "Как должен выглядеть честный отчёт",
            "What an honest report looks like"
          ],
          "body": [
            "Три числа важнее одного зелёного кружка.",
            "Three counts matter more than one green badge."
          ],
          "file": [
            "Отчёт — пример",
            "Example report"
          ],
          "code": [
            "Всего: 100\nПроверено: 60\nНеизвестно: 40\nИзвестных уязвимостей: 0",
            "Total: 100\nChecked: 60\nUnknown: 40\nKnown advisories: 0"
          ]
        },
        {
          "title": [
            "Ещё одна ловушка с двумя копиями",
            "Another trap with duplicate copies"
          ],
          "body": [
            "Если обновили только одну уязвимую копию, в дереве может остаться вторая.",
            "Upgrading one vulnerable copy can leave another one installed."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "npm ls nth-check --all",
            "npm ls nth-check --all"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Показывать Unknown отдельно",
            "Keep unknown separate"
          ],
          "body": [
            "Отделяйте отсутствие находок от невозможности проверить. Для отсутствующих данных нужна повторная проверка, а не зелёный статус.",
            "Separate “no findings” from “not checked”. Missing evidence calls for another check, not a green status."
          ],
          "code": [
            "npm audit --json",
            "npm audit --json"
          ]
        },
        {
          "title": [
            "Проверить полный набор установленных версий",
            "Check all installed versions"
          ],
          "body": [
            "Сверьте lock-файл и дерево, затем проверьте те пакеты, для которых база отвечает.",
            "Compare the lock and dependency tree, then evaluate packages with available advisory data."
          ],
          "code": [
            "npm ls --all",
            "npm ls --all"
          ]
        }
      ],
      "check": [
        "В отчёте должны быть количество проверенных, количество Unknown и точные версии пакетов.",
        "The report should show checked count, unknown count, and exact installed versions."
      ],
      "terms": [
        {
          "term": [
            "UNKNOWN",
            "UNKNOWN"
          ],
          "meaning": [
            "Не доказано ни наличие, ни отсутствие проблемы. Данных не хватило.",
            "Neither safety nor a vulnerability was established; evidence was insufficient."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "tested-snapshot": {
      "id": "tested-snapshot",
      "level": 3,
      "title": [
        "Какой именно код прошёл проверку?",
        "Which exact code passed the checks?"
      ],
      "lead": [
        "Зелёный тест подтверждает только файлы, которые были на диске во время теста. Если после него поменяли lock, старый результат уже не описывает новый проект.",
        "A green test verifies the files present during that run. If the lockfile changes afterward, that result no longer covers the new state."
      ],
      "steps": [
        [
          "Тесты прошли на коммите A.",
          "Tests passed for commit A."
        ],
        [
          "Затем изменили package-lock.json и получили коммит B.",
          "Then package-lock.json changed, producing commit B."
        ],
        [
          "Надпись «тесты прошли» относится к A, а не автоматически к B.",
          "The green result belongs to A, not automatically to B."
        ]
      ],
      "examples": [
        {
          "title": [
            "Как отличить состояния",
            "How to distinguish states"
          ],
          "body": [
            "Git хранит точный идентификатор коммита. В CI он должен совпадать с тем, что планируете выпускать.",
            "Git has an exact commit identifier. CI should verify the commit intended for release."
          ],
          "file": [
            "Терминал",
            "Terminal"
          ],
          "code": [
            "git rev-parse HEAD",
            "git rev-parse HEAD"
          ]
        },
        {
          "title": [
            "Почему merge создаёт новый вариант",
            "Why merge creates a new state"
          ],
          "body": [
            "Два зелёных PR ещё не проверили вместе итоговые изменения.",
            "Two green PRs have not yet tested their combined changes."
          ],
          "file": [
            "Схема",
            "Diagram"
          ],
          "code": [
            "PR A ✓   PR B ✓\n     ↓ merge\nновый коммит C — проверить",
            "PR A ✓   PR B ✓\n     ↓ merge\nnew commit C — test it"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Запускать тесты после изменения",
            "Run checks after changes"
          ],
          "body": [
            "Перепроверьте после последней правки lock или конфигурации, а не только перед ней.",
            "Rerun checks after the last lockfile or configuration change."
          ],
          "code": [
            "npm ci\nnpm test",
            "npm ci\nnpm test"
          ]
        },
        {
          "title": [
            "Для большого потока PR",
            "For many concurrent PRs"
          ],
          "body": [
            "Можно использовать merge queue, чтобы проверять кандидат с актуальной main. Это не заменяет тестирование самого приложения.",
            "Consider a merge queue to test against the current main branch. It does not replace application-level tests."
          ],
          "code": [
            "git status --short",
            "git status --short"
          ]
        }
      ],
      "check": [
        "Сопоставьте SHA проверенного коммита и SHA опубликованного коммита.",
        "Compare the tested commit SHA with the released commit SHA."
      ],
      "terms": [],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "Expedia: checks after merge",
            "Expedia: merge safety"
          ],
          "url": "https://github.com/ExpediaGroup/github-helpers"
        }
      ]
    },
    "search-bounds": {
      "id": "search-bounds",
      "level": 3,
      "title": [
        "Если планировщик не нашёл версию, её точно нет?",
        "If the planner found no release, is it truly impossible?"
      ],
      "lead": [
        "Нет. Он мог искать только в первых десяти версиях, не получить данные из реестра или иметь запрет на изменение нужного пакета.",
        "No. It may have searched only ten candidates, failed to fetch registry data, or been forbidden from changing a required package."
      ],
      "steps": [
        [
          "Мы хотим обновить библиотеку A.",
          "We want to upgrade library A."
        ],
        [
          "Первые кандидаты не подходят под требования B.",
          "The first candidate releases conflict with B’s constraints."
        ],
        [
          "Из этого ещё нельзя сделать вывод, что не существует вообще никакой подходящей версии.",
          "This does not prove no compatible release exists anywhere."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что именно было проверено",
            "What was actually checked"
          ],
          "body": [
            "Отчёт должен показывать диапазон поиска, ограничения и недостающие данные.",
            "A report should expose candidate scope, constraints, and missing evidence."
          ],
          "file": [
            "Отчёт — пример",
            "Example planning report"
          ],
          "code": [
            "Проверено: A@2.0–2.5\nБолее новые версии: не проверяли\nИтог: UNKNOWN",
            "Checked: A@2.0–2.5\nNewer versions: not evaluated\nResult: UNKNOWN"
          ]
        },
        {
          "title": [
            "Почему запрет тоже важен",
            "Why scope matters"
          ],
          "body": [
            "Если запрещено менять B, а совместимая комбинация требует его обновить, это не «плохой npm».",
            "If B cannot change but compatibility requires upgrading it, the blocker is your scope policy, not npm itself."
          ],
          "file": [
            "Условия задачи",
            "Task constraints"
          ],
          "code": [
            "Разрешено: A\nЗапрещено: B",
            "Allowed: A\nHeld: B"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Расширить поиск, если можно",
            "Expand the search if allowed"
          ],
          "body": [
            "Попробуйте больше кандидатов и проверьте registry, сохранив ограничения пользователя.",
            "Evaluate more candidate releases and verify registry data while respecting user constraints."
          ],
          "code": [
            "npm view A versions",
            "npm view A versions"
          ]
        },
        {
          "title": [
            "Не подменять UNKNOWN ошибкой «невозможно»",
            "Do not turn UNKNOWN into “impossible”"
          ],
          "body": [
            "Если данные неполные, честный ответ — «пока не нашли». Утверждение «решения нет» требует проверки всей заявленной области.",
            "If data is incomplete, say “not found yet.” A proof of impossibility needs complete coverage of the stated domain."
          ],
          "code": [
            "npm view A peerDependencies",
            "npm view A peerDependencies"
          ]
        }
      ],
      "check": [
        "Сохраните список проверенных версий и ограничений, а не только итоговое слово.",
        "Keep the evaluated candidate list and constraints, not only the final status."
      ],
      "terms": [
        {
          "term": [
            "Ограниченная область поиска",
            "Bounded search"
          ],
          "meaning": [
            "Когда программа проверяет только часть возможных комбинаций, чтобы закончить быстрее.",
            "When a program evaluates only part of the possible combinations to finish faster."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": []
    },
    "repeat-codemod": {
      "id": "repeat-codemod",
      "level": 3,
      "title": [
        "Почему нельзя бездумно запускать исправляющий скрипт дважды?",
        "Why can rerunning a code-modifying script be dangerous?"
      ],
      "lead": [
        "Codemod автоматически меняет код. Но не каждый codemod понимает, что его уже запускали. Повторный запуск может снова изменить готовый файл.",
        "A codemod automatically rewrites code. But not every codemod recognizes that it already ran. Running it again can change the completed result."
      ],
      "steps": [
        [
          "MUI обновляет названия импортов адаптера дат.",
          "MUI migrates date adapter imports."
        ],
        [
          "Первый запуск делает нужную замену.",
          "The first run performs the intended rename."
        ],
        [
          "В известной миграции второй запуск меняет уже исправленный импорт ещё раз, но не туда.",
          "In a documented migration, a second run modifies the already migrated import incorrectly."
        ]
      ],
      "examples": [
        {
          "title": [
            "До и после первого запуска",
            "Before and after the first run"
          ],
          "body": [
            "Импорт переименован по правилам миграции.",
            "The import is renamed according to the migration."
          ],
          "file": [
            "src/date.ts — пример",
            "src/date.ts — example"
          ],
          "code": [
            "AdapterDateFnsV3 → AdapterDateFns",
            "AdapterDateFnsV3 → AdapterDateFns"
          ]
        },
        {
          "title": [
            "Что делает второй запуск",
            "What the second run does"
          ],
          "body": [
            "Та же команда может ошибочно решить, что нужно переименовать ещё раз.",
            "The same command may mistakenly rename it again."
          ],
          "file": [
            "Второй запуск — нежелательный результат",
            "Second run — undesired result"
          ],
          "code": [
            "AdapterDateFns → AdapterDateFnsV2",
            "AdapterDateFns → AdapterDateFnsV2"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Сохранять результат каждого шага",
            "Save each migration step"
          ],
          "body": [
            "Сделайте коммит/резервную ветку перед codemod, после запуска посмотрите diff и тесты.",
            "Commit or branch before running the codemod, then inspect its diff and run tests."
          ],
          "code": [
            "git diff -- src/date.ts\nnpm test",
            "git diff -- src/date.ts\nnpm test"
          ]
        },
        {
          "title": [
            "Прежде чем повторять — проверьте повторяемость",
            "Check repeatability before retrying"
          ],
          "body": [
            "Если документация предупреждает о неидемпотентном codemod, не запускайте его снова на уже изменённых файлах.",
            "If docs warn the codemod is not idempotent, do not run it again on already modified files."
          ],
          "code": [
            "git status --short",
            "git status --short"
          ]
        }
      ],
      "check": [
        "Сравните файл до миграции, после первого и после пробного второго запуска в отдельной ветке.",
        "Compare the file before, after the first run, and after a test second run in a separate branch."
      ],
      "terms": [
        {
          "term": [
            "Codemod",
            "Codemod"
          ],
          "meaning": [
            "Скрипт, который автоматически переписывает исходники по заданным правилам.",
            "A script that automatically rewrites source files by predefined rules."
          ]
        }
      ],
      "layout": null,
      "lab": null,
      "sources": [
        {
          "label": [
            "MUI: migration pickers v7 → v8",
            "MUI: pickers migration v7 → v8"
          ],
          "url": "https://mui.com/x/migration/migration-pickers-v7/"
        }
      ]
    },
    "missing-release": {
      "id": "missing-release",
      "level": 2,
      "title": [
        "Почему версия указана, но npm не может её найти?",
        "Why does npm fail to find a pinned release?"
      ],
      "lead": [
        "Номер версии в package.json — это пожелание, а не копия файлов у вас на компьютере. Если точный выпуск исчез из доступного реестра, установить его может оказаться невозможно.",
        "A version in package.json is a request, not a local copy of the package. If an exact release disappears from the accessible registry, installation may fail."
      ],
      "steps": [
        [
          "Старый пакет требует left-pad ровно 0.0.3.",
          "An old dependency requires exactly left-pad 0.0.3."
        ],
        [
          "В 2016 году пакет ненадолго удалили из npm.",
          "In 2016 the package was briefly removed from npm."
        ],
        [
          "Даже если опубликован новый left-pad 1.0.0, старое требование 0.0.3 ему не соответствует.",
          "Even if left-pad 1.0.0 exists, it does not satisfy an exact 0.0.3 requirement."
        ]
      ],
      "examples": [
        {
          "title": [
            "Что означает точная версия",
            "What an exact version means"
          ],
          "body": [
            "Без ^ или ~ нужно именно указанное число.",
            "Without ^ or ~, exactly that release is requested."
          ],
          "file": [
            "package.json стороннего пакета",
            "A dependency’s package.json"
          ],
          "code": [
            "\"dependencies\": { \"left-pad\": \"0.0.3\" }",
            "\"dependencies\": { \"left-pad\": \"0.0.3\" }"
          ]
        },
        {
          "title": [
            "Почему более новая не помогает",
            "Why newer is not enough"
          ],
          "body": [
            "Новый выпуск не удовлетворяет точному требованию. В историческом инциденте восстановили старый архив.",
            "The new release does not match an exact requirement. In the historical incident the old archive was restored."
          ],
          "file": [
            "Каталог — упрощённо",
            "Simplified registry view"
          ],
          "code": [
            "Нужна: 0.0.3  — недоступна\nЕсть:   1.0.0  — другой номер",
            "Required: 0.0.3 — unavailable\nPresent:  1.0.0 — different version"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Проверить доступность",
            "Check availability"
          ],
          "body": [
            "Уточните точный реестр и номер. Не подменяйте несовместимый пакет молча.",
            "Check the exact version and registry. Do not silently swap in an incompatible release."
          ],
          "code": [
            "npm view left-pad@0.0.3 version",
            "npm view left-pad@0.0.3 version"
          ]
        },
        {
          "title": [
            "Если архив действительно недоступен",
            "If the archive is unavailable"
          ],
          "body": [
            "Нужна безопасная замена с проверкой кода или восстановление проверенного артефакта из разрешённого источника.",
            "Choose a compatible replacement and test the code, or restore a verified artifact through an approved source."
          ],
          "code": [
            "npm ci",
            "npm ci"
          ]
        }
      ],
      "check": [
        "Чистая установка должна скачать именно требуемые файлы; одного указанного номера в lock мало.",
        "A clean install must retrieve the actual required files; a number in a lockfile alone is not enough."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "Даже если опубликован новый left-pad 1.0.0, старое требование 0.0.3 ему не соответствует.",
              "Even if left-pad 1.0.0 exists, it does not satisfy an exact 0.0.3 requirement."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Проверить доступность",
              "Check availability"
            ],
            "detail": [
              "Уточните точный реестр и номер. Не подменяйте несовместимый пакет молча.",
              "Check the exact version and registry. Do not silently swap in an incompatible release."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "npm: история left-pad",
            "npm: the left-pad incident"
          ],
          "url": "https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm"
        }
      ]
    },
    "quill-react19": {
      "id": "quill-react19",
      "level": 3,
      "title": [
        "Почему редактор текста сломался после обновления React?",
        "Why did the editor break after upgrading React?"
      ],
      "lead": [
        "React 19 удалил старый метод findDOMNode. В react-quill 2.0.0 ещё оставался вызов этого метода. Установка проходит, а редактор падает при открытии.",
        "React 19 removed an older API named findDOMNode. react-quill 2.0.0 still called it. Installation can succeed, but the editor fails when opened."
      ],
      "steps": [
        [
          "В приложении был React 18 и редактор react-quill 2.0.0.",
          "The app had React 18 and react-quill 2.0.0."
        ],
        [
          "React обновили до 19. Код компонента редактора не менялся.",
          "React was upgraded to 19. The editor component code did not change."
        ],
        [
          "При открытии редактор вызывает метод, которого больше нет в react-dom.",
          "When opening, the editor calls a method removed from react-dom."
        ]
      ],
      "examples": [
        {
          "title": [
            "Наш код выглядит безобидно",
            "Our app code looks simple"
          ],
          "body": [
            "Проблемная строчка спрятана внутри установленной библиотеки.",
            "The problematic call is inside the installed library."
          ],
          "file": [
            "src/Editor.tsx — пример",
            "src/Editor.tsx — example"
          ],
          "code": [
            "import ReactQuill from 'react-quill';\nexport function Editor() { return <ReactQuill />; }",
            "import ReactQuill from 'react-quill';\nexport function Editor() { return <ReactQuill />; }"
          ]
        },
        {
          "title": [
            "Что вызывает старая библиотека",
            "What the old library calls"
          ],
          "body": [
            "В React 19 API findDOMNode больше нет, поэтому возникает ошибка выполнения.",
            "React 19 no longer exports findDOMNode, causing a runtime error."
          ],
          "file": [
            "Сообщение браузера",
            "Browser error"
          ],
          "code": [
            "react_dom_1.default.findDOMNode is not a function",
            "react_dom_1.default.findDOMNode is not a function"
          ]
        }
      ],
      "solutions": [
        {
          "title": [
            "Найти совместимый редактор",
            "Find a compatible editor"
          ],
          "body": [
            "Проверьте выпуски и документацию редактора на поддержку React 19. При необходимости обновите или замените редактор.",
            "Look for editor releases that support React 19. Upgrade or replace the editor when needed."
          ],
          "code": [
            "npm view react-quill peerDependencies",
            "npm view react-quill peerDependencies"
          ]
        },
        {
          "title": [
            "Если обновление React пока необязательно",
            "If React 19 is not required yet"
          ],
          "body": [
            "Можно временно оставить React 18 и перенести обновление в отдельную задачу. Но проверьте другие требования и безопасность.",
            "You can temporarily keep React 18 and schedule migration separately, after checking security and other constraints."
          ],
          "code": [
            "npm ls react react-dom react-quill",
            "npm ls react react-dom react-quill"
          ]
        }
      ],
      "check": [
        "Откройте редактор и попробуйте ввести текст. Успешный npm ci не проверяет это действие.",
        "Open the editor and type into it. A successful npm ci does not test this behavior."
      ],
      "terms": [],
      "layout": null,
      "lab": {
        "prompt": [
          "Выберите, что хотите разобрать",
          "Choose what to explore"
        ],
        "states": [
          {
            "label": [
              "Почему возникла ошибка?",
              "Why did it fail?"
            ],
            "value": [
              "Что поменялось в проекте",
              "What changed in the project"
            ],
            "detail": [
              "При открытии редактор вызывает метод, которого больше нет в react-dom.",
              "When opening, the editor calls a method removed from react-dom."
            ],
            "tone": "warn"
          },
          {
            "label": [
              "Как действовать?",
              "What should I do?"
            ],
            "value": [
              "Найти совместимый редактор",
              "Find a compatible editor"
            ],
            "detail": [
              "Проверьте выпуски и документацию редактора на поддержку React 19. При необходимости обновите или замените редактор.",
              "Look for editor releases that support React 19. Upgrade or replace the editor when needed."
            ],
            "tone": "neutral"
          }
        ]
      },
      "sources": [
        {
          "label": [
            "react-quill issue #1039",
            "react-quill issue #1039"
          ],
          "url": "https://github.com/zenoamaro/react-quill/issues/1039"
        }
      ]
    }
  }
};
  const existing = globalThis.DepLoomBookChapters || [];
  const originals = new Map(existing.flatMap(chapter => chapter.lessons.map(lesson => [lesson.id, lesson])));
  const updated = [];
  for (const chapter of DATA.chapters) {
    const lessons = chapter.lessons.map(id => {
      const edit = DATA.lessons[id];
      if (!edit) throw new Error('Missing handbook lesson: ' + id);
      const original = originals.get(id);
      if (!original && !edit.lab) throw new Error('New lesson has no experiment: ' + id);
      const lesson = Object.assign({}, original || {}, edit);
      if (!edit.lab && original?.lab) lesson.lab = original.lab;
      if (!edit.layout && original?.layout) lesson.layout = original.layout;
      const sources = [...(original?.sources || []), ...(edit.sources || [])];
      lesson.sources = [...new Map(sources.map(s=>[s.url,s])).values()];
      return lesson;
    });
    updated.push({id:chapter.id,title:chapter.title,level:chapter.level,lessons});
  }
  const accounted = new Set(DATA.chapters.flatMap(ch => ch.lessons));
  const leftovers = [...originals].filter(([id]) => !accounted.has(id));
  if (leftovers.length) throw new Error('Unaccounted lessons: ' + leftovers.map(x=>x[0]).join(', '));
  globalThis.DepLoomBookChapters = updated;
  globalThis.DepLoomBookCoachLoaded = true;
})();
