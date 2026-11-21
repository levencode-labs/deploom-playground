# DepLoom Migration Lab

[Открыть лабораторию](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

Open **Examples → All examples** to merge two working branches and see which webpack peer requirement breaks. Compare the merge with DepLoom Core’s recorded pre-merge plan. Interactive examples cover peer requirements, a disappearing React 19 hover hint, two webpack branches that conflict after merging, a stale lockfile in CI, and a scoped override that fixes one installed copy.

- **Tools** compares npm v1–v3 lockfiles by installation path and Yarn Classic/Berry locks by package request, uses the selected project files for an advisory and release-date report, and plans explicit updates or Yellow/Green freshness targets against known peer requirements.
- **Visualizations** traces package copies to a parent and prepares `npm explain` or `yarn why` for a selected copy. Its version-range tool shows the bounds of a package.json requirement and the position of the candidate offline. Published releases can be loaded separately.
- **Examples** links to the recorded npm/SSR runs and the offline teaching fixtures. Language and public example selections can be shared by URL.

Open **docs/index.html** locally or serve **docs/** with a static HTTP server. Select or drop `package.json` and `package-lock.json` or `yarn.lock` in the two fields at the top of any page. The tools reuse those files as you navigate. For a range check, `package.json` alone is sufficient. The exercises, lock comparison, tree and local part of the planner work offline. No build or dependency installation is required. The browser keeps project files local. Online checks show their destination before sending package names. The public site looks up release dates in npm and checks advisories independently in OSV. A failed connection stops further requests to that source. A hosted edition can check a same-origin OSV snapshot locally. The registry is fixed at deployment. Project contents and local paths stay on the device.

## Review a real update

- [CSS selector after an override](https://levencode-labs.github.io/deploom-playground/override.html?lang=en). Three independent lockfiles and observed results are in [selector-data.js](docs/selector-data.js). Run `node tests/selector-replay.cjs` to clean-install each revision and check the selector against its recording.
- [Webpack merge](https://levencode-labs.github.io/deploom-playground/combinations.html?lang=en). In [the fixed fixture](tests/fixtures/webpack-css), run `npm ci --ignore-scripts --no-audit --no-fund --strict-peer-deps` then `node verify.cjs` to build the page and check the CSS linked by its HTML. This replays [the merged branch with css-loader 6.11.0](docs/webpack-build.json). For the separate Core assignment that keeps css-loader 3.6.0, run `node tests/webpack-core-build.cjs` from the repository root. It installs the four assigned versions from their own committed lockfile and runs the same CSS check.
- [Rollup in CI](https://levencode-labs.github.io/deploom-playground/ci.html?lang=en#rollup). [The two lockfile snapshots](docs/rollup-data.js) reproduce the change in platform entries using npm’s target flags on Windows. The lesson links the original macOS report and npm fix separately.

## По-русски

На первой странице нажмите Merge. Два MR по отдельности проходят проверку npm, а после слияния становится видно, какое требование плагина мешает собрать общий lock-файл. Рядом можно посмотреть план, полученный от DepLoom Core до слияния. Опыт с React DOM доступен в меню «Примеры». В шапке выберите или перетащите `package.json` и `package-lock.json` либо `yarn.lock`. Инструменты подхватят их при переходе между страницами. В «Визуализациях» откройте «Проверить диапазон», выберите зависимость из манифеста и подставьте проверяемую версию. Для этой проверки достаточно одного `package.json`. Опубликованные выпуски можно запросить отдельной кнопкой. В «Инструментах» можно проверить свой MR. Аудит по выбранным файлам покажет долю прямых библиотек с отставанием больше 12 календарных месяцев, охват проверки и версии с известными уязвимостями. Разверните находку, чтобы увидеть пути. На публичном сайте даты выпусков даёт npm, сведения об уязвимостях — OSV. Если один из источников недоступен, отчёт показывает охват каждого отдельно. Для Yarn Classic и Berry карта показывает логические зависимости. Проверить фактическое окружение можно с помощью yarn why.

В планировщике доступны цели Yellow и Green и выбор конкретных пакетов. Для доли актуальных прямых зависимостей пороги — 80% и 100% соответственно. Условия безопасности проверяются отдельно. Для фактической проверки обновления нужны новый lock-файл, чистая установка и тесты приложения.

Run the regression suite with `node --test tests/*.test.js`. The [version range tool](https://levencode-labs.github.io/deploom-playground/ranges.html?lang=en) includes saved examples from React DOM for offline use. The embedded npm semver bundle includes its ISC license. Yarn grammar (BSD-2-Clause), js-yaml (MIT), and React/React DOM/scheduler (MIT) licenses are in **docs/vendor/**. The React hint runs locally. Its strict TypeScript source is **examples/hint.tsx** (React 19.0.0, TypeScript 5.8.3).

### Building the hosted OSV snapshot

Hosted deployments that enable snapshot mode serve their snapshot from the same origin as the lab. During deployment use Python 3 to generate a compressed asset from the official complete npm OSV export:

```sh
python tools/build_hosted_osv.py docs/audit-data/osv-npm-v1.json.gz
```

The builder derives the snapshot date from the export's HTTP Last-Modified header. Refresh the file within its seven-day lifetime. To rebuild offline, supply `--archive /path/to/npm/all.zip --published 2026-11-21T03:33:18Z` with the saved archive's actual upstream date. Install the generated asset together with the hosted edition. Existing deployments can keep using `osv-npm-v1.json` by generating that filename instead. The client tries the plain file first and falls back to the .gz file on HTTP 404. When switching to .gz, publish the directory without an older plain file. Public GitHub Pages uses the live OSV adapter.

Each OSV ID has one local metadata record for its title, publication and modification timestamps, and aliases. The package index retains the affected versions and ranges. Both come from the same export. Reading or expanding findings sends no package names or advisory IDs to an external service. Older v1 snapshots still support version matching; regenerate them to surface the optional metadata. Unavailable publication dates remain unknown.
