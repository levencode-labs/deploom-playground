# DepLoom Migration Lab

[Открыть лабораторию](https://levencode-labs.github.io/deploom-playground/?lang=ru) · [Open in English](https://levencode-labs.github.io/deploom-playground/?lang=en)

DepLoom Migration Lab is a browser-based workshop for understanding dependency updates and testing their effects on a lockfile or an application.

## Quick start

1. Open the [CSS selector exercise](https://levencode-labs.github.io/deploom-playground/override.html?lang=en).
2. Compare the selector before and after the dependency override. Use the recorded lockfiles and selector result to see what changed in the application.
3. To review your own project, open [Tools](https://levencode-labs.github.io/deploom-playground/?lang=en) and add `package.json` and your lockfile. Check the proposed version changes and run the project's installation and tests in your local branch.

## Tools and handbook

Open the [dependency handbook](https://levencode-labs.github.io/deploom-playground/handbook.html?lang=en) for six chapters on version selection, module identity, reproducible installs, platform differences, runtime failures, and release checks. Every lesson includes two worked examples and an interactive exercise.

- **Tools** compares npm v1–v3 lockfiles by installation path and Yarn Classic/Berry locks by package request, uses the selected project files for an advisory and release-date report, and plans explicit updates or Yellow/Green freshness targets against known peer requirements.
- **Visualizations** traces package copies to a parent and prepares `npm explain` or `yarn why` for a selected copy. Its version-range tool shows the bounds of a package.json requirement and the position of the candidate offline. Published releases can be loaded separately.
- **Handbook** opens the reader. Expand a chapter in the contents, hide the sidebar while reading, or share a link to a lesson. Relevant lessons lead to the recorded npm and SSR runs.

Open **docs/index.html** locally or serve **docs/** with a static HTTP server. Select or drop `package.json` and `package-lock.json` or `yarn.lock` in the two fields above the tools. The tools reuse those files as you navigate. The dependency tree can start with either file. Pasting JSON into the tree editor takes precedence there. Clear the editor to return to the files in the header. For a range check, `package.json` alone is sufficient. The exercises, lock comparison, tree and local part of the planner work offline. No build or dependency installation is required. The browser keeps project files local. Online checks show their destination before sending package names. The public site looks up release dates in npm and checks advisories independently in OSV. A failed connection stops further requests to that source. A hosted edition can check a same-origin OSV snapshot locally. The registry is fixed at deployment. Project contents and local paths stay on the device.

## Review a real update

- [CSS selector after an override](https://levencode-labs.github.io/deploom-playground/override.html?lang=en). Three independent lockfiles and observed results are in [selector-data.js](docs/selector-data.js). Run `node tests/selector-replay.cjs` to clean-install each revision and check the selector against its recording.
- [Webpack merge](https://levencode-labs.github.io/deploom-playground/combinations.html?lang=en). In [the fixed fixture](tests/fixtures/webpack-css), run `npm ci --ignore-scripts --no-audit --no-fund --strict-peer-deps` then `node verify.cjs` to build the page and check the CSS linked by its HTML. This replays [the merged branch with css-loader 6.11.0](docs/webpack-build.json). For the separate Core assignment that keeps css-loader 3.6.0, run `node tests/webpack-core-build.cjs` from the repository root. It installs the four assigned versions from their own committed lockfile and runs the same CSS check.
- [Rollup in CI](https://levencode-labs.github.io/deploom-playground/ci.html?lang=en#rollup). [The two lockfile snapshots](docs/rollup-data.js) reproduce the change in platform entries using npm’s target flags on Windows. The lesson links the original macOS report and npm fix separately.

## По-русски

**Быстрый старт.** Откройте [пример с CSS-селектором](https://levencode-labs.github.io/deploom-playground/override.html?lang=ru). Сравните версии, lockfile и результат до и после обновления. Затем в [лаборатории](https://levencode-labs.github.io/deploom-playground/?lang=ru) загрузите манифест и lockfile своего проекта для разбора обновления.

Откройте [учебник по зависимостям](https://levencode-labs.github.io/deploom-playground/handbook.html?lang=ru). В шести главах 25 параграфов с примерами и упражнениями. Например, в параграфе «Две зелёные ветки встретились» можно перейти к слиянию двух webpack-веток и увидеть требование плагина, из-за которого не собирается общий lock-файл. В шапке инструментов выберите или перетащите `package.json` и `package-lock.json` либо `yarn.lock`. Инструменты подхватят их при переходе между страницами. Дерево можно открыть и с одним файлом. Вставленный в редактор дерева JSON имеет приоритет. Очистите поле, чтобы вернуться к файлам из шапки. В «Визуализациях» откройте «Проверить диапазон», выберите зависимость из манифеста и подставьте проверяемую версию. Для этой проверки достаточно одного `package.json`. Опубликованные выпуски можно запросить отдельной кнопкой. В «Инструментах» можно проверить свой MR. Аудит по выбранным файлам покажет долю прямых библиотек с отставанием больше 12 календарных месяцев, охват проверки и версии с известными уязвимостями. Разверните находку, чтобы увидеть пути. На публичном сайте даты выпусков даёт npm, сведения об уязвимостях — OSV. Если один из источников недоступен, отчёт показывает охват каждого отдельно. Для Yarn Classic и Berry карта показывает логические зависимости. Проверить фактическое окружение можно с помощью yarn why.

В планировщике доступны цели Yellow и Green и выбор конкретных пакетов. Для доли актуальных прямых зависимостей пороги — 80% и 100% соответственно. Условия безопасности проверяются отдельно. Для фактической проверки обновления нужны новый lock-файл, чистая установка и тесты приложения.

Run the regression suite with `node --test tests/*.test.js`. The [version range tool](https://levencode-labs.github.io/deploom-playground/ranges.html?lang=en) includes saved examples from React DOM for offline use. The header and favicon use the [official woven D mark from Levencode Labs](https://github.com/levencode-labs/.github/blob/a598fa627d5857e67393eebfacca0c0c3cc71090/assets/deploom-mark.svg). The embedded npm semver bundle includes its ISC license. Yarn grammar (BSD-2-Clause), js-yaml (MIT), and React/React DOM/scheduler (MIT) licenses are in **docs/vendor/**. The React hint runs locally. Its strict TypeScript source is **examples/hint.tsx** (React 19.0.0, TypeScript 5.8.3).

### Building the hosted OSV snapshot

The dependency map on GitHub Pages downloads a fixed OSV catalog. The public Sites mirror reads its bundled copy first and can use the published catalog if its copy expires or becomes unavailable. The browser matches installed versions locally as nodes come into view. The [refresh workflow](.github/workflows/osv-snapshot.yml) checks the upstream npm export daily and publishes a fresh catalog to the `osv-data` branch when the current export is at least three days old. Its **Run workflow** button can retry a failed refresh. An expired or unavailable catalog leaves coverage unknown. A private or local deployment can use the same-origin asset below.

Hosted deployments that enable snapshot mode serve their snapshot from the same origin as the lab. During deployment use Python 3 to generate a compressed asset from the official complete npm OSV export:

```sh
python tools/build_hosted_osv.py docs/audit-data/osv-npm-v1.json.gz
```

The builder derives the snapshot date from the export's HTTP Last-Modified header. Refresh the file within its seven-day lifetime. To rebuild offline, supply `--archive /path/to/npm/all.zip --published 2026-11-21T03:33:18Z` with the saved archive's actual upstream date. Install the generated asset together with the hosted edition. Existing deployments can keep using `osv-npm-v1.json` by generating that filename instead. The client tries the plain file first and falls back to the .gz file on HTTP 404. When switching to .gz, publish the directory without an older plain file. The project and package audit forms on GitHub Pages use the live OSV adapter.

Each OSV ID has one local metadata record for its title, publication and modification timestamps, and aliases. The package index retains the affected versions and ranges. Both come from the same export. Reading or expanding findings sends no package names or advisory IDs to an external service. Older v1 snapshots still support version matching; regenerate them to surface the optional metadata. Unavailable publication dates remain unknown.

The dependency map has Tree, Packages by group and Groups views. The grouped views show direct package.json declarations. Choose Ecosystems for familiar tooling families such as ESLint, TypeScript and Storybook, or use the multilevel Louvain algorithm to find densely connected packages from observed lockfile edges. Select a group to inspect its members and the evidence behind its connections. The webpack groups example uses the original [package.json and Yarn Classic lockfile from webpack 5.91.0](https://github.com/webpack/webpack/tree/60daca54105f89eee45e118fd0bbc820730724ee) under the included MIT license.

### Keeping GitHub Pages and Sites in sync

The six overview tiles weave on hover or keyboard focus and unwind on exit. Run `node tests/tile-weave.cjs` with Playwright and Chromium to check the motion and reduced-motion behavior.

To prepare a public release, run `python tools/package_public_site.py <built-public-directory>` against the complete static site. Publish that directory on Sites, including the generated `site-files.sha256` and the content-addressed archive under `releases/`. In a `release/sites-*` branch, set `.github/sites-release.sha256` to the SHA-256 of the published manifest. The mirror workflow verifies every file and commits the release to that branch. Merge its PR to publish GitHub Pages from `main/docs`.
