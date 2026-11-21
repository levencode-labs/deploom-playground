# DepLoom Migration Lab

[Открыть лабораторию](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

Change React by one patch and see why npm accepts a pair it rejected before. Five interactive examples cover peer requirements, an API removed in React 19, a three-package migration, a stale lockfile in CI, and a scoped override that fixes one installed copy.

- **Tools** compares npm v3 lockfiles by installation path, audits selected public packages against OSV and npm’s latest tag, and plans explicit root dependency changes against known peer requirements.
- **Visualizations** traces individual package copies to a parent, prepares an exact `npm explain` command and shows how npm semver ranges work.
- **Examples** links to the recorded npm/SSR runs and the offline teaching fixtures. Language and public example selections can be shared by URL.

Open **docs/index.html** locally or serve **docs/** with a static HTTP server. The exercises, lock comparison, tree and local part of the planner work offline. No build or dependency installation is required. The browser keeps project files local. External checks require a user action and display the public package names or versions being requested.

## По-русски

На первой странице попробуйте обновить только React DOM, затем поднимите React и откройте ту же пару в дереве. В «Инструментах» можно проверить свой PR. Сравните две версии lock-файла, найдите оставшуюся старую копию, проверьте выбранные публичные версии по OSV и npm или задайте цель обновления и посмотрите требования соседей. Для этого достаточно браузера.

Планировщик проверяет известные peer-требования для явно заданных целей в корне проекта. Для фактической проверки обновления нужны новый lock-файл, чистая установка и тесты приложения.

Run the regression suite with `node --test tests/*.test.js`. Run `node tests/npm-pr-fixture.cjs` to reproduce the CI and override fixtures using an isolated loopback npm registry. The embedded npm semver bundle includes its ISC license in **docs/vendor/semver.js**.
