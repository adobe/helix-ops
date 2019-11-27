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
const { getTimedPromise } = require('./utils');

function buildArgs({
  cmd, auth, pageId, name, desc, group, silent,
} = {}) {
  const args = [];
  if (cmd) args.push(cmd);
  if (auth) args.push('--auth', auth);
  if (pageId) args.push('--page_id', pageId);
  if (name) args.push('--name', `"${name}"`);
  if (desc) args.push('--description', `"${desc}"`);
  if (group) args.push('--group', group);
  if (silent) args.push('--silent');
  return args;
}

async function run(opts = {}) {
  return new Statuspage().run(buildArgs(opts));
}

async function runShell(opts = {}) {
  return shell.exec(`node ./src/statuspage ${buildArgs(opts).join(' ')}`);
}

describe('Testing statuspage', () => {
  let name;
  const logger = console;

  // env variable backups
  const originalAuth = process.env.STATUSPAGE_AUTH;
  const originalPageId = process.env.STATUSPAGE_PAGE_ID;

  // defaults
  const cmd = 'setup';
  const auth = 'test-auth';
  const pageId = 'test-page-id';
  const namePrefix = 'Test Component ';
  const group = 'Test Group';
  const email = 'component+abcdef@notifications.statuspage.io';
  const now = new Date().toISOString();
  const testComp = {
    id: '1234',
    page_id: pageId,
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
  const testGroup = {
    id: '0000',
    name: group,
    page_id: pageId,
    created_at: now,
    updated_at: now,
    group: true,
    description: 'This is a test group',
    position: 0,
  };

  before(() => {
    sinon.spy(logger, 'log');
    sinon.spy(logger, 'error');
    // make sure there are no env variables around for this test
    delete process.env.STATUSPAGE_AUTH;
    delete process.env.STATUSPAGE_PAGE_ID;
  });

  beforeEach(() => {
    name = namePrefix + Date.now(); // ensure unique component names
    testComp.name = name;
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  after(() => {
    // unwrap the sinon spies
    logger.log.restore();
    logger.error.restore();
    // add env variables back
    process.env.STATUSPAGE_AUTH = originalAuth;
    process.env.STATUSPAGE_PAGE_ID = originalPageId;
  });

  it('shows help if no command specified and exits with code != 0', async () => {
    const output = await runShell();
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Not enough non-option arguments/.test(output.stderr), 'expected help output');
  });

  it('refuses to run without required arguments', async () => {
    const output = await runShell({
      cmd,
      name,
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Missing required arguments: auth, page_id/.test(output.stderr), 'expected missing required arguments');
  });

  it('creates new component', async () => {
    let listRetrieved = false;
    let compCreated = false;

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => {
        listRetrieved = true;
        return JSON.stringify([]); // empty list to force creation
      })
      .post(`/v1/pages/${pageId}/components`)
      .reply(201, () => {
        compCreated = true;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
    });
    assert.ok(await getTimedPromise(() => listRetrieved, 'Component list not retrieved'));
    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
  }).timeout(5000);

  it('detects and updates existing component', async () => {
    // const apiURL = `/v1/pages/${pageId}/components`;
    let listRetrieved = false;
    let compUpdated = false;
    const desc = 'Update me';

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => {
        listRetrieved = true;
        return JSON.stringify([testComp]); // return component with same name to force update
      })
      .patch(`/v1/pages/${pageId}/components/1234`)
      .reply(200, (uri, body) => {
        compUpdated = body.component.description === desc;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
      desc,
    });
    assert.ok(await getTimedPromise(() => listRetrieved, 'Component list not retrieved'));
    assert.ok(await getTimedPromise(() => compUpdated, 'Component not updated'));
    assert.ok(logger.log.calledWith('Updating component', name), `console.log not called with ${name}`);
  }).timeout(5000);

  it('adds new component to group', async () => {
    let compCreated = false;

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => JSON.stringify([testGroup])) // return group
      .post(`/v1/pages/${pageId}/components`)
      .reply(201, () => {
        compCreated = true;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
      group,
    });

    assert.ok(await getTimedPromise(() => compCreated, 'Component not created in group'));
    assert.ok(logger.log.calledWith(`Creating component ${name} in group ${group}`), `console.log not called with ${name} and ${group}`);
  }).timeout(5000);

  it('adds existing component to group', async () => {
    let compUpdated = false;

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => JSON.stringify([testComp, testGroup])) // return component and group
      .patch(`/v1/pages/${pageId}/components/1234`)
      .reply(200, (uri, body) => {
        compUpdated = body.component.group_id === testGroup.id;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
      group,
    });

    assert.ok(await getTimedPromise(() => compUpdated, 'Component not added to group'));
  }).timeout(5000);

  it('outputs only email in silent mode', async () => {
    let compCreated = false;

    logger.log.restore();
    sinon.spy(logger, 'log');

    nock('https://api.statuspage.io')
      .get(/.*/)
      .reply(200, () => JSON.stringify([]))
      .post(/.*/)
      .reply(201, () => {
        compCreated = true;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
      silent: true,
    });
    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledOnceWith(email), `console.log not called once with ${email}`);
  }).timeout(5000);

  it('uses environment variables', async () => {
    let compCreated = false;

    process.env.STATUSPAGE_AUTH = auth;
    process.env.STATUSPAGE_PAGE_ID = pageId;

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, () => JSON.stringify([]))
      .post(`/v1/pages/${pageId}/components`)
      .reply(201, () => {
        compCreated = true;
        return JSON.stringify(testComp);
      });

    await run({
      cmd,
      name,
    });

    delete process.env.STATUSPAGE_AUTH;
    delete process.env.STATUSPAGE_PAGE_ID;

    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
  }).timeout(5000);

  it('exits with code 1 if create API fails', async () => {
    let errorHandled = false;

    process.exit = (code) => {
      errorHandled = code === 1;
    };

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(500, 'Internal Server Error')
      .post(`/v1/pages/${pageId}/components`)
      .reply(500, 'Internal Server Error');

    await run({
      cmd,
      auth,
      pageId,
      name,
    });

    assert.ok(await getTimedPromise(() => errorHandled, 'Process did not exit with code 1'));
    assert.ok(logger.error.calledWith('Unable to retrieve components:'), 'console.log not called with GET error');
    assert.ok(logger.error.calledWith('Component creation failed:'), 'console.log not called with POST error');
  });

  it('fails gracefully if update API fails', async () => {
    let errorHandled = false;

    nock('https://api.statuspage.io')
      .get(`/v1/pages/${pageId}/components`)
      .reply(200, JSON.stringify([testComp]))
      .patch(`/v1/pages/${pageId}/components/1234`)
      .reply(500, () => {
        errorHandled = true;
        return 'Internal Server Error';
      });

    await run({
      cmd,
      auth,
      pageId,
      name,
    });

    assert.ok(await getTimedPromise(() => errorHandled, 'Process did not exit with code 0'));
    assert.ok(logger.error.calledWith('Component update failed:'), 'console.log not called with error message');
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
  });
});
