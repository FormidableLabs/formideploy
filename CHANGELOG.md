Changes
=======

## UNRELEASED

* Feature: Add `formideploy deploy|serve|archives --archive` options to support rollbacks.
  [#20](https://github.com/FormidableLabs/formideploy/issues/20)
* Feature: Add `formideploy archives` action.
  [#20](https://github.com/FormidableLabs/formideploy/issues/20)

## 0.3.1

* Bug: Fix issue for base website and `bucket//archive` empty path issue.

## 0.3.0

* BREAKING: Change configuration `build.id` parameter to `build.changeId`.
* Feature: Add deployment archive uploads.
  [#14](https://github.com/FormidableLabs/formideploy/issues/14)

## 0.2.2

* Fix incorrect devDependencies.

## 0.2.1

* Permissively handle missing credentials for forked PRs for staging actions.
* Harmonize `deploy --production|staging` logic and messages.

## 0.2.0

* BREAKING: Refactor configuration shape minorly.
* Feature: Add `formideploy deploy --production` action.
    [#1](https://github.com/FormidableLabs/formideploy/issues/1)
    [#3](https://github.com/FormidableLabs/formideploy/issues/3)
    [#15](https://github.com/FormidableLabs/formideploy/issues/15)
* Internals: Better inference of current git hash from environment or git metadata.

## 0.1.2

* Feature: Add GitHub deployments to PRs.
  [#4](https://github.com/FormidableLabs/formideploy/issues/4)
* Add `FORMIDEPLOY_BUILD_ID` environment variable for localdev deploys.

## 0.1.1

* Feature: Add `formideploy deploy --staging` action.
  [#2](https://github.com/FormidableLabs/formideploy/issues/2)

## 0.1.0

* Feature: Add `formideploy serve` action.
  [#8](https://github.com/FormidableLabs/formideploy/issues/8)
* Initial release.
