# Helix Orbs

This folder contains the CircleCI orbs used by the Helix project. See [here](https://circleci.com/docs/2.0/orb-intro/) to learn more about orbs.

Current organisation: `adobe` (to create or publish orbs, you need to be a member of Adobe CircleCI org)
Current namespace: `adobe` (the namespace is what appears in the first part of the orb name)

List of available orbs:

* [adobe/helix-post-deploy](helix-post-deploy/orb.yml)

## Setup

* Run `circleci setup` (the CircleCI token is your [personal CircleCI API token](https://circleci.com/account/api)
* List orbs in the `adobe` namespace: `circleci orb list adobe`

## Add a new Orb

* Run `circleci orb create adobe/<orb_name>`

### Modify an existing Orb

Modify an existing orb and publish a new version:

* First validate the yml file: `circleci orb validate <orb_name>/orb.yml`
* Publish increment a new version: `circleci orb publish increment <orb_name>/orb.yml adobe/<orb_name> patch` (semantic versioning: patch / minor / major)
* Update the version in the orb's `README.md`
* Commit changes :)
