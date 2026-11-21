# npm lockfile versions

These locks were written by npm 11.19.1 from the same manifest and cached public npm metadata. The project declares `css-select@4.3.0` and `css-what@3.4.2`. The selector also requires `css-what@^6.0.1`, so npm places a second copy, version 6.2.2, inside the selector’s installation.

To regenerate a fixture, start with a separate empty directory for each version, copy `package.json`, then run `npm install --offline --ignore-scripts --no-audit --no-fund --package-lock-only --lockfile-version=1` with the captured package metadata available in the npm cache. Substitute 2 or 3 for the other files.

npm lock v1 stores nested installations under `dependencies` and declared requirements under `requires`. The top level includes hoisted transitive packages. The playground uses the selected project manifest for root declarations. A v1 lock by itself supplies installation paths and versions. A complete check of peer requirements needs additional package manifests.

npm lock v2 and v3 store installation paths and package metadata under `packages`. The playground reads this table in both formats. When a comparison crosses from v1 to v2 or v3, it compares the installation paths and versions available across both formats.

[Legacy package-lock specification](https://docs.npmjs.com/cli/v6/configuring-npm/package-lock-json/) · [Current package-lock specification](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json/)
