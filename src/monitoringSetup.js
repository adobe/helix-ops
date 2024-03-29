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
/* eslint-disable no-console */
import fs from 'fs';
import shell from 'shelljs';

function getServiceInfo() {
  // load info from package json
  let name = 'dummy';
  let shortName = 'dummy';
  let version = '1';
  let versionDigits = [1, 0, 0];
  try {
    const json = JSON.parse(fs.readFileSync('package.json'));
    name = json.name;
    if (name.indexOf('franklin-') !== -1) {
      [, shortName] = name.split('franklin-');
    } else {
      [, shortName] = name.split('helix-');
    }
    versionDigits = json.version.split('.');
    [version] = versionDigits;
  } catch (e) {
    // ignore
  }
  return {
    name,
    shortName,
    version,
    versionDigits,
  };
}
/**
 * Set up New Relic
 * @param {Object} params The monitoring parameters
 * @param {string} email The Statuspage component email(s) (optional)
 */
function setupNewRelic(params, email) {
  const nrNames = [];
  const nrURLs = [];

  const { shortName, version, versionDigits } = params.service;
  const actionName = params.actionName || shortName;
  const actionStatus = '/_status_check/healthcheck.json';

  const nrName = params.nrName || params.service.name;

  if (params.nrURL) {
    // use monitor with custom url
    nrURLs.push(params.nrURL);
    nrNames.push(nrName);
  } else if (params.clouds.length > 0) {
    // add multi-cloud monitors
    params.clouds.forEach((cloud) => {
      if (cloud === 'adobeio') {
        // backward compatibility: adobeio monitor without suffix
        nrURLs.push(`https://${params.adobeioHost}/api/v1/web/${params.adobeioNS || params.actionNS}/${params.actionPackage}/${actionName}@v${version}${actionStatus}`);
        nrNames.push(nrName);
      } else {
        // add other cloud-specific url
        if (cloud === 'universal') {
          nrURLs.push(`https://${params.universalHost}/${params.actionPackage}/${actionName}@v${version}${actionStatus}`);
        }
        if (cloud === 'aws') {
          nrURLs.push(`https://${params.awsAPI}.execute-api.${params.awsRegion}.amazonaws.com/${params.actionPackage}/${actionName}/v${version}${actionStatus}`);
        }
        if (cloud === 'google') {
          nrURLs.push(`https://${params.googleRegion}-${params.googleProjectID}.cloudfunctions.net/${params.actionPackage}--${actionName}_${versionDigits.join('_')}${actionStatus}`);
        }
        // add cloud-specific name
        nrNames.push(`${nrName}.${cloud}`);
      }
    });
  } else {
    // backward compatibility: fall back to adobeio monitor without suffix
    nrURLs.push(`https://${params.adobeioHost}/api/v1/web/${params.adobeioNS || params.actionNS}/${params.actionPackage}/${actionName}@v${version}${actionStatus}`);
    nrNames.push(nrName);
  }
  let nrGroupTargets = [];
  if (params.nrGroupTargets) {
    nrGroupTargets = params.nrGroupTargets
      // split comma separated clouds
      .split(',')
      .map((cloud) => cloud.trim())
      // only keep valid clouds
      .filter((cloud) => params.validClouds.includes(cloud))
      // find names containing cloud
      .map((cloud) => nrNames.findIndex((name) => name.endsWith(cloud)))
      // return indices
      .filter((index) => index !== -1);
  }

  let nrCmd = `node ${params.toolPath}/newrelic setup`;
  nrCmd += nrURLs.map((url) => ` --url ${url}`).join('');
  nrCmd += nrNames.map((name) => ` --name "${name}"`).join('');
  if (email) nrCmd += ` --email ${email}`;
  if (params.nrType) nrCmd += ` --type ${params.nrType}`;
  if (params.nrLocations) nrCmd += ` --locations ${params.nrLocations.split(',').join(' ')}`;
  if (params.nrFrequency) nrCmd += ` --frequency ${params.nrFrequency}`;
  if (params.nrScript) nrCmd += ` --script "${params.nrScript}"`;
  if (params.nrGroupPolicy) nrCmd += ` --group_policy "${params.nrGroupPolicy}"`;
  if (nrGroupTargets.length) nrCmd += ` --group_targets ${nrGroupTargets.join(' ')}`;
  if (params.incubator) nrCmd += ' --incubator true';
  shell.exec(nrCmd, (code) => {
    if (code > 0) {
      console.error('Error: New Relic setup failed');
    }
  });
}

/**
 * Set up Statuspage
 * @param {Object} params The monitoring parameters
 */
function setupStatuspage(params) {
  const spCloudNames = {
    universal: 'Universal',
    aws: 'AWS',
    google: 'Google',
    adobeio: 'Adobe I/O Runtime',
  };

  const spNames = [];
  if (params.clouds.length > 0) {
    const spName = params.spName || params.service.name;
    params.clouds.forEach((cloud) => {
      const spCloudName = spCloudNames[cloud];
      if (spCloudName) {
        // backward compatibility: adobeio component without suffix
        spNames.push(cloud === 'adobeio' ? spName : `${spName} (${spCloudName})`);
      }
    });
  } else if (params.spName) {
    // backward compatibility: fall back to adobeio component without suffix
    spNames.push(params.spName);
  }

  // generate component email(s)
  let spCmd = `node ${params.toolPath}/statuspage setup --silent`;
  spCmd += spNames.map((name) => ` --name "${name}"`).join('');
  if (params.spGroup) spCmd += ` --group "${params.spGroup}"`;
  if (params.incubator) spCmd += ' --incubator true';
  shell.exec(spCmd, { silent: true }, (code, stdout) => {
    if (code > 0) {
      console.error('Error: Statuspage setup failed, skipping New Relic setup');
      process.exit(code);
    }
    setupNewRelic(params, stdout.trim());
  });
}

// get params from JSON string
const p = process.argv[2] ? JSON.parse(process.argv[2]) : null;
if (!p) {
  console.error('Error: 1st argument must be a JSON string with config parameters');
  process.exit(1);
}

// use cwd as tool path if undefined
p.toolPath = p.toolPath || '.';

// add info from package.json
p.service = getServiceInfo();

// define supported clouds
p.validClouds = ['universal', 'aws', 'google', 'adobeio'];

// use real env variables
Object.keys(p).forEach((k) => {
  if (typeof p[k] === 'string' && p[k].startsWith('HLX_')) {
    p[k] = process.env[p[k]];
  }
});

// use real booleans
Object.keys(p).forEach((k) => {
  if (p[k] === 'true') {
    p[k] = true;
  } else if (p[k] === 'false') {
    p[k] = false;
  }
});

p.clouds = [];
if (!p.targets && p.aws) {
  // backward compatibility for universal actions with aws flag
  p.targets = 'universal, aws, adobeio';
}
if (p.targets) {
  // split comma-separated clouds
  p.targets.split(',')
    .map((cloud) => cloud.trim())
    // only keep valid clouds
    .filter((cloud) => p.validClouds.includes(cloud))
    .forEach((cloud) => p.clouds.push(cloud));
}

// run monitoring setup
if (p.spName || p.spGroup) {
  setupStatuspage(p);
} else {
  setupNewRelic(p);
}
