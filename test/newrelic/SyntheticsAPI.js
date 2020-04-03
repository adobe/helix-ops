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
 * Simulates New Relic Synthetics API v3:
 * https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api
 */
class SyntheticsAPI extends AbstractAPI {
  /**
   * Creates a new API simulation.
   * @param {object} opts An object containing options:
   * <ul>
   *  <li>{object}  monitor The monitor object to use</li>
   *  <li>{boolean} new     <code>true</code> (default) to create a new monitor,
   *                        <code>false</code> to update an existing monitor</li>
   *  <li>{boolean} success <code>true</code> (default) to simulate normal operation,
   *                        <code>false</code> to simulate API failure</li>
   * </ul>
   */
  constructor(opts) {
    super(opts);
    this.cfg = {
      ...this.cfg,
      monitor: {
        id: Date.now(),
        name: 'Test Monitor',
      },
      ...opts,
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon GET request to get all monitors:
   * https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#get-all-monitors
   * Fires event #EVT_GET_MONITORS with URI and request body
   */
  getMonitors() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(SyntheticsAPI.GET_MONITORS, uri, req);
      const resp = JSON.stringify(ctx.cfg.new
        ? { count: 0, monitors: [] }
        : { count: 1, monitors: [ctx.cfg.monitor] });
      // next time, return existing monitor
      ctx.cfg.new = false;
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon POST request to create new monitor:
   * https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#create-monitor
   * Fires event #EVT_CREATE_MONITOR with URI and request body
   */
  createMonitor() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(SyntheticsAPI.CREATE_MONITOR, uri, req);
      const resp = JSON.stringify(ctx.cfg.monitor);
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon PATCH request to update monitor locations:
   * https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#patch-monitor
   * Fires #EVT_UPDATE_LOCATIONS with URI and request body
   */
  updateLocations() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(SyntheticsAPI.UPDATE_LOCATIONS, uri, req);
      const resp = JSON.stringify(ctx.cfg.monitor);
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Simulates reply from Synthetics API v3 upon PUT request to update monitor script:
   * https://docs.newrelic.com/docs/apis/synthetics-rest-api/monitor-examples/manage-synthetics-monitors-rest-api#update-monitor
   * Fires event #EVT_UPDATE_SCRIPT with URI and request body
   */
  updateScript() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(SyntheticsAPI.UPDATE_SCRIPT, uri, req);
      const resp = JSON.stringify(ctx.cfg.monitor);
      return ctx.reply(uri, req, resp);
    };
  }

  /**
   * Sets up HTTP request interceptors using "nock".
   */
  start() {
    nock('https://synthetics.newrelic.com')
      // Getting monitors
      .get(/\/synthetics\/api\/v3\/monitors.*/)
      .reply(this.status(200), this.getMonitors())
      // Creating monitor
      .post('/synthetics/api/v3/monitors')
      .reply(this.status(201), this.createMonitor())
      // Getting monitors again
      .get(/\/synthetics\/api\/v3\/monitors.*/)
      .reply(this.status(200), this.getMonitors())
      // // Updating monitor locations
      .patch(`/synthetics/api/v3/monitors/${this.cfg.monitor.id}`)
      .reply(this.status(204), this.updateLocations())
      // // Updating monitor script
      .put(`/synthetics/api/v3/monitors/${this.cfg.monitor.id}/script`)
      .reply(this.status(204), this.updateScript());
  }
}

// events
SyntheticsAPI.GET_MONITORS = 'getMonitors';
SyntheticsAPI.CREATE_MONITOR = 'createMonitor';
SyntheticsAPI.UPDATE_LOCATIONS = 'updateLocations';
SyntheticsAPI.UPDATE_SCRIPT = 'updateScript';

module.exports = SyntheticsAPI;
