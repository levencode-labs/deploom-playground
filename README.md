# DepLoom Migration Lab

[Открыть на русском](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

A small browser lab for npm dependency migrations. Explore peer ranges, a React API removal, and a three-package constraint problem. The tree explorer accepts package.json and optional package-lock.json v3. The advisory tool queries OSV for an exact public package version.

Open **docs/index.html** locally, or serve the docs directory with any static HTTP server. Exercises and lockfile inspection work offline. The UI keeps local project inputs in your browser. Explicit registry and advisory lookups send only the selected public package names and versions to the displayed service.

## По-русски

Три опыта показывают, почему версия библиотеки может не устроить соседний пакет, каким образом установка проходит при сломанном коде и что меняется, когда разрешаешь обновить ещё одну зависимость. Дерево показывает диапазоны из манифеста и установленные версии из lock-файла. Для проверки известных уязвимостей введите точную версию публичного npm-пакета.

Для локального запуска откройте **docs/index.html**. Установка зависимостей и сборка сайту не нужны. В дереве используется npm semver под лицензией ISC. Текст лицензии включён в docs/tree.js.
