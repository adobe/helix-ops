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
/* eslint-disable no-console, no-param-reassign, function-paren-newline */
/* global $http $util $secure */
// This is an autogenerated file, changes will be overwritten

const assert = require('assert');

const url = '$$$URL$$$';
const { host, pathname } = new URL(url);
const hlx3 = host.endsWith('.amazonaws.com') && pathname.includes('helix3');

const headers = {};
if (hlx3) {
  // helix 3 actions deployed in aws require api token
  headers['x-edge-authorization'] = `token ${$secure.HELIX3_API_TOKEN}`;
}

// $http -> https://github.com/request/request
$http.get({
  url,
  headers,
},
// callback
(err, response, body) => {
  if (err) {
    assert.fail(new Error(err));
  }
  let status = {};
  try {
    status = JSON.parse(body);
  } catch (e) {
    assert.fail(new Error(`Error parsing body of ${url}: ${body}`));
  }
  Object.keys(status).forEach((v) => {
    if (['status', 'error', 'process', 'version', 'response_time'].indexOf(v) === -1) {
      $util.insights.set(v, parseInt(status[v], 10));
    }
  });
  $util.insights.set('status', status.status);
  ['x-request-id', 'x-version'].forEach((h) => {
    $util.insights.set(h, response.headers[h]);
  });
  if (status.error) {
    $util.insights.set('errorStatus', status.error.statuscode);
    $util.insights.set('errorURL', status.error.url);
  }
  if (status.status !== 'OK') {
    console.error(body);
  }

  assert.equal(status.status, 'OK', `Expected an OK health check status, got: ${status.status}`);
  assert.equal(response.statusCode, 200, `Expected a 200 OK response, got ${response.statusCode}`);
});
