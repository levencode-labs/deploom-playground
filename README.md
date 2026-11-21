# DepLoom Migration Lab

[Открыть лабораторию](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

Change React by one patch and see why npm accepts a pair it rejected before. Five interactive examples cover peer requirements, a disappearing React 19 hover hint, two webpack branches that conflict after merging, a stale lockfile in CI, and a scoped override that fixes one installed copy.

- **Tools** compares npm v3 lockfiles by installation path and Yarn Classic/Berry locks by package request, audits selected public packages against OSV and npm’s latest tag, and plans explicit root dependency changes against known peer requirements.
- **Visualizations** traces individual package copies to a parent, draws an interactive map, prepares `npm explain` or `yarn why` and shows how npm semver ranges work.
- **Examples** links to the recorded npm/SSR runs and the offline teaching fixtures. Language and public example selections can be shared by URL.

Open **docs/index.html** locally or serve **docs/** with a static HTTP server. The exercises, lock comparison, tree and local part of the planner work offline. No build or dependency installation is required. The browser keeps project files local. External checks require a user action and display the public package names or versions being requested.

## По-русски

На первой странице попробуйте обновить только React DOM, затем поднимите React и откройте ту же пару в дереве. В «Инструментах» можно проверить свой PR. Сравните две версии lock-файла, найдите оставшуюся старую копию, проверьте выбранные публичные версии по OSV и npm или задайте цель обновления и посмотрите требования соседей. Перетащите package.json и lock-файл в соответствующие поля. Для Yarn Classic и Berry карта показывает логические зависимости. Проверить фактическое окружение можно с помощью yarn why.

Планировщик проверяет известные peer-требования для явно заданных целей в корне проекта. Для фактической проверки обновления нужны новый lock-файл, чистая установка и тесты приложения.

Run the regression suite with `node --test tests/*.test.js`. Run `node tests/npm-pr-fixture.cjs` to reproduce the CI and override fixtures using an isolated loopback npm registry. The embedded npm semver bundle includes its ISC license. Yarn grammar (BSD-2-Clause), js-yaml (MIT), and React/React DOM/scheduler (MIT) licenses are in **docs/vendor/**. The React hint runs locally. Its strict TypeScript source is **examples/hint.tsx** (React 19.0.0, TypeScript 5.8.3).
