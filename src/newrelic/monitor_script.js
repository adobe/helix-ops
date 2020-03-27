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
/* eslint-disable no-console, no-param-reassign */
/* global $http $util $secure */
// This is an autogenerated file, changes will be overwritten

const assert = require('assert');

// $http -> https://github.com/request/request
$http.get('$$$URL$$$',
  // callback
  (err, response, body) => {
    const status = JSON.parse(body);
    Object.keys(status).forEach((v) => {
      if (['status', 'error', 'process', 'version', 'response_time'].indexOf(v) === -1) {
        $util.insights.set(v, parseInt(status[v], 10));
      }
    });
    $util.insights.set('status', status.status);
    ['x-openwhisk-activation-id', 'x-request-id', 'x-version'].forEach((h) => {
      $util.insights.set(h, response.headers[h]);
    });
    if (status.error) {
      $util.insights.set('errorStatus', status.error.statuscode);
      $util.insights.set('errorURL', status.error.url);
    }
    if (status.status !== 'OK') {
      console.error(body);
    }
    // retrieve activation details via OpenWhisk REST API:
    // https://petstore.swagger.io/?url=https://raw.githubusercontent.com/openwhisk/openwhisk/master/core/controller/src/main/resources/apiv1swagger.json#/Activations/getActivationById
    const id = response.headers['x-openwhisk-activation-id'];
    if (id) {
      // $http -> https://github.com/request/request
      $http.get({
        url: `https://adobeioruntime.net/api/v1/namespaces/_/activations/${id}`,
        headers: {
          Authorization: `Basic ${Buffer.from($secure.WSK_AUTH_$$$NS$$$).toString('base64')}`,
        },
        json: true,
      },
      // callback
      (e, resp, activationRecord) => {
        if (e) {
          console.log('Failed to retrieve activation record:', e);
          return;
        }
        if (resp.statusCode !== 200) {
          console.info(`Failed to retrieve activation record: statusCode: ${resp.statusCode},`, resp.body);
          return;
        }

        // since the REST API returned statusCode 200 we can assue that resp.body
        // (i.e. activationRecord) is a valid activation record payload:
        // https://github.com/apache/openwhisk/blob/master/docs/actions.md#understanding-the-activation-record

        // dump the full activation record in the script log
        console.info('Activation record:', JSON.stringify(activationRecord, null, 2));
        // store insights
        $util.insights.set('activation_status_code', activationRecord.statusCode);
        $util.insights.set('activation_duration', activationRecord.duration);
        $util.insights.set('wsk_overhead', activationRecord.duration - status.response_time);
        activationRecord.annotations.filter((ann) => ann.key.toLowerCase().indexOf('time') >= 0).forEach((ann) => {
          $util.insights.set(`activation_${ann.key}`, ann.value);
        });
        // check action response
        const { statusCode: actionStatus } = activationRecord.response.result;
        assert.equal(actionStatus, 200, `Expected a 200 OK web action response, got: ${actionStatus}`);
      });
    }
    assert.equal(status.status, 'OK', `Expected an OK health check status, got: ${status.status}`);
    assert.equal(response.statusCode, 200, `Expected a 200 OK response, got ${response.statusCode}`);
  });
