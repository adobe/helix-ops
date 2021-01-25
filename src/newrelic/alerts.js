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

const fetchAPI = require('@adobe/helix-fetch');
const { getIncubatorName } = require('../utils');

const { fetch } = process.env.HELIX_FETCH_FORCE_HTTP1
  ? fetchAPI.context({ httpsProtocols: ['http1'] })
  : fetchAPI;

const CHANNEL_TYPE = 'email';
const INCIDENT_PREFERENCE = 'PER_POLICY';
const CONDITION_NAME = 'Location Failure';
const CONDITION_PRIORITY = 'critical';
const CONDITION_THRESHOLD = 2;

/* eslint-disable no-console */

async function getChannelInfo(auth, channelName, email) {
  try {
    const resp = await fetch('https://api.newrelic.com/v2/alerts_channels.json', {
      headers: {
        'X-Api-Key': auth,
      },
    });
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const body = await resp.json();
    const allChannels = body.channels || [];
    const channel = allChannels.find((c) => c.type === CHANNEL_TYPE
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
  const incubatorPolicy = allPolicies ? allPolicies.find((policy) => policy.name === name) : null;
  if (incubatorPolicy) {
    console.log('Removing incubator notification channel', incubatorPolicy.name);
    try {
      const resp = await fetch(`https://api.newrelic.com/v2/alerts_channels/${incubatorPolicy.id}.json`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': auth,
        },
      });
      const body = await resp.text();
      if (!resp.ok) {
        throw new Error(body);
      }
    } catch (e) {
      console.error('Unable to remove incubator notification channel', e.message);
    }
  }
}

async function reuseOrCreateChannel(auth, names, emails, incubator) {
  const channels = [];
  await Promise.all(names.map(async (name, i) => {
    const channelName = incubator ? getIncubatorName(name) : name;
    const email = emails[i];
    const info = await getChannelInfo(auth, channelName, email);
    const { allChannels } = info;
    let { channel } = info;

    if (channel) {
      console.log(`Reusing notification channel ${channel.name}`);
    } else {
      console.log('Creating notification channel', channelName);

      try {
        const resp = await fetch('https://api.newrelic.com/v2/alerts_channels.json', {
          method: 'POST',
          headers: {
            'X-Api-Key': auth,
          },
          json: {
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
        if (!resp.ok) {
          throw new Error(await resp.text());
        }
        const body = await resp.json();
        [channel] = body.channels || [];

        if (!incubator) {
          // delete same name incubator channel
          purgeIncubatorChannel(auth, getIncubatorName(name), allChannels);
        }
      } catch (e) {
        console.error('Notification channel creation failed:', e.message);
        process.exit(1);
      }
    }
    channels.push(channel);
  }));
  // return channel ids ordered by names
  return names
    .map((name) => channels.find((ch) => ch.name === (incubator ? getIncubatorName(name) : name)))
    .filter((channel) => !!channel)
    .map((channel) => channel.id);
}

async function getConditions(auth, policy) {
  if (!policy || !policy.id) return [];
  try {
    const resp = await fetch(`https://api.newrelic.com/v2/alerts_location_failure_conditions/policies/${policy.id}.json`, {
      headers: {
        'X-Api-Key': auth,
      },
    });
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const body = await resp.json();
    const conds = body.location_failure_conditions || [];
    return conds.filter((condition) => condition.name === CONDITION_NAME);
  } catch (e) {
    console.error('Unable to retrieve conditions:', e.message);
    return [];
  }
}

async function createCondition(auth, policy, monitorId) {
  if (!policy || !policy.id) return;
  console.log('Creating condition in alert policy');
  try {
    const resp = await fetch(`https://api.newrelic.com/v2/alerts_location_failure_conditions/policies/${policy.id}.json`, {
      method: 'POST',
      headers: {
        'X-Api-Key': auth,
      },
      json: {
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
    const body = await resp.text();
    if (!resp.ok) {
      throw new Error(body);
    }
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
      const resp = await fetch(`https://api.newrelic.com/v2/alerts_location_failure_conditions/${condition.id}.json`, {
        method: 'PUT',
        headers: {
          'X-Api-Key': auth,
        },
        json: {
          location_failure_condition: condition,
        },
      });
      const body = await resp.text();
      if (!resp.ok) {
        throw new Error(body);
      }
    }
  } catch (e) {
    console.error('Unable to update alert policy condition', e.message);
  }
}

async function getPolicyInfo(auth, policyName) {
  try {
    const resp = await fetch('https://api.newrelic.com/v2/alerts_policies.json', {
      headers: {
        'X-Api-Key': auth,
      },
    });
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const body = await resp.json();
    const allPolicies = body.policies
      ? body.policies.map(({ id, name }) => ({ id, name }))
      : [];
    return {
      policy: policyName ? allPolicies.find((pol) => pol.name === policyName) : null,
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
    const resp = await fetch('https://api.newrelic.com/v2/alerts_policies.json', {
      method: 'POST',
      headers: {
        'X-Api-Key': auth,
      },
      json: {
        policy: {
          name,
          incident_preference: INCIDENT_PREFERENCE,
        },
      },
    });
    if (!resp.ok) {
      throw new Error(await resp.text());
    }
    const body = await resp.json();
    return body.policy;
  } catch (e) {
    console.error('Alert policy creation failed:', e.message);
    process.exit(1);
  }
  return null;
}

async function updatePolicy(auth, policy, groupPolicy, monitorId, channelId, policies, incubator) {
  if (channelId && policy) {
    // add notification channel
    console.log('Linking notification channel to alert policy', policy.name);
    try {
      const resp = await fetch('https://api.newrelic.com/v2/alerts_policy_channels.json', {
        method: 'PUT',
        headers: {
          'X-Api-Key': auth,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          channel_ids: channelId,
          policy_id: policy.id,
        }).toString(),
      });
      const body = await resp.text();
      if (!resp.ok) {
        throw new Error(body);
      }
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
    const group = policies ? policies.find((pol) => pol.name === groupPolicy) : null;
    if (group) {
      // make sure policy and group policy are not the same
      if (policy && policy.id && policy.id === group.id) {
        console.error('Group alert policy and alert policy must differ');
        return;
      }
      console.log('Verifying group alert policy', group.name);
      await updatePolicy(auth, group, null, monitorId);
    } else {
      console.error(`Group alert policy ${groupPolicy} not found`);
    }
  }
}

async function purgeIncubatorPolicy(auth, name, allPolicies) {
  const incubatorPolicyName = getIncubatorName(name);
  const incubatorPolicy = allPolicies
    ? allPolicies.find((policy) => policy.name === incubatorPolicyName)
    : null;
  if (incubatorPolicy) {
    console.log('Removing incubator alert policy', incubatorPolicy.name);
    try {
      const resp = await fetch(`https://api.newrelic.com/v2/alerts_policies/${incubatorPolicy.id}.json`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': auth,
        },
      });
      const body = await resp.text();
      if (!resp.ok) {
        throw new Error(body);
      }
    } catch (e) {
      console.error('Unable to remove incubator alert policy', e.message);
    }
  }
}

async function updateOrCreatePolicies(auth, names, groupPolicy, monitorIds, channelIds, incubator) {
  await Promise.all(names.map(async (name, i) => {
    const channelId = channelIds ? channelIds[i] : null;
    const monitorId = monitorIds[i];
    const policyName = incubator ? getIncubatorName(name) : name;
    const info = await getPolicyInfo(auth, policyName);
    const { allPolicies } = info;
    let { policy } = info;

    if (channelId && !policy) {
      // create policy
      policy = await createPolicy(auth, policyName);
    }
    // update policy
    await updatePolicy(auth, policy, groupPolicy, monitorId, channelId, allPolicies, incubator);

    if (!incubator) {
      // TODO: delete same name incubator policy
      await purgeIncubatorPolicy(auth, name, allPolicies);
    }
    return policy;
  }));
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
