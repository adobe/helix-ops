/*
 * Copyright 2020 Adobe. All rights reserved.
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

describe('Testing monitoring setup', () => {
  let setup;
  before(() => {
    const orbConfigSource = fse.readFileSync(
      path.resolve(__dirname, '../.circleci/orbs/helix-post-deploy/orb.yml'),
      'utf8',
    );
    const orbConfig = YAML.parseDocument(orbConfigSource).toJSON();
    setup = orbConfig.commands.monitoring.steps.find(
      (step) => step.run.name === 'Monitoring Setup',
    );
  });
  const specs = path.resolve(MONITORING, 'specs');
  fse.readdirSync(specs).forEach((filename) => {
    const name = filename.substring(0, filename.length - 5);
    const { parameters, output } = fse.readJSONSync(path.resolve(specs, filename), 'utf8');
    it(`Testing ${name}`, async () => {
      const command = Object.keys(parameters).reduce(
        (cmd, k) => cmd.replace(new RegExp(`<< parameters.${k} >>`), parameters[k]),
        setup.run.command,
      )
        .replace(/<< parameters.tool_path >>/, MONITORING)
        .replace(/<< .+ >>/g, '');
      const { code, stdout, stderr } = shell.exec(command, { silent: true });
      if (code !== 0) {
        assert.fail(`shell exited with non-zero code: ${code}:\n${stderr}`);
      }
      assert.deepStrictEqual(JSON.parse(stdout), output);
    });
  });
});
