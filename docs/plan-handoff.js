'use strict';
(() => {
  const {t} = Lab;
  function attach(parent, {targets, goal, conflicts, unchecked, missing = 0, example}) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = t('Промпт для Claude Code, Codex или Cursor', 'Prompt for Claude Code, Codex or Cursor');
    const text = document.createElement('textarea');
    text.className = 'agent-prompt';
    text.readOnly = true;
    text.rows = 7;
    text.setAttribute('aria-label', summary.textContent);
    const context = example ? t('Это учебный пример. Сначала проверь, есть ли эти пакеты в открытом проекте.', 'This is a demo. First check whether the open project uses these packages.') : '';
    text.value = [
      t('Открой package.json и lock-файл текущего проекта. Через DepLoom MCP составь план обновления для ревью.', 'Read the current project’s package.json and lockfile. Use DepLoom MCP to prepare an upgrade plan for review.'),
      context, goal, JSON.stringify(targets, null, 2),
      missing ? t('Целей без метаданных: ', 'Targets missing metadata: ') + missing + '.' : '',
      t('Обнаружено peer-конфликтов в браузере: ', 'Peer conflicts found in the browser: ') + conflicts + '. ' +
        t('Непроверенных записей: ', 'Unchecked entries: ') + unchecked + '.',
      t('Сверь версии с локальным lock-файлом. Объясни, какие пакеты нужно обновить вместе и почему. Предложи минимальный MR и команду проверки. Перед изменением файлов покажи план.',
        'Verify versions against the local lockfile. Explain which packages must change together and why. Suggest the smallest reviewable change and a verification command. Show the plan before editing files.')
    ].filter(Boolean).join('\n\n');
    const button = document.createElement('button'), status = document.createElement('span');
    button.type = 'button';
    button.textContent = t('Скопировать промпт', 'Copy prompt');
    status.setAttribute('role', 'status');
    button.onclick = async () => {
      try {
        await navigator.clipboard.writeText(text.value);
        status.textContent = t(' Скопировано.', ' Copied.');
      } catch {
        details.open = true;
        text.focus();
        text.select();
        status.textContent = t(' Текст выделен для копирования.', ' The text is selected for copying.');
      }
    };
    details.append(summary, text);
    parent.append(details, button, status);
  }
  window.LabPlanHandoff = {attach};
})();
