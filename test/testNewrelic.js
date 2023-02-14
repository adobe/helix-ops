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
const fs = require('fs');
const path = require('path');

process.env.HELIX_FETCH_FORCE_HTTP1 = 'true';

const NewRelic = require('../src/newrelic/cli.js');
const {
  MONITOR_FREQUENCY,
  MONITOR_LOCATIONS,
  MONITOR_STATUS,
  MONITOR_THRESHOLD,
  MONITOR_TYPE,
} = require('../src/newrelic/synthetics.js');
const {
  CHANNEL_TYPE,
  INCIDENT_PREFERENCE,
  CONDITION_NAME,
  CONDITION_PRIORITY,
  CONDITION_THRESHOLD,
} = require('../src/newrelic/alerts.js');
const NewRelicAPI = require('./newrelic/NewRelicAPI.js');
const { getTimedPromise } = require('./utils.js');
const { getIncubatorName } = require('../src/utils.js');

function buildArgs({
  cmd, auth, url, email, name, groupPolicy, type, script, locations, frequency, incubator,
} = {}) {
  const args = [];
  if (cmd) args.push(cmd);
  if (auth) args.push('--auth', auth);
  if (url) url.forEach((u) => args.push('--url', u));
  if (email) email.forEach((e) => args.push('--email', e));
  if (name) name.forEach((n) => args.push('--name', `"${n}"`));
  if (groupPolicy) args.push('--group_policy', `"${groupPolicy}"`);
  if (type) args.push('--type', type);
  if (script) args.push('--script', `"${script}"`);
  if (locations) args.push('--locations', locations);
  if (frequency) args.push('--frequency', frequency);
  if (incubator) args.push('--incubator', incubator);
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
  const script = path.resolve(__dirname, './fixtures/newrelic/custom-monitor-script.js');
  const locations = MONITOR_LOCATIONS.slice(3, 6).join(' ');
  const frequency = 5;
  const monitor = {
    id: '0000',
    frequency: MONITOR_FREQUENCY,
    locations: MONITOR_LOCATIONS,
    status: MONITOR_STATUS,
    slaThreshold: MONITOR_THRESHOLD,
    type: MONITOR_TYPE.api,
  };
  const adobeioMonitor = {
    ...monitor,
    id: '0001',
  };
  const awsMonitor = {
    ...monitor,
    id: '0002',
  };
  const channel = {
    id: '1111',
    type: CHANNEL_TYPE,
    configuration: {
      recipients: email,
      include_json_attachment: false,
    },
  };
  const adobeioChannel = {
    ...channel,
    id: '1112',
  };
  const awsChannel = {
    ...channel,
    id: '1113',
  };
  const policy = {
    id: '2222',
    incident_preference: INCIDENT_PREFERENCE,
  };
  const adobeioPolicy = {
    ...policy,
    id: '2223',
  };
  const awsPolicy = {
    ...policy,
    id: '2224',
  };
  const groupPolicy = {
    id: '3333',
    name: 'Test Group Policy',
    incident_preference: INCIDENT_PREFERENCE,
  };
  const condition = {
    id: '4444',
    name: CONDITION_NAME,
    enabled: true,
    entities: [],
    terms: [{
      threshold: CONDITION_THRESHOLD,
      priority: CONDITION_PRIORITY,
    }],
  };

  function apiConfig(overrides) {
    return {
      monitor,
      channel,
      policy,
      groupPolicy,
      condition,
      ...overrides,
    };
  }

  function cliConfig(overrides) {
    return {
      cmd,
      auth,
      url: [url],
      email: [email],
      name: [name],
      groupPolicy: groupPolicy.name,
      ...overrides,
    };
  }

  before(() => {
    sinon.spy(logger, 'log');
    sinon.spy(logger, 'error');
    // make sure there are no env variables around for this test
    delete process.env.NEWRELIC_AUTH;
  });

  beforeEach(() => {
    name = namePrefix + Date.now(); // ensure unique service names
    monitor.name = name;
    channel.name = name;
    policy.name = name;
    v += 1;
    url = `https://adobeioruntime.net/api/v1/web/foo/bar/sample@v${v}/_status_check/healthcheck.json`;
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
      url: [url],
      email: [email],
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/Missing required argument: auth/.test(output.stderr), 'expected missing required arguments');
  }).timeout(5000);

  it('refuses to run without dependent arguments', async () => {
    const output = await runShell({
      cmd,
      url: [url],
      email: [email],
      auth,
      type: 'api', // type requires dependent argument script
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/(Implications failed|Missing dependent arguments):\s+type/m.test(output.stderr), 'expected missing dependent arguments');
  });

  it('refuses to run with different number of urls and names', async () => {
    const output = await runShell({
      cmd,
      auth,
      url: [url, url],
      name: [name],
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/The number of provides names and urls must match/.test(output.stderr), 'expected number mismatch error');
  });

  it('refuses to run with different number of names and emails', async () => {
    const output = await runShell({
      cmd,
      auth,
      url: [url, url],
      name: [name, name],
      email: [email],
    });
    assert.notEqual(output.code, 0, `expected exit code != 0, but got ${output.code}`);
    assert.ok(/The number of provides names and email addresses must match/.test(output.stderr), 'expected number mismatch error');
  });

  it('creates a new monitoring setup', async () => {
    const test = {};
    const api = new NewRelicAPI(apiConfig())
      .on(NewRelicAPI.GET_MONITORS, () => {
        test.ok1 = true;
      })
      .on(NewRelicAPI.CREATE_MONITOR, (uri, req) => {
        test.ok2 = req.name === name;
      })
      .on(NewRelicAPI.UPDATE_LOCATIONS, (uri, req) => {
        test.ok3 = typeof req.locations === 'object'
          && req.locations.includes(MONITOR_LOCATIONS[0]);
      })
      .on(NewRelicAPI.UPDATE_SCRIPT, (uri, req) => {
        test.ok4 = req.scriptText
          && Buffer.from(req.scriptText, 'base64').toString('utf-8').startsWith('/*');
      })
      .on(NewRelicAPI.GET_CHANNELS, () => {
        test.ok5 = true;
      })
      .on(NewRelicAPI.CREATE_CHANNEL, (uri, req) => {
        test.ok6 = req.channel.name === name;
      })
      .on(NewRelicAPI.GET_POLICIES, () => {
        test.ok7 = true;
      })
      .on(NewRelicAPI.CREATE_POLICY, (uri, req) => {
        test.ok8 = req.policy.name === name;
      })
      .on(NewRelicAPI.UPDATE_POLICY, (uri, req) => {
        test.ok9 = req.startsWith(`channel_ids=${channel.id}`);
      })
      .on(NewRelicAPI.GET_CONDITIONS, (uri) => {
        if (uri.includes(policy.id)) {
          test.ok10 = true;
        }
        if (uri.includes(groupPolicy.id)) {
          test.ok12 = true;
        }
      })
      .on(NewRelicAPI.CREATE_CONDITION, (uri, req) => {
        test.ok11 = req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && req.location_failure_condition.entities.includes(monitor.id);
      })
      .on(NewRelicAPI.UPDATE_CONDITION, (uri, req) => {
        test.ok13 = req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && typeof req.location_failure_condition.entities.includes(monitor.id);
      })
      .start();

    await run(cliConfig());
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
      getTimedPromise(() => test.ok12, 'Condition list not retrieved from group policy'),
      getTimedPromise(() => test.ok13, 'Group policy condition not updated'),
    ]));
    api.stop();
  }).timeout(5000);

  it('creates a new universal monitoring setup', async () => {
    adobeioMonitor.name = `${name}.adobeio`;
    awsMonitor.name = `${name}.aws`;
    const adobeioUrl = `https://adobeioruntime.net/api/v1/web/foo/bar/sample@v${v}/_status_check/healthcheck.json`;
    const awsUrl = `https://adobeioruntime.net/api/v1/web/foo/bar/sample@v${v}/_status_check/healthcheck.json`;
    const monitorsCreated = [];
    const api = new NewRelicAPI(apiConfig({
      adobeioMonitor,
      awsMonitor,
    }))
      .on(NewRelicAPI.CREATE_MONITOR, (uri, req) => {
        monitorsCreated.push(req.name);
      })
      .start();

    await run(cliConfig({
      url: [url, adobeioUrl, awsUrl],
      email: [email, email, email],
      name: [name, adobeioMonitor.name, awsMonitor.name],
    }));
    assert.ok(await getTimedPromise(() => monitorsCreated.length === 3, 'Universal monitors not created'));
    assert.ok(monitorsCreated.includes(adobeioMonitor.name), 'Runtime monitor not named as expected');
    assert.ok(monitorsCreated.includes(awsMonitor.name), 'AWS monitor not named as expected');
    api.stop();
  }).timeout(10000);

  it('detects and updates existing monitoring setup', async () => {
    const test = {};
    const api = new NewRelicAPI(apiConfig({ new: false }))
      .on(NewRelicAPI.CREATE_MONITOR, () => assert.fail('Unexpected monitor creation'))
      .on(NewRelicAPI.UPDATE_LOCATIONS, (uri, req) => {
        test.ok1 = typeof req.locations === 'object'
          && req.locations.includes(MONITOR_LOCATIONS[0]);
      })
      .on(NewRelicAPI.UPDATE_SCRIPT, (uri, req) => {
        test.ok2 = req.scriptText
          && Buffer.from(req.scriptText, 'base64').toString('utf-8').startsWith('/*');
      })
      .on(NewRelicAPI.CREATE_CHANNEL, () => assert.fail('Unexpected notification channel creation'))
      .on(NewRelicAPI.CREATE_POLICY, () => assert.fail('Unexpected alert policy creation'))
      .on(NewRelicAPI.UPDATE_POLICY, (uri, req) => {
        test.ok3 = req.startsWith(`channel_ids=${channel.id}`);
      })
      .on(NewRelicAPI.CREATE_CONDITION, () => assert.fail('Unexpected condition creation'))
      .start();

    await run(cliConfig());
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Monitor locations not updated'),
      getTimedPromise(() => test.ok2, 'Monitor script not updated'),
      getTimedPromise(() => test.ok3, 'Channel not linked to policy'),
    ]));
    api.stop();
  }).timeout(5000);

  it('updates existing universal monitoring setup', async () => {
    const adobeioName = `${name}.adobeio`;
    adobeioMonitor.name = adobeioName;
    adobeioChannel.name = adobeioName;
    adobeioPolicy.name = adobeioName;

    const awsName = `${name}.aws`;
    awsMonitor.name = awsName;
    awsChannel.name = awsName;
    awsPolicy.name = awsName;

    let updated = false;
    const api = new NewRelicAPI(apiConfig({
      new: false,
      aws: true,
      adobeioMonitor,
      adobeioChannel,
      adobeioPolicy,
      awsMonitor,
      awsChannel,
      awsPolicy,
    }))
      .on(NewRelicAPI.CREATE_MONITOR, () => assert.fail('Unexpected monitor creation'))
      .on(NewRelicAPI.CREATE_CHANNEL, () => assert.fail('Unexpected notification channel creation'))
      .on(NewRelicAPI.CREATE_POLICY, () => assert.fail('Unexpected alert policy creation'))
      .on(NewRelicAPI.UPDATE_POLICY, (uri, req) => {
        updated = req.startsWith(`channel_ids=${awsChannel.id}`);
      })
      .on(NewRelicAPI.CREATE_CONDITION, () => assert.fail('Unexpected condition creation'))
      .start();

    await run(cliConfig({
      url: [url, url, url],
      email: [email, email, email],
      name: [name, adobeioMonitor.name, awsMonitor.name],
    }));
    assert(await getTimedPromise(() => !!updated, 'AWS policy not updated'));
    api.stop();
  }).timeout(10000);

  it('ignores same name group alert policy', async () => {
    let count = 0;
    const api = new NewRelicAPI(apiConfig({
      new: false,
      groupPolicy: policy, // reuse same policy as group policy
    }))
      // count retrievals of alert policy conditions
      .on(NewRelicAPI.GET_CONDITIONS, () => {
        count += 1;
      })
      .start();

    await run(cliConfig({
      groupPolicy: name, // reuse same name for group policy
    }));
    assert.ok(await getTimedPromise(() => count === 1, 'Condition list retrieved from same policy more than once'));
    api.stop();
  }).timeout(5000);

  it('creates a new monitoring setup without email', async () => {
    let ok = false;
    const api = new NewRelicAPI(apiConfig())
      // check if monitor added to group alert policy
      .on(NewRelicAPI.UPDATE_CONDITION, (uri, req) => {
        ok = req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && req.location_failure_condition.entities.includes(monitor.id);
      })
      .start();

    await run(cliConfig({
      email: null,
    }));
    assert.ok(await getTimedPromise(() => ok, 'Monitor not added to group alert policy'));
    api.stop();
  }).timeout(5000);

  it('creates new monitor with custom script', async () => {
    let ok = false;
    const api = new NewRelicAPI(apiConfig())
      .on(NewRelicAPI.UPDATE_SCRIPT, (uri, req) => {
        ok = req.scriptText
          && Buffer.from(req.scriptText, 'base64').toString() === fs.readFileSync(script)
            .toString()
            .replace('$$$URL$$$', url);
      })
      .start();

    await run(cliConfig({
      script,
    }));
    assert.ok(await getTimedPromise(() => ok, 'Custom monitor script not used'));
    api.stop();
  }).timeout(5000);

  it('updates existing monitor with custom script', async () => {
    let ok = false;
    const api = new NewRelicAPI(apiConfig({ new: false }))
      .on(NewRelicAPI.UPDATE_SCRIPT, (uri, req) => {
        ok = req.scriptText
          && Buffer.from(req.scriptText, 'base64').toString() === fs.readFileSync(script)
            .toString()
            .replace('$$$URL$$$', url);
      })
      .start();

    await run(cliConfig({
      script,
    }));
    assert.ok(await getTimedPromise(() => ok, 'Custom monitor script not used'));
    api.stop();
  }).timeout(5000);

  it('creates monitor with type browser and custom script', async () => {
    const browserMonitor = {
      ...monitor,
      type: MONITOR_TYPE.browser,
    };
    const test = {};
    const api = new NewRelicAPI(apiConfig({
      monitor: browserMonitor,
    }))
      // check if monitor created with type browser
      .on(NewRelicAPI.CREATE_MONITOR, (uri, req) => {
        test.ok1 = req.type === MONITOR_TYPE.browser;
      })
      // check if custom monitor script uploaded
      .on(NewRelicAPI.UPDATE_SCRIPT, (uri, req) => {
        test.ok2 = req.scriptText
          && Buffer.from(req.scriptText, 'base64').toString() === fs.readFileSync(script)
            .toString()
            .replace('$$$URL$$$', url);
      })
      .start();

    await run(cliConfig({
      type: 'browser',
      script,
    }));
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Monitor with type browser not created'),
      getTimedPromise(() => test.ok2, 'Custom monitor script not used'),
    ]));
    api.stop();
  }).timeout(5000);

  it('creates new monitor with custom locations and frequency', async () => {
    let ok = false;
    const api = new NewRelicAPI(apiConfig())
      .on(NewRelicAPI.UPDATE_LOCATIONS, (uri, req) => {
        ok = typeof req.locations === 'object'
          && req.locations.join(' ') === locations
          && req.frequency === frequency;
      })
      .start();

    await run(cliConfig({ locations, frequency }));
    assert.ok(await getTimedPromise(() => ok, 'Custom locations or frequency not used'));
    api.stop();
  }).timeout(5000);

  it('updates an existing monitor with custom locations and frequency', async () => {
    let ok = false;
    const api = new NewRelicAPI(apiConfig({ new: false }))
      .on(NewRelicAPI.UPDATE_LOCATIONS, (uri, req) => {
        ok = typeof req.locations === 'object'
          && req.locations.join(' ') === locations
          && req.frequency === frequency;
      })
      .start();

    await run(cliConfig({ locations, frequency }));
    assert.ok(await getTimedPromise(() => ok, 'Custom locations or frequency not used'));
    api.stop();
  }).timeout(5000);

  it('creates a new incubator monitoring setup', async () => {
    const incubatorChannel = {
      ...channel,
      id: '1112',
      name: getIncubatorName(name),
    };
    const incubatorPolicy = {
      ...policy,
      id: '2223',
      name: getIncubatorName(name),
    };
    const test = {};
    const api = new NewRelicAPI(apiConfig({
      incubator: true,
      incubatorChannel,
      incubatorPolicy,
    }))
      // check if incubator channel created
      .on(NewRelicAPI.CREATE_CHANNEL, (uri, req) => {
        test.ok1 = req.channel && req.channel.name === getIncubatorName(name);
      })
      // check if incubator policy created
      .on(NewRelicAPI.CREATE_POLICY, (uri, req) => {
        test.ok2 = req.policy && req.policy.name === getIncubatorName(name);
      })
      // check if incubator policy linked to incubator channel
      .on(NewRelicAPI.UPDATE_POLICY, (uri, req) => {
        test.ok3 = req.startsWith(`channel_ids=${incubatorChannel.id}`)
          && req.endsWith(`policy_id=${incubatorPolicy.id}`);
      })
      // check if condition created in incubator policy and linked to monitor
      .on(NewRelicAPI.CREATE_CONDITION, (uri, req) => {
        test.ok4 = uri.includes(incubatorPolicy.id)
          && req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && req.location_failure_condition.entities.includes(monitor.id);
      })
      .start();

    await run(cliConfig({
      incubator: true,
    }));
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Incubator notification channel not created'),
      getTimedPromise(() => test.ok2, 'Incubator alert policy not created'),
      getTimedPromise(() => test.ok3, 'Incubator channel not linked to incubator alert policy'),
      getTimedPromise(() => test.ok4, 'Condition not created in incubator alert policy'),
    ]));
    api.stop();
  }).timeout(10000);

  it('turns incubator monitoring setup into production one', async () => {
    const test = {};
    const incubatorChannel = {
      ...channel,
      id: '1112',
      name: getIncubatorName(name),
    };
    const incubatorPolicy = {
      ...policy,
      id: '2223',
      name: getIncubatorName(name),
    };
    const api = new NewRelicAPI(apiConfig({
      incubatorChannel,
      incubatorPolicy,
    }))
      // check if production notification channel created in spite of existing incubator monitor
      .on(NewRelicAPI.CREATE_CHANNEL, (uri, req) => {
        test.ok1 = req.channel.name === name;
      })
      // check if incubator notification channel deleted
      .on(NewRelicAPI.DELETE_CHANNEL, (uri) => {
        test.ok2 = uri.endsWith(`${incubatorChannel.id}.json`);
      })
      // check if production alert policy created in spite of existing incubator alert policy
      .on(NewRelicAPI.CREATE_POLICY, (uri, req) => {
        test.ok3 = req.policy.name === name;
      })
      // check if production notification channel linked to production alert policy
      .on(NewRelicAPI.UPDATE_POLICY, () => {
        test.ok4 = true;
      })
      // check if condition created in production alert policy
      .on(NewRelicAPI.CREATE_CONDITION, (uri, req) => {
        test.ok5 = uri.endsWith(`${policy.id}.json`)
          && req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && req.location_failure_condition.entities.includes(monitor.id);
      })
      // check if condition updated in group alert policy
      .on(NewRelicAPI.UPDATE_CONDITION, (uri, req) => {
        test.ok6 = uri.endsWith(`${condition.id}.json`)
          && req.location_failure_condition
          && typeof req.location_failure_condition.entities === 'object'
          && req.location_failure_condition.entities.includes(monitor.id);
      })
      // check if incubator alert policy deleted
      .on(NewRelicAPI.DELETE_POLICY, (uri) => {
        test.ok7 = uri.endsWith(`${incubatorPolicy.id}.json`);
      })
      .start();

    await run(cliConfig());
    assert.ok(await Promise.all([
      getTimedPromise(() => test.ok1, 'Production notification channel not created'),
      getTimedPromise(() => test.ok2, 'Incubator notification channel not deleted'),
      getTimedPromise(() => test.ok3, 'Production alert policy not created'),
      getTimedPromise(() => test.ok4, 'Production notification channel not linked to production alert policy'),
      getTimedPromise(() => test.ok5, 'Condition not created in production alert policy'),
      getTimedPromise(() => test.ok6, 'Condition in group alert policy not updated'),
      getTimedPromise(() => test.ok7, 'Incubator alert policy not deleted'),
    ]));
    api.stop();
  }).timeout(5000);

  it('uses environment variables', async () => {
    process.env.NEWRELIC_AUTH = auth;
    const api = new NewRelicAPI(apiConfig({ new: false })).start();

    await run(cliConfig({ auth: null })); // omit --auth argument to use env variable
    assert.ok(await getTimedPromise(() => logger.log.calledWith('done.'), 'Did not run successfully'));
    api.stop();
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
    const api = new NewRelicAPI(apiConfig({ success: false })).start();

    await run(cliConfig());
    assert.ok(await getTimedPromise(() => exitCount === 2, `Did not exit with code 1 on two occasions, but ${exitCount}`));
    api.stop();
    process.exit = originalExit;
  }).timeout(5000);
});
