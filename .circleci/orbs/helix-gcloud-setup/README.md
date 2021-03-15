# helix-gcloud-setup orb

This orb contains centralized commands to create Google Cloud Platform Credentials

## Orb

To integrate this orb into a CircleCI config, include the following line in `.circleci/config.yml` of a Helix repo:

```yml
orbs:
  helix-gcloud-setup: adobe/helix-gcloud-setup@1.0.0
```

## Commands

### Monitoring

The command `file` creates the configuration file.

You can use it in your CircleCI config as follows:
```yml
jobs:
  my-job:
    executor: node10
    steps:
      - ...
      - helix-gcloud-setup/file
```
For a list of all parameters supported by the `monitoring` command, see here:
https://circleci.com/orbs/registry/orb/adobe/helix-gcloud-setup

#### Dependencies

* Add `@adobe/helix-ops@1.0.0` (or higher) to `devDependencies` in your project's package.json. It contains the tooling for the `file` command.
