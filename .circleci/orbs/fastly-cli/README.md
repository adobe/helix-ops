# fastly-cli orb

This orb contains centralized commands to install the Fastly CLI in a CircleCI image

## Orb

To integrate this orb into a CircleCI config, include the following line in `.circleci/config.yml` of a Helix repo:

```yml
orbs:
  fastly: adobe/fastly-cli@1.0.0
```

## Commands

### Installation

The command `install` installs the CLI.

You can use it in your CircleCI config as follows:
```yml
jobs:
  my-job:
    executor: node10
    steps:
      - ...
      - fastly/install
```
For a list of all parameters supported by the `install` command, see here:
https://circleci.com/orbs/registry/orb/adobe/fastly-cli
