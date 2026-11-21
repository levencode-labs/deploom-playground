'use strict';
// Captured on three separate clean installations. Replay with node tests/selector-replay.cjs.
(() => {
  const data = {
  "selector": "rect:nth-child(2)",
  "environment": {
    "node": "24.18.0",
    "npm": "11.16.0",
    "platform": "win32",
    "arch": "x64"
  },
  "cases": {
    "base": {
      "manifest": {
        "name": "selector-review",
        "version": "1.0.0",
        "private": true,
        "dependencies": {
          "css-select": "2.1.0"
        }
      },
      "lock": {
        "name": "selector-review",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "requires": true,
        "packages": {
          "": {
            "name": "selector-review",
            "version": "1.0.0",
            "dependencies": {
              "css-select": "2.1.0"
            }
          },
          "node_modules/boolbase": {
            "version": "1.0.0",
            "resolved": "https://registry.npmjs.org/boolbase/-/boolbase-1.0.0.tgz",
            "integrity": "sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==",
            "license": "ISC"
          },
          "node_modules/css-select": {
            "version": "2.1.0",
            "resolved": "https://registry.npmjs.org/css-select/-/css-select-2.1.0.tgz",
            "integrity": "sha512-Dqk7LQKpwLoH3VovzZnkzegqNSuAziQyNZUcrdDM401iY+R5NkGBXGmtO05/yaXQziALuPogeG0b7UAgjnTJTQ==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "^1.0.0",
              "css-what": "^3.2.1",
              "domutils": "^1.7.0",
              "nth-check": "^1.0.2"
            }
          },
          "node_modules/css-what": {
            "version": "3.4.2",
            "resolved": "https://registry.npmjs.org/css-what/-/css-what-3.4.2.tgz",
            "integrity": "sha512-ACUm3L0/jiZTqfzRM3Hi9Q8eZqd6IK37mMWPLz9PJxkLWllYeRf+EHUSHYEtFop2Eqytaq1FizFVh7XfBnXCDQ==",
            "license": "BSD-2-Clause",
            "engines": {
              "node": ">= 6"
            },
            "funding": {
              "url": "https://github.com/sponsors/fb55"
            }
          },
          "node_modules/dom-serializer": {
            "version": "0.2.2",
            "resolved": "https://registry.npmjs.org/dom-serializer/-/dom-serializer-0.2.2.tgz",
            "integrity": "sha512-2/xPb3ORsQ42nHYiSunXkDjPLBaEj/xTwUO4B7XCZQTRk7EBtTOPaygh10YAAh2OI1Qrp6NWfpAhzswj0ydt9g==",
            "license": "MIT",
            "dependencies": {
              "domelementtype": "^2.0.1",
              "entities": "^2.0.0"
            }
          },
          "node_modules/dom-serializer/node_modules/domelementtype": {
            "version": "2.3.0",
            "resolved": "https://registry.npmjs.org/domelementtype/-/domelementtype-2.3.0.tgz",
            "integrity": "sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==",
            "funding": [
              {
                "type": "github",
                "url": "https://github.com/sponsors/fb55"
              }
            ],
            "license": "BSD-2-Clause"
          },
          "node_modules/domelementtype": {
            "version": "1.3.1",
            "resolved": "https://registry.npmjs.org/domelementtype/-/domelementtype-1.3.1.tgz",
            "integrity": "sha512-BSKB+TSpMpFI/HOxCNr1O8aMOTZ8hT3pM3GQ0w/mWRmkhEDSFJkkyzz4XQsBV44BChwGkrDfMyjVD0eA2aFV3w==",
            "license": "BSD-2-Clause"
          },
          "node_modules/domutils": {
            "version": "1.7.0",
            "resolved": "https://registry.npmjs.org/domutils/-/domutils-1.7.0.tgz",
            "integrity": "sha512-Lgd2XcJ/NjEw+7tFvfKxOzCYKZsdct5lczQ2ZaQY8Djz7pfAD3Gbp8ySJWtreII/vDlMVmxwa6pHmdxIYgttDg==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "dom-serializer": "0",
              "domelementtype": "1"
            }
          },
          "node_modules/entities": {
            "version": "2.2.0",
            "resolved": "https://registry.npmjs.org/entities/-/entities-2.2.0.tgz",
            "integrity": "sha512-p92if5Nz619I0w+akJrLZH0MX0Pb5DX39XOwQTtXSdQQOaYH03S1uIQp4mhOZtAXrxq4ViO67YTiLBo2638o9A==",
            "license": "BSD-2-Clause",
            "funding": {
              "url": "https://github.com/fb55/entities?sponsor=1"
            }
          },
          "node_modules/nth-check": {
            "version": "1.0.2",
            "resolved": "https://registry.npmjs.org/nth-check/-/nth-check-1.0.2.tgz",
            "integrity": "sha512-WeBOdju8SnzPN5vTUJYxYUxLeXpCaVP5i5e0LF8fg7WORF2Wd7wFX/pk0tYZk7s8T+J7VLy0Da6J1+wCT0AtHg==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "~1.0.0"
            }
          }
        }
      },
      "ciExit": 0,
      "cssVersion": "2.1.0",
      "cssPath": "node_modules/css-select",
      "nthVersion": "1.0.2",
      "nthPath": "node_modules/nth-check",
      "selected": [
        2
      ],
      "error": null
    },
    "override": {
      "manifest": {
        "name": "selector-review",
        "version": "1.0.0",
        "private": true,
        "dependencies": {
          "css-select": "2.1.0"
        },
        "overrides": {
          "css-select@2.1.0": {
            "nth-check": "2.1.1"
          }
        }
      },
      "lock": {
        "name": "selector-review",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "requires": true,
        "packages": {
          "": {
            "name": "selector-review",
            "version": "1.0.0",
            "dependencies": {
              "css-select": "2.1.0"
            }
          },
          "node_modules/boolbase": {
            "version": "1.0.0",
            "resolved": "https://registry.npmjs.org/boolbase/-/boolbase-1.0.0.tgz",
            "integrity": "sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==",
            "license": "ISC"
          },
          "node_modules/css-select": {
            "version": "2.1.0",
            "resolved": "https://registry.npmjs.org/css-select/-/css-select-2.1.0.tgz",
            "integrity": "sha512-Dqk7LQKpwLoH3VovzZnkzegqNSuAziQyNZUcrdDM401iY+R5NkGBXGmtO05/yaXQziALuPogeG0b7UAgjnTJTQ==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "^1.0.0",
              "css-what": "^3.2.1",
              "domutils": "^1.7.0",
              "nth-check": "^1.0.2"
            }
          },
          "node_modules/css-what": {
            "version": "3.4.2",
            "resolved": "https://registry.npmjs.org/css-what/-/css-what-3.4.2.tgz",
            "integrity": "sha512-ACUm3L0/jiZTqfzRM3Hi9Q8eZqd6IK37mMWPLz9PJxkLWllYeRf+EHUSHYEtFop2Eqytaq1FizFVh7XfBnXCDQ==",
            "license": "BSD-2-Clause",
            "engines": {
              "node": ">= 6"
            },
            "funding": {
              "url": "https://github.com/sponsors/fb55"
            }
          },
          "node_modules/dom-serializer": {
            "version": "0.2.2",
            "resolved": "https://registry.npmjs.org/dom-serializer/-/dom-serializer-0.2.2.tgz",
            "integrity": "sha512-2/xPb3ORsQ42nHYiSunXkDjPLBaEj/xTwUO4B7XCZQTRk7EBtTOPaygh10YAAh2OI1Qrp6NWfpAhzswj0ydt9g==",
            "license": "MIT",
            "dependencies": {
              "domelementtype": "^2.0.1",
              "entities": "^2.0.0"
            }
          },
          "node_modules/dom-serializer/node_modules/domelementtype": {
            "version": "2.3.0",
            "resolved": "https://registry.npmjs.org/domelementtype/-/domelementtype-2.3.0.tgz",
            "integrity": "sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==",
            "funding": [
              {
                "type": "github",
                "url": "https://github.com/sponsors/fb55"
              }
            ],
            "license": "BSD-2-Clause"
          },
          "node_modules/domelementtype": {
            "version": "1.3.1",
            "resolved": "https://registry.npmjs.org/domelementtype/-/domelementtype-1.3.1.tgz",
            "integrity": "sha512-BSKB+TSpMpFI/HOxCNr1O8aMOTZ8hT3pM3GQ0w/mWRmkhEDSFJkkyzz4XQsBV44BChwGkrDfMyjVD0eA2aFV3w==",
            "license": "BSD-2-Clause"
          },
          "node_modules/domutils": {
            "version": "1.7.0",
            "resolved": "https://registry.npmjs.org/domutils/-/domutils-1.7.0.tgz",
            "integrity": "sha512-Lgd2XcJ/NjEw+7tFvfKxOzCYKZsdct5lczQ2ZaQY8Djz7pfAD3Gbp8ySJWtreII/vDlMVmxwa6pHmdxIYgttDg==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "dom-serializer": "0",
              "domelementtype": "1"
            }
          },
          "node_modules/entities": {
            "version": "2.2.0",
            "resolved": "https://registry.npmjs.org/entities/-/entities-2.2.0.tgz",
            "integrity": "sha512-p92if5Nz619I0w+akJrLZH0MX0Pb5DX39XOwQTtXSdQQOaYH03S1uIQp4mhOZtAXrxq4ViO67YTiLBo2638o9A==",
            "license": "BSD-2-Clause",
            "funding": {
              "url": "https://github.com/fb55/entities?sponsor=1"
            }
          },
          "node_modules/nth-check": {
            "version": "2.1.1",
            "resolved": "https://registry.npmjs.org/nth-check/-/nth-check-2.1.1.tgz",
            "integrity": "sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "^1.0.0"
            },
            "funding": {
              "url": "https://github.com/fb55/nth-check?sponsor=1"
            }
          }
        }
      },
      "ciExit": 0,
      "cssVersion": "2.1.0",
      "cssPath": "node_modules/css-select",
      "nthVersion": "2.1.1",
      "nthPath": "node_modules/nth-check",
      "selected": [],
      "error": "TypeError: getNCheck is not a function"
    },
    "parent": {
      "manifest": {
        "name": "selector-review",
        "version": "1.0.0",
        "private": true,
        "dependencies": {
          "css-select": "4.3.0"
        }
      },
      "lock": {
        "name": "selector-review",
        "version": "1.0.0",
        "lockfileVersion": 3,
        "requires": true,
        "packages": {
          "": {
            "name": "selector-review",
            "version": "1.0.0",
            "dependencies": {
              "css-select": "4.3.0"
            }
          },
          "node_modules/boolbase": {
            "version": "1.0.0",
            "resolved": "https://registry.npmjs.org/boolbase/-/boolbase-1.0.0.tgz",
            "integrity": "sha512-JZOSA7Mo9sNGB8+UjSgzdLtokWAky1zbztM3WRLCbZ70/3cTANmQmOdR7y2g+J0e2WXywy1yS468tY+IruqEww==",
            "license": "ISC"
          },
          "node_modules/css-select": {
            "version": "4.3.0",
            "resolved": "https://registry.npmjs.org/css-select/-/css-select-4.3.0.tgz",
            "integrity": "sha512-wPpOYtnsVontu2mODhA19JrqWxNsfdatRKd64kmpRbQgh1KtItko5sTnEpPdpSaJszTOhEMlF/RPz28qj4HqhQ==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "^1.0.0",
              "css-what": "^6.0.1",
              "domhandler": "^4.3.1",
              "domutils": "^2.8.0",
              "nth-check": "^2.0.1"
            },
            "funding": {
              "url": "https://github.com/sponsors/fb55"
            }
          },
          "node_modules/css-what": {
            "version": "6.2.2",
            "resolved": "https://registry.npmjs.org/css-what/-/css-what-6.2.2.tgz",
            "integrity": "sha512-u/O3vwbptzhMs3L1fQE82ZSLHQQfto5gyZzwteVIEyeaY5Fc7R4dapF/BvRoSYFeqfBk4m0V1Vafq5Pjv25wvA==",
            "license": "BSD-2-Clause",
            "engines": {
              "node": ">= 6"
            },
            "funding": {
              "url": "https://github.com/sponsors/fb55"
            }
          },
          "node_modules/dom-serializer": {
            "version": "1.4.1",
            "resolved": "https://registry.npmjs.org/dom-serializer/-/dom-serializer-1.4.1.tgz",
            "integrity": "sha512-VHwB3KfrcOOkelEG2ZOfxqLZdfkil8PtJi4P8N2MMXucZq2yLp75ClViUlOVwyoHEDjYU433Aq+5zWP61+RGag==",
            "license": "MIT",
            "dependencies": {
              "domelementtype": "^2.0.1",
              "domhandler": "^4.2.0",
              "entities": "^2.0.0"
            },
            "funding": {
              "url": "https://github.com/cheeriojs/dom-serializer?sponsor=1"
            }
          },
          "node_modules/domelementtype": {
            "version": "2.3.0",
            "resolved": "https://registry.npmjs.org/domelementtype/-/domelementtype-2.3.0.tgz",
            "integrity": "sha512-OLETBj6w0OsagBwdXnPdN0cnMfF9opN69co+7ZrbfPGrdpPVNBUj02spi6B1N7wChLQiPn4CSH/zJvXw56gmHw==",
            "funding": [
              {
                "type": "github",
                "url": "https://github.com/sponsors/fb55"
              }
            ],
            "license": "BSD-2-Clause"
          },
          "node_modules/domhandler": {
            "version": "4.3.1",
            "resolved": "https://registry.npmjs.org/domhandler/-/domhandler-4.3.1.tgz",
            "integrity": "sha512-GrwoxYN+uWlzO8uhUXRl0P+kHE4GtVPfYzVLcUxPL7KNdHKj66vvlhiweIHqYYXWlw+T8iLMp42Lm67ghw4WMQ==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "domelementtype": "^2.2.0"
            },
            "engines": {
              "node": ">= 4"
            },
            "funding": {
              "url": "https://github.com/fb55/domhandler?sponsor=1"
            }
          },
          "node_modules/domutils": {
            "version": "2.8.0",
            "resolved": "https://registry.npmjs.org/domutils/-/domutils-2.8.0.tgz",
            "integrity": "sha512-w96Cjofp72M5IIhpjgobBimYEfoPjx1Vx0BSX9P30WBdZW2WIKU0T1Bd0kz2eNZ9ikjKgHbEyKx8BB6H1L3h3A==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "dom-serializer": "^1.0.1",
              "domelementtype": "^2.2.0",
              "domhandler": "^4.2.0"
            },
            "funding": {
              "url": "https://github.com/fb55/domutils?sponsor=1"
            }
          },
          "node_modules/entities": {
            "version": "2.2.0",
            "resolved": "https://registry.npmjs.org/entities/-/entities-2.2.0.tgz",
            "integrity": "sha512-p92if5Nz619I0w+akJrLZH0MX0Pb5DX39XOwQTtXSdQQOaYH03S1uIQp4mhOZtAXrxq4ViO67YTiLBo2638o9A==",
            "license": "BSD-2-Clause",
            "funding": {
              "url": "https://github.com/fb55/entities?sponsor=1"
            }
          },
          "node_modules/nth-check": {
            "version": "2.1.1",
            "resolved": "https://registry.npmjs.org/nth-check/-/nth-check-2.1.1.tgz",
            "integrity": "sha512-lqjrjmaOoAnWfMmBPL+XNnynZh2+swxiX3WUE0s4yEHI6m+AwrK2UZOimIRl3X/4QctVqS8AiZjFqyOGrMXb/w==",
            "license": "BSD-2-Clause",
            "dependencies": {
              "boolbase": "^1.0.0"
            },
            "funding": {
              "url": "https://github.com/fb55/nth-check?sponsor=1"
            }
          }
        }
      },
      "ciExit": 0,
      "cssVersion": "4.3.0",
      "cssPath": "node_modules/css-select",
      "nthVersion": "2.1.1",
      "nthPath": "node_modules/nth-check",
      "selected": [
        2
      ],
      "error": null
    }
  },
  "snippets": [
    {
      "package": "css-select@2.1.0",
      "file": "lib/pseudos.js",
      "lines": [
        14,
        60
      ],
      "code": "var getNCheck = require(\"nth-check\");\n// \u2026\nvar func = getNCheck(rule);",
      "url": "https://unpkg.com/css-select@2.1.0/lib/pseudos.js"
    },
    {
      "package": "nth-check@2.1.1",
      "file": "lib/index.js",
      "lines": [
        35
      ],
      "code": "exports.default = nthCheck;",
      "url": "https://unpkg.com/nth-check@2.1.1/lib/index.js"
    }
  ]
};
  if (typeof module === 'object' && module.exports) module.exports = data;
  else window.SelectorLab = data;
})();
