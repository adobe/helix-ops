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

const yargs = require('yargs');
const fs = require('fs');
const request = require('request-promise-native');
const { getIncubatorName } = require('../utils');

function getIncubatorPageId(pageId, incubatorPageId) {
  return incubatorPageId || pageId;
}

class CLI {
  // eslint-disable-next-line class-methods-use-this
  run(arg) {
    let logger = console;
    const config = {};

    try {
      const packageJSON = JSON.parse(fs.readFileSync('package.json'));
      config.name = packageJSON.name;
      config.description = packageJSON.description;
    } catch (e) {
      // ignore
    }

    function setLogger(silent) {
      function log(...args) {
        if (args.length < 2) {
          return;
        }
        if (args[0] === 'Automation email:' && args[1].indexOf('@') > 0) {
          // only log email in 2nd argument
          // eslint-disable-next-line no-console
          console.log(args[1]);
        }
      }
      function ignore() { }
      if (silent) {
        logger = {
          log,
          debug: ignore,
          warn: ignore,
          error: ignore,
          trace: ignore,
          info: ignore,
        };
      } else {
        logger = console;
      }
    }

    async function getComponentInfo(auth, pageid, group, name) {
      try {
        const result = {};
        result.allComps = await request.get(`https://api.statuspage.io/v1/pages/${pageid}/components`, {
          headers: {
            Authorization: auth,
          },
          json: true,
        });

        [result.component] = result.allComps.filter((comp) => comp.name === name);

        if (group) {
          // look for the group component
          [result.compGroup] = result.allComps.filter((comp) => comp.group && comp.name === group);
        }
        return result;
      } catch (e) {
        logger.error('Unable to retrieve components:', e.message);
        return {};
      }
    }

    async function createComponent(auth, pageid, name, description, group) {
      // create component
      const component = {
        name,
        description,
        status: 'operational',
        only_show_if_degraded: false,
        showcase: true,
      };
      let msg = `Creating component ${name}`;
      if (group) {
        msg += ` in group ${group.name}`;
        component.group_id = group.id;
      }
      logger.log(msg);
      try {
        return await request.post(`https://api.statuspage.io/v1/pages/${pageid}/components`, {
          json: true,
          headers: {
            Authorization: auth,
          },
          body: {
            component,
          },
        });
      } catch (e) {
        logger.error('Component creation failed:', e.message);
        process.exit(1);
      }
      return null;
    }

    async function updateComponent(auth, pageid, comp, description, group) {
      const component = {};
      if (comp.description !== description) {
        component.description = description;
      }
      if (group && comp.group_id !== group.id) {
        component.group_id = group.id;
      }
      if (Object.keys(component).length > 0) {
        logger.log('Updating component', comp.name);
        try {
          return await request.patch(`https://api.statuspage.io/v1/pages/${pageid}/components/${comp.id}`, {
            json: true,
            headers: {
              Authorization: auth,
            },
            body: {
              component,
            },
          });
        } catch (e) {
          logger.error('Component update failed:', e.message);
        }
      }
      return comp;
    }

    async function purgeIncubator(auth, pageid, ipageid, currentComps, name) {
      let component;
      if (ipageid) {
        // search on dedicated incubator page
        const info = await getComponentInfo(auth, ipageid, null, name);
        component = info.component;
      } else if (currentComps) {
        // search components from current page to avoid additional API call
        [component] = currentComps.filter((comp) => comp.name === name);
      }
      if (component) {
        logger.log('Deleting incubator component', component.name);
        try {
          await request.delete(`https://api.statuspage.io/v1/pages/${ipageid || pageid}/components/${component.id}`, {
            json: true,
            headers: {
              Authorization: auth,
            },
          });
        } catch (e) {
          logger.error('Unable to delete incubator component:', e.message);
        }
      }
    }

    async function updateOrCreateComponent({
      // eslint-disable-next-line camelcase
      auth, pageId, group, name, description, silent, incubator, incubatorPageId,
    }) {
      setLogger(silent);

      let comp;
      const compName = incubator ? getIncubatorName(name) : name;
      const compPageId = incubator ? getIncubatorPageId(pageId, incubatorPageId) : pageId;
      const groupName = incubator ? null : group;
      const { component, compGroup, allComps } = await getComponentInfo(
        auth,
        compPageId,
        groupName,
        compName,
      );
      if (component) {
        logger.log('Reusing existing component', compName);
        // update component
        comp = await updateComponent(auth, compPageId, component, description, compGroup);
      } else {
        // create component
        comp = await createComponent(auth, compPageId, compName, description, compGroup);
      }
      if (comp) {
        logger.log('Automation email:', comp.automation_email);
      }
      if (!incubator) {
        // delete same name incubator component
        await purgeIncubator(
          auth,
          pageId,
          incubatorPageId,
          allComps,
          getIncubatorName(name),
        );
      }
      logger.log('done.');
    }

    function baseargs(y) {
      return y
        .option('auth', {
          type: 'string',
          describe: 'Statuspage API Key (or env $STATUSPAGE_AUTH)',
          required: true,
        })
        .option('page_id', {
          type: 'string',
          alias: 'pageId',
          describe: 'Statuspage Page ID (or env $STATUSPAGE_PAGE_ID)',
          required: true,
        })
        .option('name', {
          type: 'string',
          describe: 'The name of the component',
          required: config.name === undefined,
          default: config.name,
        })
        .option('description', {
          type: 'string',
          describe: 'The description of the component',
          default: config.description,
          required: false,
        })
        .option('group', {
          type: 'string',
          describe: 'The name of an existing component group',
          required: false,
        })
        .option('incubator', {
          type: 'boolean',
          describe: 'Flag as incubator component',
          required: false,
          default: false,
        })
        .option('incubator_page_id', {
          type: 'string',
          alias: 'incubatorPageId',
          describe: 'Statuspage Page ID for incubator components',
          required: false,
          default: false,
        })
        .option('silent', {
          type: 'boolean',
          describe: 'Reduce output to automation email only',
          required: false,
          default: false,
        });
    }
    return yargs
      .scriptName('statuspage')
      .usage('$0 <cmd>')
      .command('setup', 'Create or reuse a Statuspage component', (y) => baseargs(y), updateOrCreateComponent)
      .help()
      .strict()
      .demandCommand(1)
      .env('STATUSPAGE')
      .parse(arg)
      .argv;
  }
}

module.exports = CLI;
