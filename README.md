# DepLoom Migration Lab

[Открыть лабораторию](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

Merge two working branches on the home page and see which webpack peer requirement breaks. Compare the merge with DepLoom Core’s recorded pre-merge plan. Interactive examples cover peer requirements, a disappearing React 19 hover hint, two webpack branches that conflict after merging, a stale lockfile in CI, and a scoped override that fixes one installed copy.

- **Tools** compares npm v3 lockfiles by installation path and Yarn Classic/Berry locks by package request, audits selected public packages against OSV and npm’s latest tag, and plans explicit root dependency changes against known peer requirements.
- **Visualizations** traces individual package copies to a parent, draws an interactive map, prepares `npm explain` or `yarn why` for a selected copy. Open your files first, then expand the detailed paths when needed.
- **Examples** includes the interactive semver range exercise and links to the recorded npm/SSR runs and the offline teaching fixtures. Language and public example selections can be shared by URL.

Open **docs/index.html** locally or serve **docs/** with a static HTTP server. The exercises, lock comparison, tree and local part of the planner work offline. No build or dependency installation is required. The browser keeps project files local. External checks require a user action and display the public package names or versions being requested.

## Review a real update

- [CSS selector after an override](https://levencode-labs.github.io/deploom-playground/override.html?lang=en). Three independent lockfiles and observed results are in [selector-data.js](docs/selector-data.js). Run `node tests/selector-replay.cjs` to clean-install each revision and check the selector against its recording.
- [Webpack merge](https://levencode-labs.github.io/deploom-playground/combinations.html?lang=en). In [the fixed fixture](tests/fixtures/webpack-css), run `npm ci --ignore-scripts --no-audit --no-fund --strict-peer-deps` then `node verify.cjs` to build the page and check the CSS linked by its HTML. Compare with [the recorded build](docs/webpack-build.json).
- [Rollup in CI](https://levencode-labs.github.io/deploom-playground/ci.html?lang=en#rollup). [The two lockfile snapshots](docs/rollup-data.js) reproduce the change in platform entries using npm’s target flags on Windows. The lesson links the original macOS report and npm fix separately.

## По-русски

На первой странице нажмите Merge. Два MR по отдельности проходят проверку npm, а после слияния становится видно, какое требование плагина мешает собрать общий lock-файл. Рядом можно посмотреть план, полученный от DepLoom Core до слияния. Опыт с React DOM и упражнение про диапазоны доступны в меню «Примеры». В «Инструментах» можно проверить свой PR. Сравните две версии lock-файла, найдите оставшуюся старую копию, проверьте выбранные публичные версии по OSV и npm или задайте цель обновления и посмотрите требования соседей. Перетащите package.json и lock-файл в соответствующие поля. Для Yarn Classic и Berry карта показывает логические зависимости. Проверить фактическое окружение можно с помощью yarn why.

Планировщик проверяет известные peer-требования для явно заданных целей в корне проекта. Для фактической проверки обновления нужны новый lock-файл, чистая установка и тесты приложения.

Run the regression suite with `node --test tests/*.test.js`. Run `node tests/npm-pr-fixture.cjs` to reproduce the CI and override fixtures using an isolated loopback npm registry. The embedded npm semver bundle includes its ISC license. Yarn grammar (BSD-2-Clause), js-yaml (MIT), and React/React DOM/scheduler (MIT) licenses are in **docs/vendor/**. The React hint runs locally. Its strict TypeScript source is **examples/hint.tsx** (React 19.0.0, TypeScript 5.8.3).
