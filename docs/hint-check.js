'use strict';
(() => {
  const {t, setExampleState} = Lab;
  const choice = document.getElementById('hint-test');
  const mount = document.getElementById('hint-mount');
  const output = document.getElementById('hint-observation');
  let generation = 0;
  function reset() {
    generation++;
    output.textContent = '';
    delete output.dataset.status;
  }
  const prior = new URLSearchParams(location.search).get('assertion');
  if (prior === 'status' || prior === 'hint') choice.elements.assertion.value = prior;
  choice.addEventListener('change', () => {
    reset();
    setExampleState({assertion: choice.elements.assertion.value});
  });
  mount.addEventListener('click', event => {
    if (event.target.closest('button.button')) reset();
  });

  function inspect(event) {
    const button = event.target.closest('.hint-demo button');
    const test = choice.elements.assertion.value;
    if (!button || !test) return;
    const run = ++generation;
    // The interaction must finish and React must commit its tooltip before the assertion reads the DOM.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (run !== generation || !button.isConnected) return;
      const element = test === 'status' ? button : mount.querySelector('[role="tooltip"]');
      const expected = test === 'status' ? t('На проверке', 'Pending review') :
        t('Ожидает проверки коллегой', 'Waiting for a reviewer');
      const passed = Boolean(element && element.getClientRects().length &&
        getComputedStyle(element).visibility === 'visible' && element.textContent.includes(expected));
      output.dataset.status = passed ? 'pass' : 'fail';
      output.textContent = (passed ? t('Тест прошёл. Видно «', 'Test passed. Visible: “') :
        t('Тест упал. Ожидали увидеть «', 'Test failed. Expected to see “')) + expected +
        (passed ? t('».', '”.') : t('», но текста нет.', '”, but the text is missing.'));
    }));
  }
  for (const event of ['mouseover','focusin','click']) mount.addEventListener(event, inspect);
})();
