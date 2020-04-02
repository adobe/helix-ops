# Helix Operations

> Tooling for automating operations of Project Helix services

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-library.svg)](https://codecov.io/gh/adobe/helix-library)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-library.svg)](https://circleci.com/gh/adobe/helix-library)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-library.svg)](https://github.com/adobe/helix-library/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-library.svg)](https://github.com/adobe/helix-library/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-library.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-library)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release) [![Greenkeeper badge](https://badges.greenkeeper.io/adobe/helix-library.svg)](https://greenkeeper.io/)

## Installation

```bash
$ npm install -D @adobe/helix-ops
```

## Automated Monitoring

`helix-ops` provides the following command line tools intended to be run as part of your deployment pipeline to automate your monitoring:

### Statuspage: Automated Update of Components

`statuspage` allows to automatically create components in Statuspage and return its automation email address.

Usage:

```bash
$ npx statuspage
statuspage <cmd>

Commands:
  statuspage setup  Create or reuse a Statuspage component

Options:
  --version            Show version number                                       [boolean]
  --help               Show help                                                 [boolean]
  --auth               Statuspage API Key (or env $STATUSPAGE_AUTH)    [string] [required]
  --page_id            Statuspage Page ID (or env $STATUSPGAGE_PAGE_ID)[string] [required]
  --name               The name of the component                                  [string]
  --description        The description of the component                           [string]
  --group              The name of an existing component group                    [string]
  --incubator          Flag as incubator component                               [boolean]
  --incubator_page_id  Statuspage Page ID for incubator components                [string]
  --silent             Reduce output to automation email only                    [boolean]

$ npx statuspage setup --group "Delivery"
Creating component @adobe/helix-example-service in group Delivery
Automation email: component+id@notifications.statuspage.io
done.
```
Note: You can directly reuse the output of `statuspage` in your shell by adding the `--silent` parameter:
```bash
$ npx statuspage setup --group "Delivery" --silent
component+id@notifications.statuspage.io
```

By default, the check will use the package `name` and `description` from your `package.json`, and leave group empty.

`statuspage` requires a Statuspage [API Key](https://developer.statuspage.io/#section/Authentication) that should be passed using either the `--auth` parameter or the `STATUSPAGE_AUTH` environment variable, as well as a Statuspage [Page ID] that should be passed using either the `--page_id` parameter or the `STATUSPAGE_PAGE_ID` environment variable. 

### New Relic: Automated Update of Synthetics Checks, Alert Policies and Notification Channels

`newrelic` automates the following New Relic features:
1. creation or update of monitors in New Relics Synthetics
1. creation of notification channels in New Relic Alerts
1. creation or update of alert policies and conditions in New Relic Alerts
1. wiring alert policies to notification channels and conditions to monitors

Usage:

```bash
$ npx newrelic
newrelic <cmd> url email

Commands:
  newrelic setup url [email]  Create or update a New Relic setup

Positionals:
  url    The URL to check                                    [string] [required]
  email  The email address to send alerts to                            [string]

Options:
  --version       Show version number                                  [boolean]
  --help          Show help                                            [boolean]
  --auth          Admin API Key (or env var $NEWRELIC_AUTH)   [string][required]
  --name          The name of the monitor, channel and policy           [string]
  --group_policy  The name of a common policy to add the monitor to     [string]
  --incubator     Flag as incubator setup                              [boolean]
  --type          The type of monitor (api or browser)                  [string]
  --script        The path to a custom monitor script                   [string]

$ npx newrelic setup \
  https://adobeioruntime.net/api/v1/web/namespace/package/action@v1/_status_check/healthcheck.json \
  component+id@notifications.statuspage.io --group_policy "Delivery"
Creating monitor @adobe/helix-example-service
Updating locations for monitor @adobe/helix-example-service
Updating script for monitor @adobe/helix-example-service
Creating notification channel @adobe/helix-example-service
Creating alert policy @adobe/helix-example-service
Linking notification channel to alert policy @adobe/helix-example-service
Creating condition in alert policy
Verifying group alert policy Delivery
Updating alert policy condition
done.
```

By default, the check will use the `name` from your `package.json`, but you can override it using the `--name` parameter.

`newrelic` requires a New Relic [Admin's API Key](https://docs.newrelic.com/docs/apis/get-started/intro-apis/understand-new-relic-api-keys#admin) (read the docs, it's different from your API key, even when you are an Admin) that should be passed using either the `--auth` parameter or the `NEWRELIC_AUTH` environment variable.

#### New Relic Synthetics Setup
- Have [Multi-location Synthetics alert conditions](https://rpm.newrelic.com/api/explore/alerts_location_failure_conditions) enabled for your account. More information can be found [here](https://docs.newrelic.com/docs/multi-location-synthetics-alert-conditions).
- Add `WSK_AUTH` keys as [secure credentials](https://docs.newrelic.com/docs/synthetics/new-relic-synthetics/using-monitors/secure-credentials-store-credentials-information-scripted-browsers) for all Adobe I/O Runtime namespaces: `WSK_AUTH_FOO` for namespace `foo`, `WSK_AUTH_FOO_BAR` for `foo-bar` etc.

#### Use with CircleCI
You can invoke the [adobe/helix-post-deploy](https://circleci.com/orbs/registry/orb/adobe/helix-post-deploy) orb in your CircleCI config.yaml and use the `monitoring` command as a step in your job, with optional parameters. Note: you will still need to add `@adobe/helix-ops` as a dependency in your package.json.
