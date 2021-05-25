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
const fetchAPI = require('@adobe/helix-fetch');
const { getIncubatorName } = require('../utils');

function fetchContext() {
  return process.env.HELIX_FETCH_FORCE_HTTP1
    ? fetchAPI.context({
      alpnProtocols: [fetchAPI.ALPN_HTTP1_1],
    })
    : fetchAPI;
}
const { fetch } = fetchContext();

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
        const resp = await fetch(`https://api.statuspage.io/v1/pages/${pageid}/components`, {
          headers: {
            Authorization: auth,
          },
        });
        if (!resp.ok) {
          throw new Error(await resp.text());
        }
        result.allComps = await resp.json();
        result.component = result.allComps.find((comp) => comp.name === name);

        if (group) {
          // look for the group component
          result.compGroup = result.allComps.find((comp) => comp.group && comp.name === group);
        }
        return result;
      } catch (e) {
        logger.error('Unable to retrieve components:', e);
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
        const resp = await fetch(`https://api.statuspage.io/v1/pages/${pageid}/components`, {
          method: 'POST',
          headers: {
            Authorization: auth,
          },
          body: {
            component,
          },
        });
        if (!resp.ok) {
          throw new Error(await resp.text());
        }
        return await resp.json();
      } catch (e) {
        logger.error('Component creation failed:', e);
        process.exit(1);
        return null; // this is here for testing
      }
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
          const resp = await fetch(`https://api.statuspage.io/v1/pages/${pageid}/components/${comp.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: auth,
            },
            body: {
              component,
            },
          });
          if (!resp.ok) {
            throw new Error(await resp.text());
          }
          return await resp.json();
        } catch (e) {
          logger.error('Component update failed:', e);
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
        component = currentComps.find((comp) => comp.name === name);
      }
      if (component) {
        logger.log('Deleting incubator component', component.name);
        try {
          const resp = await fetch(`https://api.statuspage.io/v1/pages/${ipageid || pageid}/components/${component.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: auth,
            },
          });
          const body = await resp.text();
          if (!resp.ok) {
            throw new Error(body);
          }
        } catch (e) {
          logger.error('Unable to delete incubator component:', e);
        }
      }
    }

    async function updateOrCreateComponent({
      // eslint-disable-next-line camelcase
      auth, pageId, group, name, description, silent, incubator, incubatorPageId,
    }) {
      setLogger(silent);

      const names = Array.isArray(name) ? name : [name];

      const emails = [
        ...await Promise.all(names.map(async (cname) => {
          let comp;
          const compName = incubator ? getIncubatorName(cname) : cname;
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
          if (!incubator) {
            // delete same name incubator component
            await purgeIncubator(
              auth,
              pageId,
              incubatorPageId,
              allComps,
              getIncubatorName(cname),
            );
          }
          return comp ? comp.automation_email : '';
        })),
      ];
      logger.log('Automation email:', emails.join(' '));
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
          type: 'array',
          describe: 'The name of the component',
          required: config.name === undefined,
          default: [config.name],
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
