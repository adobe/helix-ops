/*
 * Copyright 2019 Adobe. All rights reserved.
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
const nock = require('nock');
const shell = require('shelljs');
const sinon = require('sinon');

function buildArgs({
  auth, pageId: namespace, orbDir, orbSrc, changelog,
} = {}) {
  const args = [];
  if (auth) args.push('--auth', auth);
  if (namespace) args.push('--namespace', namespace);
  if (orbDir) args.push('--name', `"${orbDir}"`);
  if (orbSrc) args.push('--orb-src', `"${orbSrc}"`);
  if (changelog) args.push('--changelog', `"${changelog}"`);
  return args;
}

async function runShell(opts = {}) {
  return shell.exec(`node ./src/orb-release ${buildArgs(opts).join(' ')}`);
}

describe('Testing orb-release', function testOrbRelease() {
  this.timeout(10000);
  const logger = console;

  // defaults
  const auth = 'fake-token';
  const changelog = './test/fixtures/orb-release/changelog.md';
  const changelogEmpty = './test/fixtures/orb-release/changelog-empty.md';
  const orbSrc = '../../../test/fixtures/orb-release/src.yml';

  // env variable backups
  const originalAuth = process.env.CIRCLECI_CLI_TOKEN;

  before(() => {
    sinon.spy(logger, 'log');
    sinon.spy(logger, 'error');
    // make sure there are no env variables around for this test
    delete process.env.CIRCLECI_CLI_TOKEN;
  });

  beforeEach(() => {
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  after(() => {
    // unwrap the sinon spies
    logger.log.restore();
    logger.error.restore();
    // add env variables back
    process.env.CIRCLECI_CLI_TOKEN = originalAuth;
  });

  it('refuses to run without required arguments', async () => {
    const output = await runShell({});
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Missing required argument: token/.test(output.stderr), 'expected missing required arguments');
  });

  it('skips release if no release date', async () => {
    const output = await runShell({
      auth,
      changelog: changelogEmpty,
    });
    assert.equal(output.code, 0, `expected exit code 0, but got ${output.code}`);
    assert.ok(/Unable to determine last release date/.test(output.stderr), 'expected to skip release if no release date');
  });

  it('attempts orb release', async () => {
    const output = await runShell({
      auth,
      changelog,
      orbSrc,
    });
    assert.equal(output.code, 0, `expected exit code 0, but got ${output.code}`);
  });

  it('uses environment variables', async () => {
    process.env.CIRCLECI_CLI_TOKEN = auth;
    const output = await runShell({
      changelog,
    });
    assert.equal(output.code, 0, `expected exit code 0, but got ${output.code}`);
    delete process.env.CIRCLECI_CLI_TOKEN;
  });
});
