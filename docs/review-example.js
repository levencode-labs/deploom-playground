'use strict';
// Only bundled fixtures can be put in a link. Uploaded files are never registered here.
(() => {
  const params = new URLSearchParams(location.search);
  const kind = params.get('example');
  const revision = params.get('rev');
  function fixture(example = kind, rev = revision) {
    if (example === 'selector' && Object.hasOwn(SelectorLab.cases, rev)) return SelectorLab.cases[rev];
    if (example === 'copies' && ['before','after'].includes(rev)) {
      const lock = LabSamples[rev];
      return {lock,manifest:{...lock.packages[''],...(rev==='after'?{overrides:{'ui-kit':{'shared-utils':'1.2.4'}}}:{})}};
    }
    return null;
  }
  function link(page, example, rev, path) {
    const item = fixture(example,rev);
    if (!item) return Lab.urlFor(page);
    const query = new URLSearchParams({example,rev});
    if (path && Object.hasOwn(item.lock.packages,path)) query.set('path',path);
    return Lab.urlFor(page+'?'+query);
  }
  window.ReviewExample = {kind,revision,fixture,link};
})();
