# Сверка учебника с двумя исходными списками

## 16 групп из первого файла

| Группа | Где разбираем | Статус |
|---|---|---|
| 1. Ветки работали отдельно, merge сломал | `merged-branches`, `lock-after-merge`, `tested-snapshot` | Основное правило; не все варианты нового кода/override |
| 2. Пары плагинов совместимы, все три — нет | `shared-host` | Самостоятельный интерактивный случай |
| 3. Две физические копии пакета | `nested-copies`, `react-instance`, `borrowed-dependency` | Объяснено; не все варианты глубоких деревьев |
| 4. Диапазон в package.json и выбранная версия | `range-and-lock`, `lock-reselection` | Основы; prerelease надо разобрать дополнительно |
| 5. Lock испорчен или изменён слишком широко | `lock-after-merge`, `lock-reselection`, `npm-lock-reader` | Основные варианты; ручная подмена integrity остаётся за рамками |
| 6. Режим установки различается | `peer-install-mode`, `install-omissions`, `across-environments` | Основы; нюансы lifecycle scripts требуют отдельного практикума |
| 7. Платформа и архитектура | `rollup-platform`, `across-environments` | Mac/Linux; glibc/musl в виде отдельного опыта не добавлены |
| 8. Установилось, но модуль не загрузился | `module-loader`, `audit-and-api` | ESM/CJS и другой API; не все варианты exports |
| 9. Установка прошла, TypeScript падает | `type-boundaries`, `angular-ts-limit`, `lock-reselection` | Основной механизм; несколько типовых проектов ещё полезны |
| 10. Сборка есть, действие не работает | `user-actions`, `quill-react19`, `browser-and-server` | Tooltip, редактор, SSR |
| 11. Один инструмент тянет соседние | `upgrade-cohorts`, `eslint-family`, `stylelint-family`, `storybook-family`, `shared-host` | Все ключевые классы получили урок |
| 12. Монорепозиторий случайно работает за счёт другого | `borrowed-dependency`, `consumer-tarball` | Основной сценарий; отдельный случай «удалили поставщика зависимости» остался |
| 13. Исправление работает только у автора | `consumer-tarball`, `audit-and-api` | Публикация, root overrides; отдельный workspace override не показан |
| 14. Registry, кеш и доступность пакета | `registry-view`, `registry-artifact`, `missing-release` | Основы; приватные зеркала и политику кеша ещё нужно тренировать |
| 15. Аудит зелёный, цель не доказана | `audit-coverage`, `audit-and-api`, `search-bounds` | Unknown/coverage и проверка поведения; Yellow/Green критерии остались в существующих инструментах |
| 16. Проверено не то состояние или не то свойство | `tested-snapshot`, `search-bounds`, `repeat-codemod` | Основы; отдельный checkpoint и copy/promote ещё полезны |

## 15 историй из второго файла

| # | История | Урок |
|---|---|---|
| 1 | Formik в workspaces | `borrowed-dependency` |
| 2 | Две копии React | `react-instance` |
| 3 | Удалённый lock и новые типы React | `lock-reselection` |
| 4 | npm отверг собственный lock c overrides | `npm-lock-reader` |
| 5 | NestJS / Elasticsearch и --legacy-peer-deps | `peer-install-mode` |
| 6 | Rollup macOS / Linux | `rollup-platform` |
| 7 | Chalk, ESM и require | `module-loader` |
| 8 | @types/node и старый TypeScript | `type-boundaries` |
| 9 | react-quill и React 19 | `quill-react19` |
| 10 | Jest + ts-jest и отдельный предел Angular | `upgrade-cohorts` и `angular-ts-limit` |
| 11 | Root overrides у автора библиотеки | `consumer-tarball` |
| 12 | Исчезновение left-pad | `missing-release` |
| 13 | nth-check и SVG | `audit-and-api` |
| 14 | Проверки двух PR не проверяют merge | `tested-snapshot` и `merged-branches` |
| 15 | Повторный codemod MUI | `repeat-codemod` |

**Важно.** Представить реальную историю в учебнике не означает воспроизвести её с настоящим npm в песочнице. Часть новых параграфов — объяснения с учебными моделями. Ранее существовавшие лаборатории сохраняются. Следующий этап для 100% покрытия — отдельные воспроизводимые задания по оставшимся вариантам, а не ещё больше текста в одних и тех же уроках.
