(() => {
  'use strict';

  const { t } = window.Lab;
  document.title = t('Известные уязвимости · DepLoom', 'Known vulnerabilities · DepLoom');

  const form = document.getElementById('advisory-form');
  const nameField = document.getElementById('package');
  const versionField = document.getElementById('version');
  const scopeConfirmation = document.getElementById('scope-confirmation');
  const publicScope = document.getElementById('public-scope');
  const status = document.getElementById('query-status');
  const list = document.getElementById('advisories');
  const otherSource = document.getElementById('other-source');
  const githubLink = document.getElementById('github-link');
  const packageName = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
  const versionPart = '(?:0|[1-9][0-9]*)';
  const preId = '(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
  const exactVersion = new RegExp('^' + [versionPart, versionPart, versionPart].join('\\.') + '(?:-' + preId + '(?:\\.' + preId + ')*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$');
  let activeRequest;

  function resetResult() {
    activeRequest?.abort();
    activeRequest = undefined;
    status.textContent = '';
    list.replaceChildren();
    list.hidden = true;
    otherSource.hidden = true;
    githubLink.removeAttribute('href');
  }

  form.addEventListener('input', event => {
    resetResult();
    if (event.target === nameField) publicScope.checked = false;
    scopeConfirmation.hidden = !nameField.value.trim().startsWith('@');
  });

  async function getAdvisories(name, version, signal) {
    const matches = new Map();
    const seenTokens = new Set();
    let token;
    do {
      const query = { package: { name, ecosystem: 'npm' }, version };
      if (token) query.page_token = token;
      const response = await fetch('https://api.osv.dev/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal,
      });
      if (!response.ok) throw new Error('OSV HTTP ' + response.status);
      const data = await response.json();
      if (!data || Array.isArray(data) || typeof data !== 'object' || data.error ||
          (data.vulns !== undefined && !Array.isArray(data.vulns)) ||
          (data.next_page_token !== undefined && typeof data.next_page_token !== 'string')) {
        throw new Error('Unexpected OSV response');
      }
      for (const entry of data.vulns ?? []) {
        if (typeof entry?.id !== 'string' || !entry.id) throw new Error('Missing OSV ID');
        if (!entry.withdrawn) matches.set(entry.id, entry);
      }
      token = data.next_page_token;
      if (token && seenTokens.has(token)) throw new Error('Repeated OSV page');
      seenTokens.add(token);
    } while (token);
    return matches;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    resetResult();
    const name = nameField.value.trim();
    const version = versionField.value.trim();
    if (!packageName.test(name)) {
      status.textContent = t('Введите имя npm-пакета, например lodash или @babel/core.', 'Enter an npm package name such as lodash or @babel/core.');
      nameField.focus();
      return;
    }
    if (!exactVersion.test(version)) {
      status.textContent = t('Нужна точная версия, например 4.17.20. Диапазоны и теги не подходят.', 'Enter an exact version such as 4.17.20. Ranges and tags are not supported.');
      versionField.focus();
      return;
    }
    if (name.startsWith('@') && !publicScope.checked) {
      scopeConfirmation.hidden = false;
      status.textContent = t('Подтвердите публичность имени перед отправкой.', 'Confirm the package name is public before submitting.');
      publicScope.focus();
      return;
    }

    const requested = name + '@' + version;
    const parameters = new URLSearchParams({ ecosystem: 'npm', affects: requested, per_page: '100' });
    githubLink.href = 'https://api.github.com/advisories?' + parameters;
    otherSource.hidden = false;
    const controller = new AbortController();
    activeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    status.textContent = t('Ищу записи для ', 'Checking advisories for ') + requested + '…';
    try {
      const matches = await getAdvisories(name, version, controller.signal);
      if (controller !== activeRequest) return;
      if (matches.size === 0) {
        status.textContent = t('OSV не вернула известных записей для ', 'OSV returned no known advisories for ') + requested + '. ' +
          t('Проверьте имя и версию. OSV не подтверждает наличие пакета в npm.', 'Check the name and version. OSV does not confirm a package exists in npm.');
        return;
      }
      status.textContent = requested + ' · ' + t('Записей в OSV — ', 'OSV advisories — ') + matches.size;
      for (const entry of matches.values()) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = 'https://osv.dev/vulnerability/' + encodeURIComponent(entry.id);
        link.textContent = entry.id;
        item.append(link);
        if (typeof entry.summary === 'string' && entry.summary) item.append(' — ' + entry.summary);
        list.append(item);
      }
      list.hidden = false;
    } catch {
      if (controller !== activeRequest) return;
      status.textContent = t('Результат неизвестен. Не удалось получить полный ответ OSV для ', 'Result unknown. A complete OSV response was unavailable for ') +
        requested + '. ' + t('Проверьте соединение и повторите запрос. Ниже есть сохранённый пример.', 'Check your connection and try again. A saved example is available below.');
    } finally {
      clearTimeout(timeout);
      if (controller === activeRequest) activeRequest = undefined;
    }
  });

  document.getElementById('query-button').disabled = false;
  scopeConfirmation.hidden = !nameField.value.trim().startsWith('@');
})();
