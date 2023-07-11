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

/* eslint-disable no-param-reassign */
import { diffTrimmedLines } from 'diff';
import fs from 'fs-extra';
import gitLogParser from 'git-log-parser';
import toArray from 'stream-to-array';
import shell from 'shelljs';
import yargs from 'yargs';

const releaseTypes = [
  '',
  'patch',
  'minor',
  'major',
];
const logger = console; // executed in CircleCI runtime
let config = {};

async function getReleaseDate() {
  if ((await fs.pathExists(config.changelog))) {
    const cl = (await fs.readFile(config.changelog)).toString('utf-8');
    const match = /\((\d{4}-\d{2}-\d{2})\)/s.exec(cl);
    if (match && match.length === 2) {
      return new Date(match[1]);
    }
  }
  return null;
}

async function getReleaseType() {
  logger.log('Analyzing commits since last release');
  Object.assign(gitLogParser.fields, {
    committerDate: { key: 'ci', type: Date },
    message: 'B',
  });
  let type = 0;
  const releaseDate = await getReleaseDate();
  if (releaseDate) {
    logger.log('Last release date: %s', releaseDate.toUTCString());
    (await toArray(gitLogParser.parse()))
      .filter((commit) => {
        if (new Date(commit.committerDate) >= releaseDate) {
          if (/^(fix|perf)\(?.*\)?:/.test(commit.subject) && type < releaseTypes.indexOf('patch')) {
            type = releaseTypes.indexOf('patch');
          }
          if (/^feat\(?.*\)?:/.test(commit.subject) && type < releaseTypes.indexOf('minor')) {
            type = releaseTypes.indexOf('minor');
          }
          if (/.*(BREAKING CHANGE).*/.test(commit.message)) {
            type = releaseTypes.indexOf('major');
          }
          return true;
        }
        return false;
      });
  } else {
    logger.warn('Unable to determine last release date');
  }
  logger.log(type ? 'Proposed release type: %s' : 'No release', releaseTypes[type]);
  return releaseTypes[type];
}

async function getOrbs() {
  const orbs = [];
  const dirs = (await fs.readdir(config.orbDir))
    .filter((dir) => /^[A-Za-z0-9_-]+$/.test(dir));
  dirs.forEach(async (orb) => {
    const dir = `${config.orbDir}/${orb}`;
    orbs.push({
      name: orb,
      dir,
      src: `${dir}/${config.orbSrc}`,
    });
  });
  return orbs;
}

async function diffOrb(orb) {
  logger.log('Checking orb %s', orb.name);
  let ret = false;
  const tmpDir = `/tmp/${orb.name}-${Date.now()}`;
  const pubFile = `${tmpDir}/src.yml`;
  await fs.ensureDir(tmpDir);
  shell.exec(`~/circleci orb source ${config.namespace}/${orb.name} > "${pubFile}"`);
  if (shell.error()) {
    return ret;
  }
  const pubSource = (await fs.readFile(pubFile)).toString('utf-8');
  const locSource = `${(await fs.readFile(orb.src)).toString('utf-8')}\n`;
  const patch = diffTrimmedLines(pubSource, locSource);
  patch.forEach((entry) => {
    if (entry.added || entry.removed) {
      ret = true;
    }
  });
  logger.log(ret
    ? '  Orb source changed, proceeding with release'
    : '  Orb source unchanged, skipping release');
  return ret;
}

function releaseOrb(orb, type) {
  return shell.exec(`~/circleci orb publish increment "${orb.src}" ${config.namespace}/${orb.name} ${type}`);
}

async function releaseOrbs(opts) {
  config = {
    ...opts,
    ...config,
  };
  const releaseType = await getReleaseType();
  if (releaseType) {
    const orbs = await getOrbs();
    orbs.forEach(async (orb) => {
      const srcChanged = await diffOrb(orb);
      if (srcChanged) {
        releaseOrb(orb, releaseType);
      }
    });
  }
  logger.log('Done');
}

function baseargs(y) {
  return y
    .option('token', {
      type: 'string',
      alias: 'auth',
      describe: 'CircleCI CLI Token (or env $CIRCLECI_CLI_TOKEN)',
      required: true,
    })
    .option('namespace', {
      type: 'string',
      describe: 'The namespace to publish the orbs under',
      default: 'adobe',
      required: false,
    })
    .option('orb-dir', {
      type: 'string',
      alias: 'orbDir',
      describe: 'The relative path to the orbs',
      default: './.circleci/orbs',
      required: false,
    })
    .option('orb-src', {
      type: 'string',
      alias: 'orbSrc',
      describe: 'The name of the orb source file',
      default: 'orb.yml',
      required: false,
    })
    .option('changelog', {
      type: 'string',
      describe: 'The relative path to the change log file',
      default: './CHANGELOG.md',
      required: false,
    });
}

export default class CLI {
  // eslint-disable-next-line class-methods-use-this
  run(arg) {
    return yargs()
      .scriptName('orb-release')
      .usage('$0')
      .command('$0', 'default', (y) => baseargs(y), releaseOrbs)
      .help()
      .strict()
      .env('CIRCLECI_CLI')
      .parse(arg)
      .argv;
  }
}
