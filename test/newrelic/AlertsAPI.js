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
// const nock = require('nock');
const AbstractAPI = require('../AbstractAPI');

/**
 * New Relic Alerts API v2 simulator:
 * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts
 */
class AlertsAPI extends AbstractAPI {
  /**
   * Creates a new API simulation.
   * @param {object} opts An object containing options:
   * <ul>
   *  <li>{object}  channel   The channel object to use</li>
   *  <li>{object}  policy    The policy object to use</li>
   *  <li>{object}  condition The condition object to use</li>
   *  <li>{boolean} new       <code>true</code> (default) to create a new alerting setup,
   *                          <code>false</code> to update an existing alerting setup</li>
   *  <li>{boolean} success   <code>true</code> (default) to simulate normal operation,
   *                          <code>false</code> to simulate API failure</li>
   * </ul>
   */
  constructor(opts) {
    super(opts);
    this.cfg = {
      ...this.cfg,
      channel: {
        id: Date.now(),
        name: 'Test Channel',
      },
      policy: {
        id: Date.now(),
        name: 'Test Policy',
      },
      condition: {
        id: Date.now(),
        name: 'Test Condition',
      },
      ...opts,
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon GET request to get all notification channels:
   * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels
   * Fires event #EVT_GET_CHANNELS with URI and request body
   */
  getChannels() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(AlertsAPI.GET_CHANNELS, uri, req);
      const resp = JSON.stringify(ctx.cfg.new
        ? { channels: [] }
        : { channels: [ctx.cfg.channel] });
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon POST request to create new notification channel:
   * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels
   * Fires event #EVT_CREATE_CHANNEL with URI and request body
   */
  createChannel() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(AlertsAPI.CREATE_CHANNEL, uri, req);
      const resp = JSON.stringify({ channel: ctx.cfg.channel });
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon GET request to get all alert policies:
   * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies
   * Fires event #EVT_GET_POLICIES with URI and request body
   */
  getPolicies() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(AlertsAPI.GET_POLICIES, uri, req);
      const resp = JSON.stringify(ctx.cfg.new
        ? { policies: [] }
        : { policies: [ctx.cfg.policy] });
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon POST request to create new alert policy:
   * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies
   * Fires #EVT_CREATE_POLICY with URI and request body
   */
  createPolicy() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(AlertsAPI.CREATE_POLICY, uri, req);
      const resp = JSON.stringify({ policy: ctx.cfg.policy });
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon PUT request to update alert policy:
   * https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies
   * Fires #EVT_CREATE_POLICY with URI and request body
   */
  updatePolicy() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(AlertsAPI.UPDATE_POLICY, uri, req);
      const resp = JSON.stringify({ policy: ctx.cfg.policy });
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Sets up HTTP request interceptors using "nock".
   */
  // eslint-disable-next-line class-methods-use-this
  start() {
    /*
    nock('https://api.newrelic.com')
      // Getting channels
      .get('/v2/alerts_channels.json')
      .reply(this.status(200), this.getChannels())
      // Creating notification channel
      .post('/v2/alerts_channels.json')
      .reply(this.status(201), this.createChannel())
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
  */
  }
}
// events
AlertsAPI.GET_CHANNELS = 'getChannels';
AlertsAPI.CREATE_CHANNEL = 'createChannel';
AlertsAPI.GET_POLICIES = 'getPolicies';
AlertsAPI.CREATE_POLICY = 'createPolicy';
AlertsAPI.UPDATE_POLICY = 'updatePolicy';
AlertsAPI.GET_CONDITIONS = 'getConditions';
AlertsAPI.CREATE_CONDITION = 'createCondition';
AlertsAPI.UPDATE_CONDITION = 'updateCondition';

module.exports = AlertsAPI;
