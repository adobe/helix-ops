## [4.0.2](https://github.com/adobe/helix-ops/compare/v4.0.1...v4.0.2) (2021-05-30)


### Bug Fixes

* **monitoring:** env vars not replaced in monitoringSetup.js ([2e9dc2e](https://github.com/adobe/helix-ops/commit/2e9dc2e51cf92c55e29b86c13dd4fe4dbaf3b85d))

## [4.0.1](https://github.com/adobe/helix-ops/compare/v4.0.0...v4.0.1) (2021-05-30)


### Bug Fixes

* **monitoring:** force patch release ([5a18336](https://github.com/adobe/helix-ops/commit/5a18336e53e05868bb7c289983d314288b354ffd))

# [4.0.0](https://github.com/adobe/helix-ops/compare/v3.0.0...v4.0.0) (2021-05-30)


### Bug Fixes

* **monitoring:** missing default values make parameters mandatory ([150031c](https://github.com/adobe/helix-ops/commit/150031c52d11483e91ef8a834ae36ef7552cee1a))
* **monitoring:** missing default values make parameters mandatory ([ff64808](https://github.com/adobe/helix-ops/commit/ff6480820d9a4fa6108bcdb7af3185f6e082701a))
* **monitoring:** set newrelic_frequency default back to 0 ([5019072](https://github.com/adobe/helix-ops/commit/5019072a8d27698b9334694a98e16bb4b23779cc))
* **monitoring:** set newrelic_frequency default back to 15 ([2193234](https://github.com/adobe/helix-ops/commit/2193234ea236ef3dea81d923137060394ec668d9))


### BREAKING CHANGES

* **monitoring:** new API (see https://github.com/adobe/helix-ops/issues/203)

# [3.0.0](https://github.com/adobe/helix-ops/compare/v2.2.3...v3.0.0) (2021-05-30)


### Bug Fixes

* **monitoring:** keep action_namespace param backward compatible ([9582c2d](https://github.com/adobe/helix-ops/commit/9582c2d3c7cffeb6477c35624a4069e154e12431))
* **monitoring:** multivalue locations not working ([70862cb](https://github.com/adobe/helix-ops/commit/70862cb459c73b27990a79ac3a58f8ba6d0e71de))
* **test:** add separate file for monitoringSetup ([80edc00](https://github.com/adobe/helix-ops/commit/80edc00cf42a2b56b7b8b3bb6ab012cdf22173e1))


### Documentation

* **monitoring:** multivalue locations not working ([4c1bb77](https://github.com/adobe/helix-ops/commit/4c1bb777820f2f60a2f42ad18732d5e684fce301))


### Features

* **monitoring:** ability to specify clouds ([a5a4862](https://github.com/adobe/helix-ops/commit/a5a4862e8bcdcae2651387cf35de8d62a9758a3d))
* **monitoring:** add google cloud support ([b5719aa](https://github.com/adobe/helix-ops/commit/b5719aab1159d6a827ba65a57759f35f0b523403))
* **monitoring:** keep universal runtime optional ([736b74f](https://github.com/adobe/helix-ops/commit/736b74f7dabf9701ec460183461b60bd3c52f708))
* **monitoring:** make universal host configurable ([381259d](https://github.com/adobe/helix-ops/commit/381259df767069b5a1992a700fd2f5e8e3dde7cf))
* **monitoring:** switch default to universal ([b11efe5](https://github.com/adobe/helix-ops/commit/b11efe5dd01a1301e2c4aa2df31d8d2c4daf9ab5))
* **monitoring:** switch default to universal ([1eefd1b](https://github.com/adobe/helix-ops/commit/1eefd1b03b14f7e2fc940317b73c9a99887143a7))


### BREAKING CHANGES

* **monitoring:** runtime monitoring now optional
* **monitoring:** locations parameter value now space- instead of comma-separated

## [2.2.3](https://github.com/adobe/helix-ops/compare/v2.2.2...v2.2.3) (2021-05-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.2.1 ([5aa8bb0](https://github.com/adobe/helix-ops/commit/5aa8bb0e3418684b4b2b9c39060e6a5de1a7bbc1))

## [2.2.2](https://github.com/adobe/helix-ops/compare/v2.2.1...v2.2.2) (2021-05-04)


### Bug Fixes

* **deps:** update external major ([#206](https://github.com/adobe/helix-ops/issues/206)) ([36af2fe](https://github.com/adobe/helix-ops/commit/36af2fe1d3f236a01cc08f65f2b00e13502f9a1c))

## [2.2.1](https://github.com/adobe/helix-ops/compare/v2.2.0...v2.2.1) (2021-04-19)


### Bug Fixes

* **deps:** update dependency get-stream to v6.0.1 ([#200](https://github.com/adobe/helix-ops/issues/200)) ([74fd7d1](https://github.com/adobe/helix-ops/commit/74fd7d12538925210e0a553d9170aa80881b8107))

# [2.2.0](https://github.com/adobe/helix-ops/compare/v2.1.3...v2.2.0) (2021-04-08)


### Features

* **fastly:** create orb for fastly CLI setup ([c714456](https://github.com/adobe/helix-ops/commit/c714456e46d1a570daf6a6e96a6ea276f8608b93))

## [2.1.3](https://github.com/adobe/helix-ops/compare/v2.1.2...v2.1.3) (2021-03-26)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.2.0 ([#192](https://github.com/adobe/helix-ops/issues/192)) ([b1e45ea](https://github.com/adobe/helix-ops/commit/b1e45ea7e5c6c305e0f7857100b76eee17414b10))

## [2.1.2](https://github.com/adobe/helix-ops/compare/v2.1.1...v2.1.2) (2021-03-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.9 ([87f5690](https://github.com/adobe/helix-ops/commit/87f5690422ad44b08f57fabeefcc50a2a5af2002))

## [2.1.1](https://github.com/adobe/helix-ops/compare/v2.1.0...v2.1.1) (2021-03-22)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.8 ([3c1dc77](https://github.com/adobe/helix-ops/commit/3c1dc771a764730f1a5c8b7fcc64fa3d6dd6fbd4))

# [2.1.0](https://github.com/adobe/helix-ops/compare/v2.0.14...v2.1.0) (2021-03-15)


### Features

* **google:** add orb for setting up google cloud platform credentials ([787df46](https://github.com/adobe/helix-ops/commit/787df466baa82939969575f10f51c7dccdeaa982))

## [2.0.14](https://github.com/adobe/helix-ops/compare/v2.0.13...v2.0.14) (2021-03-04)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.7 ([09a8418](https://github.com/adobe/helix-ops/commit/09a8418444e42e0b30c9603d5404eba4eea5d0b9))

## [2.0.13](https://github.com/adobe/helix-ops/compare/v2.0.12...v2.0.13) (2021-02-25)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.6 ([29bd34b](https://github.com/adobe/helix-ops/commit/29bd34ba9b03c104ad1ee4b5090f171f0686abee))

## [2.0.12](https://github.com/adobe/helix-ops/compare/v2.0.11...v2.0.12) (2021-02-16)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.5 ([93e021e](https://github.com/adobe/helix-ops/commit/93e021e7f81ea4cfa037342c8abaad5a943057bb))

## [2.0.11](https://github.com/adobe/helix-ops/compare/v2.0.10...v2.0.11) (2021-02-12)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v2.1.4 ([225cc48](https://github.com/adobe/helix-ops/commit/225cc48284392e6a2f74c21218a34a4e0de17d71))

## [2.0.10](https://github.com/adobe/helix-ops/compare/v2.0.9...v2.0.10) (2021-02-03)


### Bug Fixes

* **monitoring:** monitor names with dashes ([#167](https://github.com/adobe/helix-ops/issues/167)) ([b55a159](https://github.com/adobe/helix-ops/commit/b55a159729286e43afde6549ea383426c29f90ac))

## [2.0.9](https://github.com/adobe/helix-ops/compare/v2.0.8...v2.0.9) (2021-02-02)


### Bug Fixes

* **monitoring:** typo in var name ([1769991](https://github.com/adobe/helix-ops/commit/176999167deb9aa0858d5458ae0f6a2d1c61cfbf))

## [2.0.8](https://github.com/adobe/helix-ops/compare/v2.0.7...v2.0.8) (2021-02-02)


### Bug Fixes

* **monitoring:** aws monitoring always pointing to word2md/v2 ([#166](https://github.com/adobe/helix-ops/issues/166)) ([1122c98](https://github.com/adobe/helix-ops/commit/1122c985867b2634eca867b29a8f046df3012818))

## [2.0.7](https://github.com/adobe/helix-ops/compare/v2.0.6...v2.0.7) (2021-01-27)


### Bug Fixes

* **monitoring:** wrong aws nrName ([#155](https://github.com/adobe/helix-ops/issues/155)) ([ebe1215](https://github.com/adobe/helix-ops/commit/ebe1215399671af3abaa44cb451982e1a5dec892))

## [2.0.6](https://github.com/adobe/helix-ops/compare/v2.0.5...v2.0.6) (2021-01-27)


### Bug Fixes

* **monitoring:** use actionName if aws and no nrName ([#155](https://github.com/adobe/helix-ops/issues/155)) ([bc438d0](https://github.com/adobe/helix-ops/commit/bc438d0cd8eb467c024a6d58dbf0baa491f0fbe0))

## [2.0.5](https://github.com/adobe/helix-ops/compare/v2.0.4...v2.0.5) (2021-01-27)


### Bug Fixes

* **monitoring:** broken if custom newrelic_url is used ([0f43d64](https://github.com/adobe/helix-ops/commit/0f43d6478926b51a29606e4be837f3c8d8ed19e3))

## [2.0.4](https://github.com/adobe/helix-ops/compare/v2.0.3...v2.0.4) (2021-01-27)


### Bug Fixes

* **monitoring:** script error ([ca86e84](https://github.com/adobe/helix-ops/commit/ca86e8433cec36eb7fe77709fc508c66b7a7cb50))

## [2.0.3](https://github.com/adobe/helix-ops/compare/v2.0.2...v2.0.3) (2021-01-27)


### Bug Fixes

* **monitoring:** script error ([#155](https://github.com/adobe/helix-ops/issues/155)) ([2ead0cc](https://github.com/adobe/helix-ops/commit/2ead0ccb2aa41b277ff87f0363b8a3f7cc44fc3e))

## [2.0.2](https://github.com/adobe/helix-ops/compare/v2.0.1...v2.0.2) (2021-01-27)


### Bug Fixes

* **monitoring:** script error ([#155](https://github.com/adobe/helix-ops/issues/155)) ([2e2b7b0](https://github.com/adobe/helix-ops/commit/2e2b7b0ae1c31259053d75655d5279714c37cdc4))

## [2.0.1](https://github.com/adobe/helix-ops/compare/v2.0.0...v2.0.1) (2021-01-27)


### Bug Fixes

* use body option for json payload ([a04a127](https://github.com/adobe/helix-ops/commit/a04a12745f3e24b7663655605c5c5c639277ea20))
* **newrelic:** use new fetch context ([70f78b4](https://github.com/adobe/helix-ops/commit/70f78b41d6eea8aeb61a1e6c37baee56e9e27b21))
* **statuspage:** use new fetchcontext ([3d5cb91](https://github.com/adobe/helix-ops/commit/3d5cb913a32b7a615429e50f651b597508e8eb47))

# [2.0.0](https://github.com/adobe/helix-ops/compare/v1.12.3...v2.0.0) (2021-01-26)


### Features

* **monitoring:** aws support ([#152](https://github.com/adobe/helix-ops/issues/152)) ([c49457c](https://github.com/adobe/helix-ops/commit/c49457c8d87b166587bda678a9b2f1e7181bc01f))


### BREAKING CHANGES

* **monitoring:** API change in newrelic CLI, see https://github.com/adobe/helix-ops/blob/main/README.md

## [1.12.3](https://github.com/adobe/helix-ops/compare/v1.12.2...v1.12.3) (2020-12-09)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v1.9.2 ([c54cea4](https://github.com/adobe/helix-ops/commit/c54cea48ccfc0d13e1fe014807dbe9909b78c876))

## [1.12.2](https://github.com/adobe/helix-ops/compare/v1.12.1...v1.12.2) (2020-11-10)


### Bug Fixes

* **deps:** update dependency diff to v5 ([#135](https://github.com/adobe/helix-ops/issues/135)) ([0d2cf06](https://github.com/adobe/helix-ops/commit/0d2cf06b3a86f77eb4d60d7938d3f41eca921815))

## [1.12.1](https://github.com/adobe/helix-ops/compare/v1.12.0...v1.12.1) (2020-09-15)


### Bug Fixes

* **deps:** update dependency yargs to v16 ([#125](https://github.com/adobe/helix-ops/issues/125)) ([0dd99ab](https://github.com/adobe/helix-ops/commit/0dd99abc718955014a4c57fa8af96d5674c5def8))

# [1.12.0](https://github.com/adobe/helix-ops/compare/v1.11.7...v1.12.0) (2020-08-17)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v1.9.0 ([031dcaf](https://github.com/adobe/helix-ops/commit/031dcaf13634722685d7fc6b88f3b5e450d5e724))
* **deps:** update dependency @adobe/helix-fetch to v1.9.1 ([c71b0eb](https://github.com/adobe/helix-ops/commit/c71b0eb08f3e928c771cf1f986830bd8e2c9c8f9))


### Features

* rename default branch from "master" to "main" ([ccdbe06](https://github.com/adobe/helix-ops/commit/ccdbe06a4bead5ae2ed12641dd56a706871d89f3))
* **orb:** install CLI if not already installed ([6b63007](https://github.com/adobe/helix-ops/commit/6b63007d4c547c13866202172c8ee1da14a35ac8))

## [1.11.7](https://github.com/adobe/helix-ops/compare/v1.11.6...v1.11.7) (2020-07-22)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v1.8.1 ([30d0912](https://github.com/adobe/helix-ops/commit/30d0912907900701b132408b446319fec8dde1e7))

## [1.11.6](https://github.com/adobe/helix-ops/compare/v1.11.5...v1.11.6) (2020-07-20)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v1.8.0 ([781796e](https://github.com/adobe/helix-ops/commit/781796e0146d807b756c0b07225dccf6a4d06609))

## [1.11.5](https://github.com/adobe/helix-ops/compare/v1.11.4...v1.11.5) (2020-07-13)


### Bug Fixes

* **deps:** update dependency @adobe/helix-fetch to v1.7.1 ([39285de](https://github.com/adobe/helix-ops/commit/39285de0b51c8e7d327c7dbcfb615b420ad8a316))

## [1.11.4](https://github.com/adobe/helix-ops/compare/v1.11.3...v1.11.4) (2020-07-02)


### Bug Fixes

* **deps:** update dependency yargs to v15.4.0 ([17416fb](https://github.com/adobe/helix-ops/commit/17416fb0f5e8f4462ecdd21ff3e1c98079915af6))

## [1.11.3](https://github.com/adobe/helix-ops/compare/v1.11.2...v1.11.3) (2020-07-02)


### Bug Fixes

* **deps:** pin dependency @adobe/helix-fetch to 1.7.0 ([3b3b013](https://github.com/adobe/helix-ops/commit/3b3b013274af9626d0ca9b2af552d8cef45562d8))

## [1.11.2](https://github.com/adobe/helix-ops/compare/v1.11.1...v1.11.2) (2020-05-12)


### Bug Fixes

* **montoring:** ensure activation record is always persisted ([67a432a](https://github.com/adobe/helix-ops/commit/67a432a1b76240b613e5b314fc31ff7fd69dfecf))

## [1.11.1](https://github.com/adobe/helix-ops/compare/v1.11.0...v1.11.1) (2020-04-29)


### Bug Fixes

* **orb:** newrelic_frequency type is not string ([#74](https://github.com/adobe/helix-ops/issues/74)) ([a26f3cb](https://github.com/adobe/helix-ops/commit/a26f3cb6aa0d604991134577b9fccd9f08972b21))

# [1.11.0](https://github.com/adobe/helix-ops/compare/v1.10.0...v1.11.0) (2020-04-29)


### Features

* **monitoring:** optional monitor locations and frequency ([#72](https://github.com/adobe/helix-ops/issues/72)) ([e15baa1](https://github.com/adobe/helix-ops/commit/e15baa190397b0744df9a941c50dd6bf8026ca4b))

# [1.10.0](https://github.com/adobe/helix-ops/compare/v1.9.1...v1.10.0) (2020-04-22)


### Features

* **monitoring:** use major action version ([#67](https://github.com/adobe/helix-ops/issues/67)) ([81cd706](https://github.com/adobe/helix-ops/commit/81cd706bb19028ed3c29d69de4f9a98a3bae5354))

## [1.9.1](https://github.com/adobe/helix-ops/compare/v1.9.0...v1.9.1) (2020-04-10)


### Bug Fixes

* **monitoring:** omit monitor type during update ([#60](https://github.com/adobe/helix-ops/issues/60)) ([b45f4c9](https://github.com/adobe/helix-ops/commit/b45f4c9733b362dde7c4c42daa616f5de6269399))

# [1.9.0](https://github.com/adobe/helix-ops/compare/v1.8.0...v1.9.0) (2020-04-02)


### Bug Fixes

* **ci:** orb release can fail [skip ci] ([#56](https://github.com/adobe/helix-ops/issues/56)) ([89c6417](https://github.com/adobe/helix-ops/commit/89c6417c135accf33dfe657e483edf7474b87490))


### Features

* **monitoring:** make email optional ([#57](https://github.com/adobe/helix-ops/issues/57)) ([35e188c](https://github.com/adobe/helix-ops/commit/35e188c3e92d8efa480961fee399b50d9f6a89c9))

# [1.8.0](https://github.com/adobe/helix-ops/compare/v1.7.2...v1.8.0) (2020-04-01)


### Features

* **monitoring:** ability to create scripted browser monitors ([#54](https://github.com/adobe/helix-ops/issues/54)) ([ad56ee1](https://github.com/adobe/helix-ops/commit/ad56ee17a731fd9b46741adab1df5fe5fdec3feb))

## [1.7.2](https://github.com/adobe/helix-ops/compare/v1.7.1...v1.7.2) (2020-03-26)


### Bug Fixes

* **deps:** update dependency fs-extra to v9 ([70dd814](https://github.com/adobe/helix-ops/commit/70dd814f893d2e771fbb89abc7a55caa7fbd69b6))

## [1.7.1](https://github.com/adobe/helix-ops/compare/v1.7.0...v1.7.1) (2020-03-25)


### Bug Fixes

* **monitoring:** relax if activation result cannot be retrieved ([22aaed5](https://github.com/adobe/helix-ops/commit/22aaed534ffdefb37d47d6df3866eec0385bd139))

# [1.7.0](https://github.com/adobe/helix-ops/compare/v1.6.0...v1.7.0) (2020-03-25)


### Bug Fixes

* **monitor_script:** guard against runtime errors ([059260d](https://github.com/adobe/helix-ops/commit/059260dac3a4cbcd5bbc799584558b4f5b82e1bf)), closes [#48](https://github.com/adobe/helix-ops/issues/48)


### Features

* **monitoring:** throw if activation statusCode is not 200 ([5ccfcec](https://github.com/adobe/helix-ops/commit/5ccfcec2aa850e0a0a17960c1a1007ea4f0be1db))

# [1.6.0](https://github.com/adobe/helix-ops/compare/v1.5.0...v1.6.0) (2020-03-20)


### Features

* **monitoring:** add incubator support to helix-post-deploy orb ([eef3989](https://github.com/adobe/helix-ops/commit/eef3989e13a8b25240c122bca59cc73714f1a425))

# [1.5.0](https://github.com/adobe/helix-ops/compare/v1.4.0...v1.5.0) (2020-03-11)


### Bug Fixes

* **monitoring:** missing semicolon ([dedb945](https://github.com/adobe/helix-ops/commit/dedb94510da5b156ae74759e02cdda1a854bae5b))
* **monitoring:** test fro empty policy array ([a4dfae7](https://github.com/adobe/helix-ops/commit/a4dfae7a41b608a951b31b7e9ea0c01f30fda23d))
* **monitoring:** wrong return type ([6015f36](https://github.com/adobe/helix-ops/commit/6015f361dfc9bf7f12b300e73713f1e7fd461232))
* **monitoring:** wrong url for channel deletion ([b52c369](https://github.com/adobe/helix-ops/commit/b52c369733eb89b91a24de031cf7174e3bac20a2))


### Features

* **monitoring:** newrelic incubator ([a1d6055](https://github.com/adobe/helix-ops/commit/a1d6055b7185bb3adefe6633967c974c82c9d9ec))
* **monitoring:** statuspage incubator ([68b47cc](https://github.com/adobe/helix-ops/commit/68b47cc662b62b44c12a1a6002b0aaaf4f7e889d))

# [1.4.0](https://github.com/adobe/helix-ops/compare/v1.3.0...v1.4.0) (2020-01-31)


### Features

* **monitoring:** ability to use custom script ([a3328df](https://github.com/adobe/helix-ops/commit/a3328df3ae188deaaecc068f2e73bb7814d6dcc9))

# [1.3.0](https://github.com/adobe/helix-ops/compare/v1.2.1...v1.3.0) (2020-01-20)


### Bug Fixes

* **monitoring:** omit error ([85d8767](https://github.com/adobe/helix-ops/commit/85d876764aff58e1fd0ca16ff580dbd0ab6751dd))


### Features

* **monitoring:** don't log request from activation details ([53cd614](https://github.com/adobe/helix-ops/commit/53cd614e924cf64de897cce1df1697bc4ce9750a))

## [1.2.1](https://github.com/adobe/helix-ops/compare/v1.2.0...v1.2.1) (2020-01-20)


### Bug Fixes

* **deps:** update external ([#19](https://github.com/adobe/helix-ops/issues/19)) ([9ac4cec](https://github.com/adobe/helix-ops/commit/9ac4ceca5491a94f765a2571bbb1a6a9ac900fda))

# [1.2.0](https://github.com/adobe/helix-ops/compare/v1.1.1...v1.2.0) (2019-12-10)


### Bug Fixes

* **orb:** change check for orb dir ([f8f3ed0](https://github.com/adobe/helix-ops/commit/f8f3ed085e2d0524f0182eaaadc6220917f105f9))
* **orb:** check for isDirectory method ([8ae1772](https://github.com/adobe/helix-ops/commit/8ae1772e438c9df026d48302ac554f7c12cde723))


### Features

* **orb:** automatic release ([664f6b7](https://github.com/adobe/helix-ops/commit/664f6b7985e918b5befb33a16bb3b04f8180ab45))

## [1.1.1](https://github.com/adobe/helix-ops/compare/v1.1.0...v1.1.1) (2019-11-28)


### Bug Fixes

* **monitoring:** monitoring setup fails ([#10](https://github.com/adobe/helix-ops/issues/10)) ([8379160](https://github.com/adobe/helix-ops/commit/8379160501acc14d1003c755c9b006c92f7b5291))

# [1.1.0](https://github.com/adobe/helix-ops/compare/v1.0.2...v1.1.0) (2019-11-27)


### Features

* **monitoring:** improve resilience and legibility of command script ([#8](https://github.com/adobe/helix-ops/issues/8)) ([5606f35](https://github.com/adobe/helix-ops/commit/5606f3500882b9f21b0122de00af4ea222b0f6ae))

## [1.0.2](https://github.com/adobe/helix-ops/compare/v1.0.1...v1.0.2) (2019-11-25)


### Bug Fixes

* **deps:** pin dependencies ([#6](https://github.com/adobe/helix-ops/issues/6)) ([b2bb4a0](https://github.com/adobe/helix-ops/commit/b2bb4a0aa66dc19b064dc4872ef1c4e96666ef17))

## [1.0.1](https://github.com/adobe/helix-ops/compare/v1.0.0...v1.0.1) (2019-11-19)


### Bug Fixes

* **package:** clean up package ([207db0d](https://github.com/adobe/helix-ops/commit/207db0d6373dc5bfabf85f0ac6b6af10f9d7b5c8))

# 1.0.0 (2019-11-18)


### Features

* **release:** manual publication to NPM ([57a2e08](https://github.com/adobe/helix-ops/commit/57a2e08))
