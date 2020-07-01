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
const shell = require('shelljs');
const sinon = require('sinon');

const Statuspage = require('../src/statuspage/cli');
const StatuspageAPI = require('./statuspage/StatuspageAPI');
const { getTimedPromise } = require('./utils');

process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

function buildArgs({
  cmd, auth, pageId, name, desc, group, incubator, incubatorPageId, silent,
} = {}) {
  const args = [];
  if (cmd) args.push(cmd);
  if (auth) args.push('--auth', auth);
  if (pageId) args.push('--page_id', pageId);
  if (name) args.push('--name', `"${name}"`);
  if (desc) args.push('--description', `"${desc}"`);
  if (group) args.push('--group', group);
  if (incubator) args.push('--incubator', incubator);
  if (incubatorPageId) args.push('--incubator_page_id', incubatorPageId);
  if (silent) args.push('--silent');
  return args;
}

async function run(opts = {}) {
  return new Statuspage().run(buildArgs(opts));
}

async function runShell(opts = {}) {
  return shell.exec(`node ./src/statuspage ${buildArgs(opts).join(' ')}`);
}

describe('Testing statuspage', function testStatuspage() {
  this.timeout(5000);
  let name;
  const logger = console;

  // env variable backups
  const originalAuth = process.env.STATUSPAGE_AUTH;
  const originalPageId = process.env.STATUSPAGE_PAGE_ID;

  // defaults
  const cmd = 'setup';
  const auth = 'test-auth';
  const pageId = 'test-page-id';
  const incubatorPageId = 'test-incubator-page-id';
  const namePrefix = 'Test Component ';
  const group = 'Test Group';
  const email = 'component+abcdef@notifications.statuspage.io';
  const now = new Date().toISOString();
  const component = {
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
  const componentGroup = {
    id: '0000',
    name: group,
    page_id: pageId,
    created_at: now,
    updated_at: now,
    group: true,
    description: 'This is a test group',
    position: 0,
  };

  function apiConfig(overrides) {
    return {
      component,
      componentGroup,
      ...overrides,
    };
  }

  function cliConfig(overrides) {
    return {
      cmd,
      auth,
      pageId,
      name,
      ...overrides,
    };
  }

  before(() => {
    sinon.spy(logger, 'log');
    sinon.spy(logger, 'error');
    // make sure there are no env variables around for this test
    delete process.env.STATUSPAGE_AUTH;
    delete process.env.STATUSPAGE_PAGE_ID;
  });

  beforeEach(() => {
    name = namePrefix + Date.now(); // ensure unique component names
    component.name = name;
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
    const api = new StatuspageAPI(apiConfig())
      .on(StatuspageAPI.GET_COMPONENTS, (uri) => {
        listRetrieved = uri.includes(pageId);
      })
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = req.component && req.component.name === name;
      })
      .start();

    await run(cliConfig());
    assert.ok(await getTimedPromise(() => listRetrieved, 'Component list not retrieved'));
    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
    api.stop();
  });

  it('detects and updates existing component', async () => {
    // const apiURL = `/v1/pages/${pageId}/components`;
    let listRetrieved = false;
    let compUpdated = false;
    const desc = 'Update me';
    const api = new StatuspageAPI(apiConfig({ new: false }))
      .on(StatuspageAPI.GET_COMPONENTS, (uri) => {
        listRetrieved = uri.includes(pageId);
      })
      .on(StatuspageAPI.UPDATE_COMPONENT, (uri, req) => {
        compUpdated = req.component && req.component.description === desc;
      })
      .start();

    await run(cliConfig({ desc }));
    assert.ok(await getTimedPromise(() => listRetrieved, 'Component list not retrieved'));
    assert.ok(await getTimedPromise(() => compUpdated, 'Component not updated'));
    assert.ok(logger.log.calledWith('Updating component', name), `console.log not called with ${name}`);
    api.stop();
  });

  it('adds new component to group', async () => {
    let compCreated = false;
    const api = new StatuspageAPI(apiConfig())
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = req.component && req.component.group_id === componentGroup.id;
      })
      .start();

    await run(cliConfig({ group }));
    assert.ok(await getTimedPromise(() => compCreated, 'Component not created in group'));
    assert.ok(logger.log.calledWith(`Creating component ${name} in group ${group}`), `console.log not called with ${name} and ${group}`);
    api.stop();
  });

  it('adds existing component to group', async () => {
    let compUpdated = false;
    const api = new StatuspageAPI(apiConfig({ new: false }))
      .on(StatuspageAPI.UPDATE_COMPONENT, (uri, req) => {
        compUpdated = req.component && req.component.group_id === componentGroup.id;
      })
      .start();

    await run(cliConfig({ group }));
    assert.ok(await getTimedPromise(() => compUpdated, 'Component not added to group'));
    api.stop();
  });

  it('outputs only email in silent mode', async () => {
    let compCreated = false;

    logger.log.restore();
    sinon.spy(logger, 'log');

    const api = new StatuspageAPI(apiConfig())
      .on(StatuspageAPI.CREATE_COMPONENT, () => {
        compCreated = true;
      })
      .start();

    await run(cliConfig({ silent: true }));
    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledOnceWith(email), `console.log not called once with ${email}`);
    api.stop();
  });

  it('creates incubator component', async () => {
    let compCreated = false;
    const api = new StatuspageAPI(apiConfig({ incubator: true }))
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = req.component
          && req.component.name
          && req.component.name.endsWith('[INCUBATOR]');
      })
      .start();

    await run(cliConfig({
      incubator: true,
    }));
    assert.ok(await getTimedPromise(() => compCreated, 'Incubator component not created'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
    api.stop();
  });

  it('creates incubator component on dedicated page', async () => {
    let compCreated = false;
    const api = new StatuspageAPI(apiConfig({ incubator: true }))
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = uri.includes(incubatorPageId)
          && req.component
          && req.component.name
          && req.component.name.endsWith('[INCUBATOR]');
      })
      .start();

    await run(cliConfig({
      incubator: true,
      incubatorPageId,
    }));
    assert.ok(await getTimedPromise(() => compCreated, 'Incubator component not created on dedicated page'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
    api.stop();
  });

  it('creates production component and removes incubator component from same page', async () => {
    let compCreated = false;
    let compRemoved = false;
    const incubatorComponent = { ...component, name: component.name += ' [INCUBATOR]' };
    const api = new StatuspageAPI(apiConfig({
      incubatorComponent,
    }))
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = req.component
          && req.component.name
          && req.component.name === name;
      })
      .on(StatuspageAPI.DELETE_COMPONENT, (uri) => {
        compRemoved = uri.includes(incubatorComponent.id);
      })
      .start();

    await run(cliConfig());
    assert.ok(await getTimedPromise(() => compCreated, 'Production component not created'));
    assert.ok(await getTimedPromise(() => compRemoved, 'Incubator component not removed from same page'));
    api.stop();
  });

  it('creates production component and removes incubator component from dedicated page', async () => {
    let compCreated = false;
    let compRemoved = false;
    const incubatorComponent = { ...component, name: component.name += ' [INCUBATOR]' };
    const api = new StatuspageAPI(apiConfig({
      incubatorComponent,
    }))
      .on(StatuspageAPI.CREATE_COMPONENT, (uri, req) => {
        compCreated = uri.includes(pageId)
          && req.component
          && req.component.name
          && req.component.name === name;
      })
      .on(StatuspageAPI.DELETE_COMPONENT, (uri) => {
        compRemoved = uri.includes(incubatorPageId)
          && uri.includes(incubatorComponent.id);
      })
      .start();

    await run(cliConfig({
      incubatorPageId,
    }));
    assert.ok(await getTimedPromise(() => compCreated, 'Production component not created'));
    assert.ok(await getTimedPromise(() => compRemoved, 'Incubator component not removed from dedicated page'));
    api.stop();
  });

  it('uses environment variables', async () => {
    let compCreated = false;
    process.env.STATUSPAGE_AUTH = auth;
    process.env.STATUSPAGE_PAGE_ID = pageId;

    const api = new StatuspageAPI(apiConfig())
      .on(StatuspageAPI.CREATE_COMPONENT, () => {
        compCreated = true;
      })
      .start();

    await run({ cmd });

    assert.ok(await getTimedPromise(() => compCreated, 'Component not created'));
    assert.ok(logger.log.calledWith('Automation email:', email), `console.log not called with ${email}`);
    api.stop();
    delete process.env.STATUSPAGE_AUTH;
    delete process.env.STATUSPAGE_PAGE_ID;
  });

  it('exits with code 1 if create API fails', async () => {
    let exitCode1 = false;
    const originalExit = process.exit;
    process.exit = (code) => {
      exitCode1 = code === 1;
    };
    const api = new StatuspageAPI(apiConfig({
      success: false,
    })).start();

    await run(cliConfig());
    assert.ok(await getTimedPromise(() => exitCode1, 'Process did not exit with code 1'));
    api.stop();
    process.exit = originalExit;
  });
});
