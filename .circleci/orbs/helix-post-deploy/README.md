# helix-post-deploy orb

This orb contains centralized commands for use after deploying a new version of a Helix service.

## Orb

To integrate this orb into a CircleCI config, include the following line in `.circleci/config.yml` of a Helix repo:

```yml
orbs:
  helix-post-deploy: adobe/helix-post-deploy@1.2.1
```

## Commands

### Monitoring

The command `monitoring` configures monitoring and alerting in New Relic, and links to Statuspage for public visibility.

You can use it in your CircleCI config as follows:
```yml
jobs:
  my-job:
    executor: node10
    steps:
      - ...
      - helix-post-deploy/monitoring
```
For a list of all parameters supported by the `monitoring` command, see here:
https://circleci.com/orbs/registry/orb/adobe/helix-post-deploy

#### Dependencies

* Add `@adobe/helix-ops@1.0.0` (or higher) to `devDependencies` in your project's package.json. It contains the tooling for the `monitoring` command.
* If your action is deployed in I/O Runtime, you can also add `@adobe/helix-status@5.3.0` (or higher) to `dependencies` so you won't need to specify a `monitor_url` parameter and use the built in status check URL instead.

#### 3rd Party Configurations

In CircleCI, add the following environment variables to the project consuming the orb (e.g. https://circleci.com/gh/myorg/myservice/edit#env-vars):
- `NEWRELIC_AUTH`: The admin's API key for your New Relic account (not the user API key!)
- `STATUSPAGE_AUTH`: The API user key for your Statuspage account (this is the user API key)
- `STATUS_PAGE_PAGE_ID`: The ID of the page to add components to in Statuspage

In New Relic Synthetics, add the following secure credentials:
- `WSK_AUTH_HELIX`: The OpenWhisk auth key for the `helix` namespace
