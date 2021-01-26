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
const nock = require('nock');
const AbstractAPI = require('../AbstractAPI');

/**
 * Simulates the New Relic APIs
 * <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api"> Synthetics v3</a> and
 * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts">Alerts v2</a>.
 */
class NewRelicAPI extends AbstractAPI {
  /**
   * Creates a new API simulation.
   * @param {object} opts An object containing options:
   * <ul>
   *  <li>{object}  monitor      The <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/payload-attributes-synthetics-rest-api#api-attributes">monitor</a> object to use</li>
   *  <li>{object}  channel      The <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels-create">channel>/a> object to use</li>
   *  <li>{object}  policy       The <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-create">policy</a> object to use</li>
   *  <li>{object}  groupPolicy  The group <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-create">policy</a> object to use</li>
   *  <li>{object}  condition    The <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#conditions-create">condition</a> object to use</li>
   *  <li>{object}  incubatorChannel The optional incubator <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels-create">channel>/a> object to use</li>
   *  <li>{object}  incubatorPolicy  The optional incubator <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-create">policy</a> object to use</li>
   *  <li>{boolean} new          <code>true</code> (default) to create a new monitoring setup,
   *                             <code>false</code> to update an existing one</li>
   *  <li>{boolean} incubator    <code>true</code> to create an incubator monitoring setup,
   *                             <code>false</code> (default) to create a production one</li>
   * </ul>
   */
  constructor(opts) {
    super(opts);
    this.cfg = {
      ...this.cfg,
      new: true,
      incubator: false,
      ...opts,
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon GET request to
   * <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#get-all-monitors">
   *  get all monitors
   * </a>. Fires event #EVT_GET_MONITORS with URI and request body.
   */
  getMonitors() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.GET_MONITORS, uri, req);
      const resp = { count: 0, monitors: [] };
      if (!ctx.cfg.new || ctx.monitorCreated) {
        resp.monitors.push(ctx.cfg.monitor);
        if (ctx.cfg.aws && ctx.cfg.awsMonitor) {
          resp.monitors.push(ctx.cfg.awsMonitor);
        }
        resp.count = resp.monitors.length;
      }
      return ctx.reply(JSON.stringify(resp));
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon POST request to
   * <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#create-monitor">
   *  create new monitor
   * </a>. Fires event #EVT_CREATE_MONITOR with URI and request body.
   */
  createMonitor() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.CREATE_MONITOR, uri, req);
      const resp = JSON.stringify(ctx.cfg.monitor);
      ctx.monitorCreated = true;
      return ctx.reply(resp);
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon PATCH request to
   * <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#patch-monitor">
   *  update monitor locations
   * </a>. Fires #EVT_UPDATE_LOCATIONS with URI and request body.
   */
  updateLocations() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.UPDATE_LOCATIONS, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon PUT request to
   * <a href="https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#update-monitor">
   *  update monitor script
   * </a>. Fires event #EVT_UPDATE_SCRIPT with URI and request body.
   */
  updateScript() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.UPDATE_SCRIPT, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon GET request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels-list">
   *  get all notification channels
   * </a>. Fires event #EVT_GET_CHANNELS with URI and request body.
   */
  getChannels() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.GET_CHANNELS, uri, req);
      const channels = [];
      if (!ctx.cfg.new || ctx.channelCreated) {
        // there is an existing notification channel
        channels.push(ctx.cfg.channel);
        if (ctx.cfg.aws && ctx.cfg.awsChannel) {
          channels.push(ctx.cfg.awsChannel);
        }
        if (ctx.cfg.incubator && ctx.cfg.incubatorChannel) {
          // there is an existing incubator notification channel
          channels.push(ctx.cfg.incubatorChannel);
        }
      }
      if (!ctx.cfg.incubator && ctx.cfg.incubatorChannel) {
        // new setup, but there is an existing incubator notification channel
        channels.push(ctx.cfg.incubatorChannel);
      }
      return ctx.reply(JSON.stringify({ channels }));
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon POST request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels-create">
   *  create new notification channel
   * </a>. Fires event #EVT_CREATE_CHANNEL with URI and request body.
   */
  createChannel() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.CREATE_CHANNEL, uri, req);
      const channel = ctx.cfg.incubator && ctx.cfg.incubatorChannel
        ? ctx.cfg.incubatorChannel
        : ctx.cfg.channel;
      const resp = JSON.stringify({ channels: [channel] });
      ctx.channelCreated = true;
      return ctx.reply(resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon DELETE request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#channels-delete">
   *  delete notification channel
   * </a>. Fires event #EVT_DELETE_CHANNEL with URI and request body.
   */
  deleteChannel() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.DELETE_CHANNEL, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon GET request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-list">
   *  get all alert policies
   * </a>. Fires event #EVT_GET_POLICIES with URI and request body.
   */
  getPolicies() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.GET_POLICIES, uri, req);
      const policies = [ctx.cfg.groupPolicy];
      if (!ctx.cfg.new || ctx.policyCreated) {
        // there is an existing alert policy
        policies.push(ctx.cfg.policy);
        if (ctx.cfg.aws && ctx.cfg.awsPolicy) {
          policies.push(ctx.cfg.awsPolicy);
        }
        if (ctx.cfg.incubator && ctx.cfg.incubatorPolicy) {
          // there is an existing incubator alert policy
          policies.push(ctx.cfg.incubatorPolicy);
        }
      }
      if (!ctx.cfg.incubator && ctx.cfg.incubatorPolicy) {
        // new setup, but there is an existing incubator alert policy
        policies.push(ctx.cfg.incubatorPolicy);
      }
      return ctx.reply(JSON.stringify({ policies }));
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon POST request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-create">
   *  create new alert policy
   * </a>. Fires #EVT_CREATE_POLICY with URI and request body.
   */
  createPolicy() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.CREATE_POLICY, uri, req);
      const policy = ctx.cfg.incubator && ctx.cfg.incubatorPolicy
        ? ctx.cfg.incubatorPolicy
        : ctx.cfg.policy;
      const resp = JSON.stringify({ policy });
      ctx.policyCreated = true;
      return ctx.reply(resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon PUT request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-update">
   *  update alert policy
   * </a>. Fires #EVT_UPDATE_POLICY with URI and request body.
   */
  updatePolicy() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.UPDATE_POLICY, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon DELETE request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-delete">
   *  delete alert policy
   * </a>. Fires event #EVT_DELETE_POLICY with URI and request body.
   */
  deletePolicy() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.DELETE_POLICY, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon GET request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#synthetics-conditions-list">
   *  get all location failure conditions in alert policy
   * </a>. Fires event #EVT_GET_CONDITIONS with URI and request body.
   */
  getConditions() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.GET_CONDITIONS, uri, req);
      const conditions = [];
      if (ctx.cfg.new) {
        // new alert policy has no condition yet
        if (uri.includes(ctx.cfg.groupPolicy.id)) {
          // group alert policy has condition, but not linked to monitor yet
          ctx.cfg.condition.entities = [];
          conditions.push(ctx.cfg.condition);
        }
      } else {
        // existing alert policies have conditions linked to monitor
        ctx.cfg.condition.entities = [ctx.cfg.monitor.id];
        if (ctx.cfg.aws && ctx.cfg.awsMonitor) {
          ctx.cfg.condition.entities.push(ctx.cfg.awsMonitor.id);
        }
        conditions.push(ctx.cfg.condition);
      }
      const resp = JSON.stringify({ location_failure_conditions: conditions });
      return ctx.reply(resp);
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon POST request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#synthetics-conditions-create">
   *  create new condition in alert policy
   * </a>. Fires #EVT_CREATE_CONDITION with URI and request body.
   */
  createCondition() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.CREATE_CONDITION, uri, req);
      return ctx.reply(JSON.stringify({ location_failure_condition: ctx.cfg.condition }));
    };
  }

  /**
   * Simulates reply from Alerts API v2 upon PUT request to
   * <a href="https://docs.newrelic.com/docs/alerts/rest-api-alerts/new-relic-alerts-rest-api/rest-api-calls-new-relic-alerts#policies-update">
   *  update condition in alert policy
   * </a>. Fires #EVT_UPDATE_CONDITION with URI and request body.
   */
  updateCondition() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(NewRelicAPI.UPDATE_CONDITION, uri, req);
      return ctx.reply('');
    };
  }

  /**
   * Starts HTTP request interceptors using "nock".
   */
  start() {
    if (!nock.isActive()) {
      nock.activate();
    }
    // Synthetics v3 API
    nock('https://synthetics.newrelic.com')
      // Getting monitors
      .get(/\/synthetics\/api\/v3\/monitors.*/)
      .twice()
      .reply(this.status(200), this.getMonitors())
      // Creating monitor
      .post('/synthetics/api/v3/monitors')
      .twice()
      .reply(this.status(201), this.createMonitor())
      // Getting monitors again
      .get(/\/synthetics\/api\/v3\/monitors.*/)
      .twice()
      .reply(this.status(200), this.getMonitors())
      // Updating monitor locations
      .patch(/\/synthetics\/api\/v3\/monitors\/.*/)
      .twice()
      .reply(this.status(204), this.updateLocations())
      // // Updating monitor script
      .put(/\/synthetics\/api\/v3\/monitors\/.*\/script/)
      .twice()
      .reply(this.status(204), this.updateScript());

    // Alerts v2 API
    nock('https://api.newrelic.com')
      // Getting channels
      .get('/v2/alerts_channels.json')
      .twice()
      .reply(this.status(200), this.getChannels())
      // Creating notification channel
      .post('/v2/alerts_channels.json')
      .twice()
      .reply(this.status(201), this.createChannel())
      // Deleting notification channel
      .delete(/\/v2\/alerts_channels\/.*/)
      .twice()
      .reply(this.status(200), this.deleteChannel())
      // Getting alert policies
      .get('/v2/alerts_policies.json')
      .twice()
      .reply(this.status(200), this.getPolicies())
      // Creating alert policy
      .post('/v2/alerts_policies.json')
      .twice()
      .reply(this.status(201), this.createPolicy())
      // Linking notification channel to alert policy
      .put('/v2/alerts_policy_channels.json')
      .twice()
      .reply(this.status(204), this.updatePolicy())
      // Getting conditions in alert policy
      .get(/\/v2\/alerts_location_failure_conditions\/policies\/.*/)
      .twice()
      .reply(this.status(200), this.getConditions())
      // Creating condition in alert policy
      .post(/\/v2\/alerts_location_failure_conditions\/policies\/.*/)
      .twice()
      .reply(this.status(201), this.createCondition())
      // Updating condition in alert policy
      .put(`/v2/alerts_location_failure_conditions/${this.cfg.condition.id}.json`)
      .twice()
      .reply(this.status(200), this.updateCondition())
      // Getting conditions in group alert policy
      .get(`/v2/alerts_location_failure_conditions/policies/${this.cfg.groupPolicy.id}.json`)
      .twice()
      .reply(this.status(200), this.getConditions())
      // Creating condition in group alert policy
      .post(`/v2/alerts_location_failure_conditions/policies/${this.cfg.groupPolicy.id}.json`)
      .twice()
      .reply(this.status(201), this.createCondition())
      // Updating condition in group alert policy
      .put(`/v2/alerts_location_failure_conditions/${this.cfg.condition.id}.json`)
      .twice()
      .reply(this.status(200), this.updateCondition())
      // Deleting alert policy
      .delete(/\/v2\/alerts_policies\/.*/)
      .twice()
      .reply(this.status(200), this.deletePolicy());
    return this;
  }
}

// events
NewRelicAPI.GET_MONITORS = 'getMonitors';
NewRelicAPI.CREATE_MONITOR = 'createMonitor';
NewRelicAPI.UPDATE_LOCATIONS = 'updateLocations';
NewRelicAPI.UPDATE_SCRIPT = 'updateScript';
NewRelicAPI.GET_CHANNELS = 'getChannels';
NewRelicAPI.CREATE_CHANNEL = 'createChannel';
NewRelicAPI.DELETE_CHANNEL = 'deleteChannel';
NewRelicAPI.GET_POLICIES = 'getPolicies';
NewRelicAPI.CREATE_POLICY = 'createPolicy';
NewRelicAPI.DELETE_POLICY = 'deletePolicy';
NewRelicAPI.UPDATE_POLICY = 'updatePolicy';
NewRelicAPI.GET_CONDITIONS = 'getConditions';
NewRelicAPI.CREATE_CONDITION = 'createCondition';
NewRelicAPI.UPDATE_CONDITION = 'updateCondition';

module.exports = NewRelicAPI;
