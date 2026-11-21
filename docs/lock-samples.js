'use strict';

// Reduced npm v3 locks for the two-parent override exercise. Transport metadata is omitted.
(() => {
  function lock(uiCopy) {
    return {
      name: 'pr-demo',
      version: '1.0.0',
      lockfileVersion: 3,
      requires: true,
      packages: {
        '': {name: 'pr-demo', version: '1.0.0', dependencies: {'ui-kit': '1.0.0', 'build-tool': '1.0.0'}},
        'node_modules/ui-kit': {version: '1.0.0', dependencies: {'shared-utils': '1.2.3'}},
        'node_modules/ui-kit/node_modules/shared-utils': {version: uiCopy},
        'node_modules/build-tool': {version: '1.0.0', dependencies: {'shared-utils': '1.2.3'}},
        'node_modules/build-tool/node_modules/shared-utils': {version: '1.2.3'},
      },
    };
  }
  window.LabSamples = {before: lock('1.2.3'), after: lock('1.2.4')};
})();
