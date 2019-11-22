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

const Statuspage = require('../src/statuspage/cli');

function buildArgs({
  cmd, auth, pageId, name, desc, group, silent,
} = {}) {
  const args = [];
  if (cmd) args.push(cmd);
  if (auth) args.push('--auth', auth);
  if (pageId) args.push('--page_id', pageId);
  if (name) args.push('--name', `"${name}"`);
  if (desc) args.push('--description', `"${desc}"`);
  if (group) args.push('--group_id', group);
  if (silent) args.push('--silent');
  return args;
}

function getTimedPromise(fn, time, err) {
  const wrap = () => fn;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (wrap()) {
        resolve(true);
      } else {
        reject(new Error(err));
      }
    }, time);
  });
}

async function run(opts = {}) {
  return new Statuspage(buildArgs(opts));
}

async function runShell(opts = {}) {
  return shell.exec(`node ./src/statuspage ${buildArgs(opts).join(' ')}`);
}

describe('Testing statuspage', () => {
  let name;
  let previousName;
  const logger = console;

  // defaults
  const cmd = 'setup';
  const auth = 'test-auth';
  const pageId = 'test-page-id';
  const namePrefix = 'Test Component ';
  const email = 'component+abcdef@notifications.statuspage.io';
  const now = new Date().toISOString();
  const testComp1 = {
    id: '1234',
    page_id: pageId,
    group_id: '0',
    created_at: now,
    updated_at: now,
    group: false,
    description: 'This is a test component',
    position: 0,
    status: 'operational',
    showcase: true,
    only_show_if_degraded: false,
    automation_email: email,
  };

  beforeEach(() => {
    previousName = name;
    name = namePrefix + Date.now(); // ensure unique component names
    testComp1.name = name;
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  it('shows help if no command specified and exits with code != 0', async () => {
    const output = await runShell();
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/^statuspage <cmd>/.test(output.stderr), 'expected help output');
  });

  it('refuses to run without required arguments', async () => {
    const output = await runShell({
      cmd,
      name,
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Not enough non-option arguments/.test(output.stderr), 'expected missing required arguments');
  });

  it('creates component', async () => {
    // const apiURL = `/v1/pages/${pageId}/components`;
    let listRetrieved = false;
    const listRetrievedPromise = getTimedPromise(() => listRetrieved, 1000, 'list not retrieved');
    let compCreated = false;
    const compCreatedPromise = getTimedPromise(() => compCreated, 1000, 'component not created');

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => {
        listRetrieved = true;
        return JSON.stringify([]); // empty list to force creation
      })
      .post(`/v1/pages/${pageId}/components`)
      .reply(201, () => {
        compCreated = true;
        return JSON.stringify(testComp1);
      });
    sinon.spy(logger, 'log');

    // execute statuspage command
    await run({
      cmd,
      auth,
      pageId,
      name,
    });
    assert.ok(await listRetrievedPromise, 'did not retrieve list of components');
    assert.ok(await compCreatedPromise, 'did not create new component');
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
  }).timeout(5000);

  it.skip('uses auth header from environment variable', () => {
  });

  it.skip('detects and updates existing component', () => {
  });

  it.skip('outputs only email in silent mode', () => {
  });
});
