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
 * Simulates the <a href="https://doers.statuspage.io/api/v1/">Statuspage API v1</a>.
 */
class StatuspageAPI extends AbstractAPI {
  /**
   * Creates a new API simulation.
   * @param {object} opts An object containing options:
   * <ul>
   *  <li>{object}  component          The <a href="https://doers.statuspage.io/api/v1/components/">component</a> object to use</li>
   *  <li>{object}  componentGroup     The <a href="https://doers.statuspage.io/api/v1/component_groups/">component group</a> object to use</li>
   *  <li>{object}  incubatorComponent The incubator <a href="https://doers.statuspage.io/api/v1/components/">component</a> object to use</li>
   *  <li>{boolean} new                <code>true</code> (default) to create a new component,
   *                                   <code>false</code> to update an existing one</li>
   *  <li>{boolean} incubator          <code>true</code> to create an incubator component,
   *                                   <code>false</code> (default) to create a production one</li>
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
   * Simulates reply from Statuspage API v1 upon GET request to
   * <a href="https://doers.statuspage.io/api/v1/components">get all components</a>.
   * Fires event #EVT_GET_COMPONENTS with URI and request body.
   */
  getComponents() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(StatuspageAPI.GET_COMPONENTS, uri, req);
      const comps = [];
      if (!ctx.cfg.new) {
        // there is an existing component
        comps.push(ctx.cfg.component);
        if (ctx.cfg.aws && ctx.cfg.awsComponent) {
          comps.push(ctx.cfg.awsComponent);
        }
      }
      if (ctx.cfg.componentGroup) {
        // component group is also a component
        comps.push(ctx.cfg.componentGroup);
      }
      if (!ctx.cfg.incubator && ctx.cfg.incubatorComponent) {
        // there is an existing incubator component
        comps.push(ctx.cfg.incubatorComponent);
      }
      return ctx.reply(JSON.stringify(comps));
    };
  }

  /**
   * Simulates reply from Statuspage API v1 upon POST request to
   * <a href="https://doers.statuspage.io/api/v1/components">create new component</a>.
   * Fires event #EVT_CREATE_COMPONENT with URI and request body.
   */
  createComponent() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(StatuspageAPI.CREATE_COMPONENT, uri, req);
      const comp = ctx.cfg.incubator && ctx.cfg.incubatorComponent
        ? ctx.cfg.incubatorComponent
        : ctx.cfg.component;
      return ctx.reply(JSON.stringify(comp));
    };
  }

  /**
   * Simulates reply from Statuspage API v1 upon PATCH request to
   * <a href="https://doers.statuspage.io/api/v1/components">update component</a>.
   * Fires event #EVT_UPDATE_COMPONENT with URI and request body.
   */
  updateComponent() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(StatuspageAPI.UPDATE_COMPONENT, uri, req);
      const comp = ctx.cfg.incubator && ctx.cfg.incubatorComponent
        ? ctx.cfg.incubatorComponent
        : ctx.cfg.component;
      return ctx.reply(JSON.stringify(comp));
    };
  }

  /**
   * Simulates reply from Statuspage API v1 upon DELETE request to
   * <a href="https://doers.statuspage.io/api/v1/components">delete component</a>.
   * Fires event #EVT_DELETE_COMPONENT with URI and request body.
   */
  deleteComponent() {
    const ctx = this;
    return (uri, req) => {
      ctx.emit(StatuspageAPI.DELETE_COMPONENT, uri, req);
      return ctx.reply('{}');
    };
  }

  /**
   * Starts HTTP request interceptors using "nock".
   */
  start() {
    if (!nock.isActive()) {
      nock.activate();
    }
    nock('https://api.statuspage.io')
      // Getting list of all components
      .get(/\/v1\/pages\/.*\/components/)
      .twice()
      .reply(this.status(200), this.getComponents())
      // Creating new component
      .post(/\/v1\/pages\/.*\/components/)
      .twice()
      .reply(this.status(201), this.createComponent())
      // Updating component
      .patch(/\/v1\/pages\/.*\/components\/.*/)
      .twice()
      .reply(this.status(200), this.updateComponent())
      // Getting list of all components from incubator page
      .get(/\/v1\/pages\/.*\/components/)
      .twice()
      .reply(this.status(200), this.getComponents())
      // Deleting component
      .delete(/\/v1\/pages\/.*\/components\/.*/)
      .twice()
      .reply(this.status(204), this.deleteComponent());
    return this;
  }
}

// events
StatuspageAPI.GET_COMPONENTS = 'getComponents';
StatuspageAPI.CREATE_COMPONENT = 'createComponent';
StatuspageAPI.UPDATE_COMPONENT = 'updateComponent';
StatuspageAPI.DELETE_COMPONENT = 'deleteComponent';

module.exports = StatuspageAPI;
