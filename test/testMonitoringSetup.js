/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

const assert = require('assert');
const shell = require('shelljs');
const fse = require('fs-extra');
const path = require('path');
const YAML = require('yaml');

const MONITORING = path.resolve(__dirname, 'monitoring');

function extractDefaults(params) {
  const defaultParams = {};
  for (const name of Object.keys(params)) {
    if (params[name].default) {
      defaultParams[name] = params[name].default;
    }
  }
  defaultParams.tool_path = '.';
  return defaultParams;
}

function applyDefaults(parameters, defaults) {
  const params = { ...parameters };
  for (const name of Object.keys(defaults)) {
    if (!params[name]) {
      params[name] = defaults[name];
    }
  }
  return params;
}

function setEnv(env) {
  if (typeof env !== 'object') return;
  for (const name of Object.keys(env)) {
    process.env[name] = env[name];
  }
}

function unsetEnv(env) {
  if (typeof env !== 'object') return;
  for (const name of Object.keys(env)) {
    delete process.env[name];
  }
}

describe('Testing monitoring setup', () => {
  let setup;
  let defaults;

  before(() => {
    const orbConfigSource = fse.readFileSync(
      path.resolve(__dirname, '../.circleci/orbs/helix-post-deploy/orb.yml'),
      'utf8',
    );
    const orbConfig = YAML.parseDocument(orbConfigSource).toJSON();
    setup = orbConfig.commands.monitoring.steps.find(
      (step) => step.run.name === 'Monitoring Setup',
    );
    defaults = extractDefaults(orbConfig.commands.monitoring.parameters);
    shell.cd(MONITORING);
  });

  after(() => {
    shell.cd('-');
  });

  const specs = path.resolve(MONITORING, 'specs');
  fse.readdirSync(specs).forEach((filename) => {
    const name = filename.substring(0, filename.length - 5);
    const { env, parameters, output } = fse.readJSONSync(path.resolve(specs, filename), 'utf8');
    it(`Testing ${name}`, async () => {
      setEnv(env);
      const params = applyDefaults(parameters, defaults);
      const command = Object.keys(params).reduce(
        (cmd, k) => cmd.replace(new RegExp(`<< parameters.${k} >>`), params[k]),
        setup.run.command,
      )
        .replace(/<< parameters.tool_path >>/, MONITORING)
        .replace(/<< .+ >>/g, '');
      const { code, stdout, stderr } = shell.exec(command, {
        silent: true,
        shell: '/bin/bash',
      });
      unsetEnv(env);
      if (code !== 0) {
        assert.fail(`shell exited with non-zero code: ${code}:\n${stderr}`);
      }
      assert.deepStrictEqual(JSON.parse(stdout), output);
    }).timeout(5000);
  });
});
