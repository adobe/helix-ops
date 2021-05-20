#!/usr/bin/env node
/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const fs = require('fs');
const shell = require('shelljs');

const p = process.argv[2] ? JSON.parse(process.argv[2]) : null;

if (!p) {
  console.log('Error: 1st argument must be a JSON string with config parameters');
  process.exit(1);
}

// handle booleans
Object.keys(p).forEach((k) => {
  if (k === 'true') {
    p[k] = true;
  } else if (k === 'false') {
    p[k] = false;
  }
});

const clouds = [];
const validTargets = ['universal', 'aws', 'adobeio'];
if (!p.targets && p.aws) {
  // backward compatibility
  p.targets = 'universal, aws, adobeio';
}
if (p.targets) {
  // extract clouds
  p.targets.split(',')
    .map((cloud) => cloud.trim())
    .filter((cloud) => validTargets.includes(cloud))
    .forEach((cloud) => clouds.push(cloud.trim()));
}

// --- statuspage automation -------------------------------------------------
const spCloudSuffix = {
  universal: 'Universal',
  aws: 'AWS',
  adobeio: 'Adobe I/O Runtime',
};

let spEmail = '';
if (p.spName || p.spGroup) {
  const spNames = [];
  if (p.spName) {
    // add component name(s)
    spNames.push(p.spName);
  } else {
    clouds.forEach((cloud) => {
      const spCloud = spCloudSuffix(cloud);
      if (spCloud && cloud !== 'universal') {
        spNames.push(`${p.spName} (${spCloud})`);
      } else if (cloud === 'universal') {
        spNames.push(p.spName);
      }
    });
  }

  // generate component email(s)
  let spCmd = 'echo node ./statuspage setup --silent';
  spCmd += spNames.map((name) => ` --name "${name}"`).join('');
  if (p.spGroup) spCmd += ` --group "${p.spGroup}"`;
  if (p.incubator) spCmd += ' --incubator true';
  spEmail = shell.exec(spCmd);
}

// --- new relic automation --------------------------------------------------
const nrNames = [];
const nrURLs = [];

// load info from package json
let packageName;
let defaultActionName;
let actionVersion;
try {
  const json = JSON.parse(fs.readFileSync('package.json'));
  packageName = json.name;
  [, defaultActionName] = packageName.name.split('helix-');
  [actionVersion] = packageName.version.version.split('.');
} catch (e) {
  // ignore
}
const actionName = p.actionName || defaultActionName;
const actionStatus = '/_status_check/healthcheck.json';

if (!p.nrName) {
  p.nrName = packageName;
}

if (p.nrURL) {
  // use custom url
  nrURLs.push(p.nrURL);
} else if (clouds.length > 0) {
  // add monitors
  clouds.forEach((cloud) => {
    if (cloud === 'universal') {
      nrURLs.push(`https://${p.universalHost}/${p.actionPackage}/${actionName}@v${actionVersion}${actionStatus}`);
      nrNames.push(p.nrName);
    } else {
      if (cloud === 'aws') {
        nrURLs.push(`https://${p.awsApi}.execute-api.${p.awsRegion}.amazonaws.com/${p.actionPackage}/${actionName}/v${actionVersion}${actionStatus}`);
      }
      if (cloud === 'adobeio') {
        nrURLs.push(`https://${p.adobeioHost}/api/v1/web/${p.actionNS}/${p.actionPackage}/${actionName}@v${actionVersion}${actionStatus}`);
      }
      // add cloud-specific name
      nrNames.push(`${nrNames[0]}.${cloud}`);
    }
  });
} else {
  // fall back to adobe i/o only
  nrURLs.push(`https://${p.adobeioHost}/api/v1/web/${p.actionNS}/${p.actionPackage}/${actionName}@v${actionVersion}${actionStatus}`);
  nrNames.push(p.nrName);
}
const nrGroupTargets = [];
if (p.nrGroupTargets) {
  p.nrGroupTargets
    .split(',')
    .map((target) => target.trim())
    .filter((target) => validTargets.includes(target));
}

let nrCmd = 'echo node ./newrelic setup';
nrCmd += nrURLs.map((url) => ` --url ${url}`).join('');
nrCmd += nrNames.map((name) => ` --name "${name}"`).join('');
if (spEmail) nrCmd += ` --email ${spEmail}`;
if (p.nrType) nrCmd += ` --type ${p.nrType}`;
if (p.nrLocations) nrCmd += ` --locations ${p.nrLocations}`;
if (p.nrFrequency) nrCmd += ` --frequency ${p.nrFrequency}`;
if (p.nrScript) nrCmd += ` --script "${p.nrScript}"`;
if (p.nrGroupPolicy) nrCmd += ` --group_policy "${p.nrGroupPolicy}"`;
nrCmd += nrGroupTargets.map((target) => ` --group_target ${target}`).join('');
if (p.incubator) nrCmd += ' --incubator true';
shell.exec(nrCmd);
