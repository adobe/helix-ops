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
const fs = require('fs');
const path = require('path');

const NewRelic = require('../src/newrelic/cli');
const {
  MONITOR_FREQUENCY,
  MONITOR_LOCATIONS,
  MONITOR_STATUS,
  MONITOR_THRESHOLD,
  MONITOR_TYPE,
} = require('../src/newrelic/synthetics');
const {
  CHANNEL_TYPE,
  INCIDENT_PREFERENCE,
  CONDITION_NAME,
  CONDITION_PRIORITY,
  CONDITION_THRESHOLD,
} = require('../src/newrelic/alerts');
const { getTimedPromise } = require('./utils');
const { getIncubatorName } = require('../src/utils');

function buildArgs({
  cmd, auth, url, email, name, groupPolicy, type, script, incubator,
} = {}) {
  const args = [];
  if (cmd) args.push(cmd);
  if (url) args.push(url);
  if (email) args.push(email);
  if (auth) args.push('--auth', auth);
  if (name) args.push('--name', `"${name}"`);
  if (groupPolicy) args.push('--group_policy', `"${groupPolicy}"`);
  if (type) args.push('--type', `"${type}"`);
  if (script) args.push('--script', `"${script}"`);
  if (incubator) args.push('--incubator', `${incubator}`);
  return args;
}

async function run(opts = {}) {
  return new NewRelic().run(buildArgs(opts));
}

async function runShell(opts = {}) {
  return shell.exec(`node ./src/newrelic ${buildArgs(opts).join(' ')}`);
}

describe('Testing newrelic', () => {
  let name;
  let url;
  let v = 0;
  const logger = console;

  // env variable backup
  const originalAuth = process.env.NEWRELIC_AUTH;

  // defaults
  const cmd = 'setup';
  const auth = 'test-auth';
  const namePrefix = 'Test Service ';
  const email = 'component+abcdef@notifications.statuspage.io';
  const groupPolicy = 'Test Group Policy';
  const script = path.resolve(__dirname, './fixtures/monitor_script.js');
  const testMonitor = {
    id: '0000',
    frequency: MONITOR_FREQUENCY,
    locations: MONITOR_LOCATIONS,
    status: MONITOR_STATUS,
    slaThreshold: MONITOR_THRESHOLD,
    type: MONITOR_TYPE.api,
  };
  const browserMonitor = { ...testMonitor, type: MONITOR_TYPE.browser };
  const testChannel = {
    id: '1111',
    type: CHANNEL_TYPE,
    configuration: {
      recipients: email,
      include_json_attachment: false,
    },
  };
  const testPolicy = {
    id: '2222',
    incident_preference: INCIDENT_PREFERENCE,
  };
  const testGroupPolicy = {
    id: '3333',
    name: groupPolicy,
    incident_preference: INCIDENT_PREFERENCE,
  };
  const testCondition = {
    id: '4444',
    name: CONDITION_NAME,
    enabled: true,
    entities: [],
    terms: [{
      threshold: CONDITION_THRESHOLD,
      priority: CONDITION_PRIORITY,
    }],
  };
  const testExistingCondition = {
    id: '5555',
    name: CONDITION_NAME,
    enabled: true,
    entities: [testMonitor.id],
    terms: [{
      threshold: CONDITION_THRESHOLD,
      priority: CONDITION_PRIORITY,
    }],
  };
  const incubatorChannel = {
    ...testChannel,
    id: '1112',
  };
  const incubatorPolicy = {
    ...testPolicy,
    id: '2223',
  };
  const incubator = true;

  before(() => {
    sinon.spy(logger, 'log');
    sinon.spy(logger, 'error');
    // make sure there are no env variables around for this test
    delete process.env.NEWRELIC_AUTH;
  });

  beforeEach(() => {
    name = namePrefix + Date.now(); // ensure unique service names
    testMonitor.name = name;
    testChannel.name = name;
    testPolicy.name = name;
    v += 1;
    url = `https://adobeioruntime.net/api/v1/web/foo/bar/sample@v${v}/_status_check/healthcheck.json`;
    nock.restore();
    nock.cleanAll();
    nock.activate();
  });

  after(() => {
    // unwrap the sinon spies
    logger.log.restore();
    logger.error.restore();
    // add env variables back
    process.env.NEWRELIC_AUTH = originalAuth;
  });

  it('shows help if no command specified and exits with code != 0', async () => {
    const output = await runShell();
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Not enough non-option arguments/.test(output.stderr), 'expected help output');
  }).timeout(5000);

  it('refuses to run without required arguments', async () => {
    const output = await runShell({
      cmd,
      url,
      email,
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Missing required argument: auth/.test(output.stderr), 'expected missing required arguments');
  }).timeout(5000);

  it('refuses to run without dependent arguments', async () => {
    const output = await runShell({
      cmd,
      url,
      email,
      auth,
      type: 'api', // type requires dependent argument script
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Missing dependent arguments:\n type/.test(output.stderr), 'expected missing dependent arguments');
  });

  it('creates a new monitoring setup', async () => {
    const test = {};

    // synthetics API
    nock('https://synthetics.newrelic.com')
      // Getting monitors
      .get(/.*/)
      .reply(200, () => {
        test.ok1 = true;
        return JSON.stringify({ count: 0, monitors: [] });
      })
      // Creating monitor
      .post('/synthetics/api/v3/monitors')
      .reply(201, (uri, body) => {
        test.ok2 = body.name === name;
        return JSON.stringify(testMonitor);
      })
      // Getting monitors again
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      // Updating locations for monitor
      .patch(`/synthetics/api/v3/monitors/${testMonitor.id}`)
      .reply(204, (uri, body) => {
        test.ok3 = body.locations.includes(MONITOR_LOCATIONS[0]);
        return JSON.stringify(testMonitor);
      })
      // Updating script for monitor
      .put(`/synthetics/api/v3/monitors/${testMonitor.id}/script`)
      .reply(204, (uri, body) => {
        test.ok4 = Buffer.from(body.scriptText, 'base64').toString('utf-8').startsWith('/*');
        return JSON.stringify(testMonitor);
      });

    // alerts API
    nock('https://api.newrelic.com')
      // Getting channels
      .get('/v2/alerts_channels.json')
      .reply(200, () => {
        test.ok5 = true;
        return JSON.stringify({ channels: [] });
      })
      // Creating notification channel
      .post('/v2/alerts_channels.json')
      .reply(201, (uri, body) => {
        test.ok6 = body.channel.name === name;
        return JSON.stringify({ channels: [testChannel] });
      })
      // Getting alert policies
      .get('/v2/alerts_policies.json')
      .reply(200, () => {
        test.ok7 = true;
        return JSON.stringify({ policies: [testGroupPolicy] });
      })
      // Creating alert policy
      .post('/v2/alerts_policies.json')
      .reply(201, (uri, body) => {
        test.ok8 = body.policy.name === name;
        return JSON.stringify({ policy: testPolicy });
      })
      // Linking notification channel to alert policy
      .put('/v2/alerts_policy_channels.json')
      .reply(200, (uri, body) => {
        test.ok9 = body.startsWith(`channel_ids=${testChannel.id}`);
        return JSON.stringify({ policy: testPolicy });
      })
      // Getting conditions in alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${testPolicy.id}.json`)
      .reply(200, () => {
        test.ok10 = true;
        return JSON.stringify({ location_failure_conditions: [] });
      })
      // Creating condition in alert policy
      .post(`/v2/alerts_location_failure_conditions/policies/${testPolicy.id}.json`)
      .reply(201, (uri, body) => {
        test.ok11 = body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      })
      // Getting conditions in group alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${testGroupPolicy.id}.json`)
      .reply(200, () => {
        test.ok14 = true;
        return JSON.stringify({ location_failure_conditions: [testCondition] });
      })
      // Updating condition in group alert policy
      .put(`/v2/alerts_location_failure_conditions/${testCondition.id}.json`)
      .reply(200, (uri, body) => {
        test.ok15 = body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      });

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Monitor list not retrieved'),
      getTimedPromise(() => test.ok2, 'Monitor not created'),
      getTimedPromise(() => test.ok3, 'Monitor locations not updated'),
      getTimedPromise(() => test.ok4, 'Monitor script not updated'),
      getTimedPromise(() => test.ok5, 'Channel list not retrieved'),
      getTimedPromise(() => test.ok6, 'Channel not created'),
      getTimedPromise(() => test.ok7, 'Policy list not retrieved'),
      getTimedPromise(() => test.ok8, 'Policy not created'),
      getTimedPromise(() => test.ok9, 'Channel not linked to policy'),
      getTimedPromise(() => test.ok10, 'Condition list not retrieved from policy'),
      getTimedPromise(() => test.ok11, 'Condition not created'),
      getTimedPromise(() => test.ok14, 'Condition list not retrieved from group policy'),
      getTimedPromise(() => test.ok15, 'Group policy condition not updated'),
    ]));
  }).timeout(5000);

  it('detects and updates existing monitoring setup', async () => {
    const test = {};

    // synthetics API
    nock('https://synthetics.newrelic.com')
      // Getting monitors
      .get(/.*/)
      .reply(200, () => {
        test.ok1 = true;
        return JSON.stringify({ count: 1, monitors: [testMonitor] });
      })
      // Updating locations for monitor
      .patch(`/synthetics/api/v3/monitors/${testMonitor.id}`)
      .reply(204, (uri, body) => {
        test.ok2 = body.locations.includes(MONITOR_LOCATIONS[0]);
        return JSON.stringify(testMonitor);
      })
      // Updating script for monitor
      .put(`/synthetics/api/v3/monitors/${testMonitor.id}/script`)
      .reply(204, (uri, body) => {
        test.ok3 = Buffer.from(body.scriptText, 'base64').toString('utf-8').startsWith('/*');
        return JSON.stringify(testMonitor);
      });

    // alerts API
    nock('https://api.newrelic.com')
      // Getting channels
      .get('/v2/alerts_channels.json')
      .reply(200, () => {
        test.ok4 = true;
        return JSON.stringify({ channels: [testChannel] });
      })
      // Getting alert policies
      .get('/v2/alerts_policies.json')
      .reply(200, () => {
        test.ok5 = true;
        return JSON.stringify({ policies: [testPolicy, testGroupPolicy] });
      })
      // Linking notification channel to alert policy
      .put('/v2/alerts_policy_channels.json')
      .reply(200, (uri, body) => {
        test.ok6 = body.startsWith(`channel_ids=${testChannel.id}`);
        return JSON.stringify({ policy: testPolicy });
      })
      // Getting conditions in alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${testPolicy.id}.json`)
      .reply(200, () => {
        test.ok8 = true;
        return JSON.stringify({ location_failure_conditions: [testExistingCondition] });
      })
      // Getting conditions in group alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${testGroupPolicy.id}.json`)
      .reply(200, () => {
        test.ok9 = true;
        return JSON.stringify({ location_failure_conditions: [testExistingCondition] });
      });

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Monitor list not retrieved'),
      getTimedPromise(() => test.ok2, 'Monitor locations not updated'),
      getTimedPromise(() => test.ok3, 'Monitor script not updated'),
      getTimedPromise(() => test.ok4, 'Channel list not retrieved'),
      getTimedPromise(() => test.ok5, 'Policy list not retrieved'),
      getTimedPromise(() => test.ok6, 'Channel not linked to policy'),
      getTimedPromise(() => test.ok8, 'Condition list not retrieved from policy'),
      getTimedPromise(() => test.ok9, 'Condition list not retrieved from group policy'),
    ]));
  }).timeout(5000);

  it('creates a new monitoring setup without email', async () => {
    let ok = false;

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 0, monitors: [] }))
      .post(/.*/)
      .reply(201, () => JSON.stringify(testMonitor))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      .patch(/.*/)
      .reply(204, () => JSON.stringify(testMonitor))
      .put(/.*/)
      .reply(204, JSON.stringify(testMonitor));

    // alerts API
    nock('https://api.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ policies: [testGroupPolicy] }))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ location_failure_conditions: [testCondition] }))
      // Updating condition in group alert policy
      .put(`/v2/alerts_location_failure_conditions/${testCondition.id}.json`)
      .reply(200, (uri, body) => {
        ok = body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      });

    await run({
      cmd,
      url,
      auth,
      name,
      groupPolicy,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => ok, 'Monitor not added to group alert policy'),
    ]));
  });

  it('creates new monitor with custom script', async () => {
    let ok = false;

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 0, monitors: [] }))
      .post(/.*/)
      .reply(201, () => JSON.stringify(testMonitor))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      .patch(/.*/)
      .reply(204, () => JSON.stringify(testMonitor))
      // Updating custom script for monitor
      .put(/.*/)
      .reply(204, (uri, body) => {
        ok = Buffer.from(body.scriptText, 'base64').toString() === fs.readFileSync(script)
          .toString()
          .replace('$$$URL$$$', url);
        return JSON.stringify(testMonitor);
      });

    // alerts API
    nock('https://api.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ channels: [testChannel] }))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ policies: [testPolicy] }))
      .put(/.*/)
      .reply(204, () => JSON.stringify({ policy: testPolicy }))
      .get(/.*/)
      .reply(200, JSON.stringify({ location_failure_conditions: [testExistingCondition] }));

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
      script,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => ok, 'Custom monitor script not used'),
    ]));
  });

  it('updates existing monitor with custom script', async () => {
    let ok = false;

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      .patch(`/synthetics/api/v3/monitors/${testMonitor.id}`)
      .reply(204, () => JSON.stringify(testMonitor))
      // Updating custom script for monitor
      .put(`/synthetics/api/v3/monitors/${testMonitor.id}/script`)
      .reply(204, (uri, body) => {
        ok = Buffer.from(body.scriptText, 'base64').toString() === fs.readFileSync(script)
          .toString()
          .replace('$$$URL$$$', url);
        return JSON.stringify(testMonitor);
      });

    // alerts API
    nock('https://api.newrelic.com')
      .get('/v2/alerts_channels.json')
      .reply(200, () => JSON.stringify({ channels: [testChannel] }))
      .get('/v2/alerts_policies.json')
      .reply(200, () => JSON.stringify({ policies: [testPolicy] }))
      .put('/v2/alerts_policy_channels.json')
      .reply(200, () => JSON.stringify({ policy: testPolicy }))
      .get('/v2/alerts_policies.json')
      .reply(200, () => JSON.stringify({ policies: [testGroupPolicy] }))
      .get(`/v2/alerts_location_failure_conditions/policies/${testPolicy.id}.json`)
      .reply(200, () => JSON.stringify({ location_failure_conditions: [testExistingCondition] }))
      .get(`/v2/alerts_location_failure_conditions/policies/${testGroupPolicy.id}.json`)
      .reply(200, () => JSON.stringify({ location_failure_conditions: [testExistingCondition] }));

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      script,
      groupPolicy,
    });

    assert.ok(await getTimedPromise(() => ok, 'Custom monitor script not used'));
  }).timeout(5000);

  it('creates monitor with type browser and custom script', async () => {
    browserMonitor.name = testMonitor.name;
    const test = {};

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 0, monitors: [] }))
      // Creating browser monitor
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok1 = body.type === MONITOR_TYPE.browser;
        return JSON.stringify(browserMonitor);
      })
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [browserMonitor] }))
      .patch(/.*/)
      .reply(204, () => JSON.stringify(browserMonitor))
      // Updating custom script for monitor
      .put(/.*/)
      .reply(204, (uri, body) => {
        test.ok2 = Buffer.from(body.scriptText, 'base64').toString() === fs.readFileSync(script)
          .toString()
          .replace('$$$URL$$$', url);
        return JSON.stringify(browserMonitor);
      });

    // alerts API
    nock('https://api.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ channels: [testChannel] }))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ policies: [testPolicy] }))
      .put(/.*/)
      .reply(204, () => JSON.stringify({ policy: testPolicy }))
      .get(/.*/)
      .reply(200, JSON.stringify({ location_failure_conditions: [testExistingCondition] }));

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
      type: 'browser',
      script,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Monitor with type browser not created'),
      getTimedPromise(() => test.ok2, 'Custom monitor script not used'),
    ]));
  });

  it('creates a new incubator monitoring setup', async () => {
    const test = {};
    incubatorChannel.name = getIncubatorName(name);
    incubatorPolicy.name = getIncubatorName(name);

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 0, monitors: [] }))
      .post(/.*/)
      .reply(201, () => JSON.stringify(testMonitor))
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      .patch(/.*/)
      .reply(204, () => JSON.stringify(testMonitor))
      .put(/.*/)
      .reply(204, () => JSON.stringify(testMonitor));

    // alerts API
    nock('https://api.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ channels: [] }))
      // Creating incubator notification channel
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok1 = body.channel.name === getIncubatorName(name);
        return JSON.stringify({ channels: [incubatorChannel] });
      })
      .get(/.*/)
      .reply(200, () => JSON.stringify({ policies: [] }))
      // Creating incubator alert policy
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok2 = body.policy.name === getIncubatorName(name);
        return JSON.stringify({ policy: incubatorPolicy });
      })
      // Linking incubator notification channel to incubator alert policy
      .put(/.*/)
      .reply(204, (uri, body) => {
        test.ok3 = body.startsWith(`channel_ids=${incubatorChannel.id}`)
          && body.endsWith(`policy_id=${incubatorPolicy.id}`);
        return JSON.stringify({ policy: incubatorPolicy });
      })
      .get(/.*/)
      .reply(200, JSON.stringify({ location_failure_conditions: [] }))
      // Creating condition in incubator alert policy
      .post(`/v2/alerts_location_failure_conditions/policies/${incubatorPolicy.id}.json`)
      .reply(201, (uri, body) => {
        test.ok4 = body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      });

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
      incubator,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Incubator notification channel not created'),
      getTimedPromise(() => test.ok2, 'Incubator alert policy not created'),
      getTimedPromise(() => test.ok3, 'Incubator channel not linked to incubator alert policy'),
      getTimedPromise(() => test.ok4, 'Condition not created in incubator alert policy'),
    ]));
  }).timeout(5000);

  it('turns incubator monitoring setup into production one', async () => {
    const test = {};
    incubatorChannel.name = getIncubatorName(name);
    incubatorPolicy.name = getIncubatorName(name);

    // synthetics API
    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ count: 1, monitors: [testMonitor] }))
      .patch(/.*/)
      .reply(204, () => JSON.stringify(testMonitor))
      .put(/.*/)
      .reply(204, JSON.stringify(testMonitor));

    // alerts API
    nock('https://api.newrelic.com')
      .get(/.*/)
      .reply(200, () => JSON.stringify({ channels: [incubatorChannel] }))
      // Creating production notification channel
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok1 = body.channel.name === name;
        return JSON.stringify({ channels: [testChannel] });
      })
      // Deleting incubator notification channel
      .delete(/.*/)
      .reply(200, (uri) => {
        test.ok2 = uri.endsWith(`${incubatorChannel.id}.json`);
        return '';
      })
      // Getting alert policies
      .get(/.*/)
      .reply(200, () => JSON.stringify({
        policies: [
          incubatorPolicy,
          testGroupPolicy,
        ],
      }))
      // Creating production alert policy
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok3 = body.policy.name === name;
        return JSON.stringify({ policy: testPolicy });
      })
      // Linking production notification channel to production alert policy
      .put(/.*/)
      .reply(204, (uri, body) => {
        test.ok4 = body.startsWith(`channel_ids=${testChannel.id}`)
          && body.endsWith(`policy_id=${testPolicy.id}`);
        return JSON.stringify({ policy: testPolicy });
      })
      .get(/.*/)
      .reply(200, () => JSON.stringify({ location_failure_conditions: [] }))
      // Creating condition in production alert policy
      .post(/.*/)
      .reply(201, (uri, body) => {
        test.ok5 = uri.endsWith(`${testPolicy.id}.json`)
          && body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      })
      .get(/.*/)
      .reply(200, () => JSON.stringify({ location_failure_conditions: [testCondition] }))
      // Updating condition in group alert policy
      .put(/.*/)
      .reply(204, (uri, body) => {
        test.ok6 = body.location_failure_condition.entities.includes(testMonitor.id);
        return JSON.stringify({ location_failure_conditions: testCondition });
      })
      // Deleting incubator alert policy
      .delete(/.*/)
      .reply(200, (uri) => {
        test.ok7 = uri.endsWith(`${incubatorPolicy.id}.json`);
        return '';
      });

    await run({
      cmd,
      url,
      email,
      auth,
      name,
      groupPolicy,
    });
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Production notification channel not created'),
      getTimedPromise(() => test.ok2, 'Incubator notification channel not deleted'),
      getTimedPromise(() => test.ok3, 'Production alert policy not created'),
      getTimedPromise(() => test.ok4, 'Production notification channel not linked to production alert policy'),
      getTimedPromise(() => test.ok5, 'Condition not created in production alert policy'),
      getTimedPromise(() => test.ok6, 'Condition in group alert policy not updated'),
      getTimedPromise(() => test.ok7, 'Incubator alert policy not deleted'),
    ]));
  }).timeout(5000);

  it('uses environment variables', async () => {
    process.env.NEWRELIC_AUTH = auth;

    // synthetics API
    nock('https://synthetics.newrelic.com')
      // Getting monitors
      .get(/.*/)
      .reply(200, JSON.stringify({ count: 1, monitors: [testMonitor] }))
      // Updating locations for monitor
      .patch(`/synthetics/api/v3/monitors/${testMonitor.id}`)
      .reply(204, JSON.stringify(testMonitor))
      // Updating script for monitor
      .put(`/synthetics/api/v3/monitors/${testMonitor.id}/script`)
      .reply(204, JSON.stringify(testMonitor));

    // alerts API
    nock('https://api.newrelic.com')
      // Getting channels
      .get('/v2/alerts_channels.json')
      .reply(200, JSON.stringify({ channels: [testChannel] }))
      // Getting alert policies
      .get('/v2/alerts_policies.json')
      .reply(200, JSON.stringify({ policies: [testPolicy] }))
      // Linking notification channel to alert policy
      .put('/v2/alerts_policy_channels.json')
      .reply(200, JSON.stringify({ policy: testPolicy }))
      // Getting alert policies
      .get('/v2/alerts_policies.json')
      .reply(200, JSON.stringify({ policies: [testGroupPolicy] }))
      // Getting conditions in alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${testPolicy.id}.json`)
      .reply(200, JSON.stringify({ location_failure_conditions: [testExistingCondition] }));

    await run({
      cmd,
      url,
      email,
      name,
    });

    assert.ok(await getTimedPromise(() => logger.log.calledWith('done.'), 'Did not run successfully'));
    delete process.env.NEWRELIC_AUTH;
  }).timeout(5000);

  it('exits with code 1 if API calls fail', async () => {
    let exitCount = 0;
    const originalExit = process.exit;
    process.exit = (code) => {
      if (code === 1) {
        exitCount += 1;
      }
    };

    nock('https://synthetics.newrelic.com')
      .get(/.*/)
      .reply(500, 'Internal Server Error')
      .post(/.*/)
      .reply(500, 'Internal Server Error');
    nock('https://api.newrelic.com')
      .persist()
      .get(/.*/)
      .reply(500, 'Internal Server Error')
      .post(/.*/)
      .reply(500, 'Internal Server Error');

    await run({
      cmd,
      url,
      email,
      auth,
      name,
    });

    assert.ok(await getTimedPromise(() => exitCount === 2, 'Did not exit with code 1 on two occasions'));
    process.exit = originalExit;
  }).timeout(5000);
});
