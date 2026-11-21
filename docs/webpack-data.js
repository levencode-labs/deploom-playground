'use strict';
(() => {
  // Direct package records from the successful UI and fixed branch lockfiles.
  const records = new Map(Object.entries({
    "css-loader@3.6.0": {"name":"css-loader","version":"3.6.0","resolved":"https://registry.npmjs.org/css-loader/-/css-loader-3.6.0.tgz","peerDependencies":{"webpack":"^4.0.0 || ^5.0.0"}},
    "mini-css-extract-plugin@0.9.0": {"name":"mini-css-extract-plugin","version":"0.9.0","resolved":"https://registry.npmjs.org/mini-css-extract-plugin/-/mini-css-extract-plugin-0.9.0.tgz","peerDependencies":{"webpack":"^4.4.0"}},
    "webpack@4.47.0": {"name":"webpack","version":"4.47.0","resolved":"https://registry.npmjs.org/webpack/-/webpack-4.47.0.tgz","peerDependenciesMeta":{"webpack-cli":{"optional":true},"webpack-command":{"optional":true}}},
    "webpack-cli@3.3.12": {"name":"webpack-cli","version":"3.3.12","resolved":"https://registry.npmjs.org/webpack-cli/-/webpack-cli-3.3.12.tgz","peerDependencies":{"webpack":"4.x.x"}},
    "css-loader@6.11.0": {"name":"css-loader","version":"6.11.0","resolved":"https://registry.npmjs.org/css-loader/-/css-loader-6.11.0.tgz","peerDependencies":{"@rspack/core":"0.x || 1.x","webpack":"^5.0.0"},"peerDependenciesMeta":{"@rspack/core":{"optional":true},"webpack":{"optional":true}}},
    "mini-css-extract-plugin@2.9.0": {"name":"mini-css-extract-plugin","version":"2.9.0","resolved":"https://registry.npmjs.org/mini-css-extract-plugin/-/mini-css-extract-plugin-2.9.0.tgz","peerDependencies":{"webpack":"^5.0.0"}},
    "webpack@5.91.0": {"name":"webpack","version":"5.91.0","resolved":"https://registry.npmjs.org/webpack/-/webpack-5.91.0.tgz","peerDependenciesMeta":{"webpack-cli":{"optional":true}}},
    "webpack-cli@4.10.0": {"name":"webpack-cli","version":"4.10.0","resolved":"https://registry.npmjs.org/webpack-cli/-/webpack-cli-4.10.0.tgz","peerDependencies":{"webpack":"4.x.x || 5.x.x"},"peerDependenciesMeta":{"@webpack-cli/generators":{"optional":true},"@webpack-cli/migrate":{"optional":true},"webpack-bundle-analyzer":{"optional":true},"webpack-dev-server":{"optional":true}}},
  }));
  const base = {webpack:'4.47.0','css-loader':'3.6.0','webpack-cli':'3.3.12'};
  const build = {webpack:'5.91.0','css-loader':'6.11.0','webpack-cli':'4.10.0'};
  const ui = {'mini-css-extract-plugin':'0.9.0'};
  const merged = {...build,...ui};
  const fixed = {...build,'mini-css-extract-plugin':'2.9.0'};
  const versions = {};
  for (const record of records.values()) {
    const range = record.peerDependencies?.webpack;
    if (range) (versions[record.name] ||= {})[record.version] = range;
  }

  function planner(revision) {
    if (!['merged','fixed'].includes(revision)) return null;
    const manifest = {name:'merge-lesson',devDependencies:{...base,...ui}};
    const packages = {'':manifest};
    for (const [name,v] of Object.entries(manifest.devDependencies))
      packages['node_modules/'+name] = records.get(name+'@'+v);
    // The conflicting merge has no lock; check its targets against the UI baseline.
    return {manifest, lock:{lockfileVersion:3,packages}, targets:revision==='merged' ? merged : fixed};
  }

  const data = {base,build,ui,merged,fixed,versions,records,planner};
  if (typeof module==='object' && module.exports) module.exports=data;
  else window.LabWebpack=data;
})();
