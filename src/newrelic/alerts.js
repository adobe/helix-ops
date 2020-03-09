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

const request = require('request-promise-native');
const { getIncubatorName } = require('../utils');

const CHANNEL_TYPE = 'email';
const INCIDENT_PREFERENCE = 'PER_POLICY';
const CONDITION_NAME = 'Location Failure';
const CONDITION_PRIORITY = 'critical';
const CONDITION_THRESHOLD = 2;

/* eslint-disable no-console */

async function getChannelInfo(auth, channelName, email) {
  try {
    const response = await request.get('https://api.newrelic.com/v2/alerts_channels.json', {
      headers: {
        'X-Api-Key': auth,
      },
      json: true,
    });
    const allChannels = response.channels || [];
    const [channel] = allChannels.filter((c) => c.type === CHANNEL_TYPE
      && c.name === channelName && c.configuration.recipients === email);
    return {
      channel,
      allChannels,
    };
  } catch (e) {
    console.error('Unable to retrieve channels:', e.message);
    return {};
  }
}

async function purgeIncubatorChannel(auth, name, allPolicies) {
  const [incubatorPolicy] = allPolicies ? allPolicies.filter((policy) => policy.name === name) : [];
  if (incubatorPolicy) {
    console.log('Removing incubator notification channel', incubatorPolicy.name);
    try {
      await request.delete(`https://api.newrelic.com/v2/alerts_channels/${incubatorPolicy.id}.json`, {
        headers: {
          'X-Api-Key': auth,
        },
      });
    } catch (e) {
      console.error('Unable to remove incubator notification channel', e.message);
    }
  }
}

async function reuseOrCreateChannel(auth, name, email, incubator) {
  const channelName = incubator ? getIncubatorName(name) : name;
  const info = await getChannelInfo(auth, channelName, email);
  const { allChannels } = info;
  let { channel } = info;

  if (channel) {
    console.log(`Reusing notification channel ${channel.name}`);
  } else {
    console.log('Creating notification channel', channelName);

    try {
      const response = await request.post('https://api.newrelic.com/v2/alerts_channels.json', {
        json: true,
        headers: {
          'X-Api-Key': auth,
        },
        body: {
          channel: {
            name: channelName,
            type: CHANNEL_TYPE,
            configuration: {
              recipients: email,
              include_json_attachment: false,
            },
          },
        },
      });
      [channel] = response.channels;

      if (!incubator) {
        // delete same name incubator channel
        purgeIncubatorChannel(auth, getIncubatorName(name), allChannels);
      }
    } catch (e) {
      console.error('Notification channel creation failed:', e.message);
      process.exit(1);
    }
  }
  return channel ? channel.id : null;
}

async function getConditions(auth, policy) {
  try {
    if (!policy || !policy.id) {
      throw Error('No policy specified');
    }
    const response = await request.get(`https://api.newrelic.com/v2/alerts_location_failure_conditions/policies/${policy.id}.json`, {
      json: true,
      headers: {
        'X-Api-Key': auth,
      },
    });
    const conds = response.location_failure_conditions;
    return conds.filter((condition) => condition.name === CONDITION_NAME);
  } catch (e) {
    console.error('Unable to retrieve conditions:', e.message);
    return [];
  }
}

async function createCondition(auth, policy, monitorId) {
  console.log('Creating condition in alert policy');
  try {
    if (!policy || !policy.id) {
      throw Error('No policy specified');
    }
    await request.post(`https://api.newrelic.com/v2/alerts_location_failure_conditions/policies/${policy.id}.json`, {
      json: true,
      headers: {
        'X-Api-Key': auth,
      },
      body: {
        location_failure_condition: {
          name: CONDITION_NAME,
          enabled: true,
          entities: [
            monitorId,
          ],
          terms: [{
            threshold: CONDITION_THRESHOLD,
            priority: CONDITION_PRIORITY,
          }],
        },
      },
    });
  } catch (e) {
    console.error('Unable to add alert policy condition:', e.message);
  }
}

async function updateCondition(auth, condition, monitorId) {
  try {
    if (condition.entities && condition.entities.includes(monitorId)) {
      console.log('Alert policy condition is up to date');
    } else {
      console.log('Updating alert policy condition');
      condition.entities.push(monitorId);
      await request.put(`https://api.newrelic.com/v2/alerts_location_failure_conditions/${condition.id}.json`, {
        json: true,
        headers: {
          'X-Api-Key': auth,
        },
        body: {
          location_failure_condition: condition,
        },
      });
    }
  } catch (e) {
    console.error('Unable to update alert policy condition', e.message);
  }
}

async function getPolicyInfo(auth, policyName) {
  try {
    const response = await request.get('https://api.newrelic.com/v2/alerts_policies.json', {
      headers: {
        'X-Api-Key': auth,
      },
      json: true,
    });

    let policy;
    const allPolicies = response.policies
      ? response.policies.map(({ id, name }) => ({ id, name }))
      : [];
    if (policyName) {
      [policy] = allPolicies.filter((pol) => pol.name === policyName);
    }
    return {
      policy,
      allPolicies,
    };
  } catch (e) {
    console.error('Unable to retrieve alert policies:', e.message);
    return {};
  }
}

async function createPolicy(auth, name) {
  console.log('Creating alert policy', name);
  try {
    const response = await request.post('https://api.newrelic.com/v2/alerts_policies.json', {
      json: true,
      headers: {
        'X-Api-Key': auth,
      },
      body: {
        policy: {
          name,
          incident_preference: INCIDENT_PREFERENCE,
        },
      },
    });
    return response.policy;
  } catch (e) {
    console.error('Alert policy creation failed:', e.message);
    process.exit(1);
  }
  return null;
}

async function updatePolicy(auth, policy, groupPolicy, monitorId, channelId, policies, incubator) {
  if (channelId) {
    // add notification channel
    console.log('Linking notification channel to alert policy', policy.name);
    try {
      await request.put('https://api.newrelic.com/v2/alerts_policy_channels.json', {
        headers: {
          'X-Api-Key': auth,
        },
        form: {
          channel_ids: channelId,
          policy_id: policy.id,
        },
      });
    } catch (e) {
      console.error('Unable to add notification channel to alert policy', e.message);
    }
  }

  const [condition] = await getConditions(auth, policy);
  if (!condition) {
    // add condition
    await createCondition(auth, policy, monitorId);
  } else {
    // update condition
    await updateCondition(auth, condition, monitorId);
  }

  if (!incubator && groupPolicy) {
    const [group] = policies ? policies.filter((pol) => pol.name === groupPolicy) : [];
    if (group && group.id !== policy.id) {
      console.log('Verifying group alert policy', group.name);
      await updatePolicy(auth, group, null, monitorId);
    } else {
      console.error(`Group alert policy ${groupPolicy} not found`);
    }
  }
}

async function purgeIncubatorPolicy(auth, name, allPolicies) {
  const incubatorPolicyName = getIncubatorName(name);
  const [incubatorPolicy] = allPolicies
    ? allPolicies.filter((policy) => policy.name === incubatorPolicyName)
    : [];
  if (incubatorPolicy) {
    console.log('Removing incubator alert policy', incubatorPolicy.name);
    try {
      await request.delete(`https://api.newrelic.com/v2/alerts_policies/${incubatorPolicy.id}.json`, {
        headers: {
          'X-Api-Key': auth,
        },
      });
    } catch (e) {
      console.error('Unable to remove incubator alert policy', e.message);
    }
  }
}

async function updateOrCreatePolicies(auth, name, groupPolicy, monitorId, channelId, incubator) {
  const policyName = incubator ? getIncubatorName(name) : name;
  const info = await getPolicyInfo(auth, policyName);
  const { allPolicies } = info;
  let { policy } = info;

  if (!policy) {
    // create policy
    policy = await createPolicy(auth, policyName);
  }
  // update policy
  await updatePolicy(auth, policy, groupPolicy, monitorId, channelId, allPolicies, incubator);

  if (!incubator) {
    // TODO: delete same name incubator policy
    await purgeIncubatorPolicy(auth, name, allPolicies);
  }
}

module.exports = {
  updateOrCreatePolicies,
  reuseOrCreateChannel,
  CHANNEL_TYPE,
  INCIDENT_PREFERENCE,
  CONDITION_NAME,
  CONDITION_PRIORITY,
  CONDITION_THRESHOLD,
};
