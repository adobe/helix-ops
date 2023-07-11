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
import EventEmitter from 'events';
import nock from 'nock';

/**
 * Abstract API simulator.
 */
export default class AbstractAPI extends EventEmitter {
  /**
   * Creates a new API simulator.
   * @param {object} opts An object containing configuration options:
   * <ul>
   *  <li>{boolean} success <code>true</code> (default) to simulate normal operation,
   *                        <code>false</code> to simulate API failure</li>
   * </ul>
   */
  constructor(opts) {
    super();
    this.errorCode = 500;
    this.errorMsg = `{"status":${this.errorCode},"message":"Internal Server Error"}`;
    this.cfg = {
      success: true,
      ...opts,
    };
  }

  /**
   * Returns HTTP status code based on configuration.
   * @param {number} code The code to use in case of success
   * @return {number} The status code
   */
  status(code) {
    return this.cfg.success ? code : this.errorCode;
  }

  /**
   * Returns HTTP response body based on configuration.
   * @param {string} response The response to use in case of success
   * @return {string} The response body
   */
  reply(response) {
    const resp = this.cfg.success
      ? response
      : this.errorMsg;
    return resp;
  }

  /**
   * Starts HTTP request interceptors using "nock".
   * @abstract to be implemented in extending class
   */
  start() {
    if (!nock.isActive()) {
      nock.activate();
    }
    // nock(...)
    return this;
  }

  /**
   * Stops HTTP request interceptors using "nock".
   */
  stop() {
    nock.restore();
    nock.cleanAll();
    return this;
  }
}
