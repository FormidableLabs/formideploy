formideploy 🚢
=============

[![npm version][npm_img]][npm_site]
[![Travis Status][trav_img]][trav_site]

Deployment helpers for everything Formidable website-related. This tool helps our base website and open source landers projects:

* Serve a production build in localdev
* Deploy the build to staging (`surge.sh`)
* Deploy the build to production (AWS)

## Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Usage](#usage)
- [Integration](#integration)
  - [Repository configuration](#repository-configuration)
  - [Localdev](#localdev)
    - [AWS](#aws)
  - [CI](#ci)
    - [Secrets](#secrets)
    - [GitHub Integration](#github-integration)
    - [Staging CI](#staging-ci)
    - [Production CI](#production-ci)
- [Actions](#actions)
  - [Serve](#serve)
  - [Deploy: Staging](#deploy-staging)
  - [Deploy: Production](#deploy-production)
    - [Production Archives](#production-archives)
  - [Archives](#archives)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage

```
Usage: formideploy <action> [options]

Actions: (<action>)
  serve         Run local server from static build directory
  deploy        Deploy build directory to website
  archives      List production archives or single archive

Options:
  --port        (serve)     Port to run local server on.            [number] [default: 5000]
  --staging     (deploy)    Deploy build to staging site.           [boolean]
  --production  (deploy)    Deploy build to staging production.     [boolean]
  --dryrun      (deploy)    Don't actually run deployment actions.  [boolean]
  --archive     (deploy)    Archive to rollback to.                 [string]
                (archives)  Display metadata for single archive.
  --limit       (archives)  Max number of archives to list.         [number] [default: 10]
  --start       (archives)  Newest date to list archives from.      [date] [default: Date.now()]
  --help, -h                Show help                               [boolean]
  --version, -v             Show version number                     [boolean]

Examples:
  formideploy serve --port=3333               Serve build directory on port 5000.
  formideploy deploy --staging                Deploy build to staging.
  formideploy deploy --production --dryrun    Simulate production build deploy.
  formideploy deploy --production \           Rollback deploy to archive.
                --archive archive-8638408699443610-20200604-195556-390-a151521-clean.tar.gz
  formideploy archives --limit 5              List 5 most recent archives
  formideploy archives \                      List archives on/after specific UTC date.
                --start 2020-06-05T02:22:34.842Z
  formideploy archives \                      Display metadata for single archive.
                --archive archive-8638408699443610-20200604-195556-390-a151521-clean.tar.gz
```

## Integration

Formideploy helps serve and deploy for our main website ([`formidable.com`](https://formidable.com)) and our various project landers (e.g., [`spectacle/docs`](https://github.com/FormidableLabs/spectacle/tree/master/docs) served at [`formidable.com/open-source/spectacle`](https://formidable.com/open-source/spectacle)).

Project integration entails configuration within a repository and secrets placed into CI.

### Repository configuration

To add `formideploy` to your project, first add it via yarn:

```sh
$ yarn add --dev formideploy
```

Typically, you'll then want some helper `package.json:scripts` wrappers:

```js
// package.json
"scripts": {
  "clean": "**NOTE**: Not part of formideploy, but should remove all previous distributions",
  "build": "**NOTE**: Not part of formideploy, but should produce a full prod distribution",
  "serve": "formideploy serve",
  "deploy:stage": "formideploy deploy --staging",
  "deploy:prod": "formideploy deploy --production",
}
```

And then you'll need to override some configuration variables.

Please open up and read all of [`lib/config/defaults.js`](./lib/config/defaults.js) (particularly the fields with `REQUIRED` comments). The configuration file is self-documenting for everything that you will need to integrate your project.

You will then need to override the applicable defaults with a configuration file in the current working directory from which you run `formideploy` named `formideploy.config.js`. The overrides can be either a function that takes as input the default configuration and mutates it, or an object which is deep merged into the defaults.

Here are both ways of doing the necessary overrides:

```js
// formideploy.config.js (Object Version)
module.exports = {
  lander: {
    name: "spectacle"
  }
};
```

```js
// formideploy.config.js (Function Version)
module.exports = (cfg) => {
  cfg.lander.name = "spectacle";
  return cfg;
};
```

### Localdev

#### AWS

If you  want to do production deploys / testing locally on your machine, you'll need the AWS CLI:

```sh
$ brew install awscli
```

Then, set up `aws-vault` with the AWS access and secret keys for an entry named `AWS IAM ({LANDER_NAME}-ci)` of `AWS IAM (formidable-com-ci)` for the base website in the IC vault:

```sh
$ brew cask install aws-vault
$ aws-vault add fmd-{LANDER_NAME}-ci
# Enter AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY values for AWS `{LANDER_NAME}-ci` user
```

For a quick check to confirm that everything works, try:

```sh
$ aws-vault exec fmd-{LANDER_NAME}-ci -- \
  aws s3 ls s3://formidable.com
```

and you should see a listing of files for the base website.

### CI

The following section discusses how to hook up staging and production deploys in your CI.

> **⚠️ Warning**: Our production secrets allow some pretty powerful things like deleting the production website. When doing your final production integrating / testing from localdev make sure to seek out review and guidance from a teammate who has been through the full integration process before and/or Lauren or Roemer.

#### Secrets

We maintain our secrets in 1password and the relevant credentials can be found in the `Individual Contributor IC` vault. Most of the secrets we need are environment variables that need to be added to CI.

**Travis**: See the [encryption guide](https://docs.travis-ci.com/user/encryption-keys/#usage). We recommend using the Ruby gem and manually outputting the secret to shell, then adding it to your `.travis.yml` with a comment about what the environment variable name is. For example, if our secret was `SURGE_TOKEN=HASHYHASHYHASH`, we would first encrypt it in a terminal to stdout:

```sh
$ travis encrypt SURGE_TOKEN=HASHYHASHYHASH
  secure: "BIG_OL_GIBBERISH_STRING="
```

Then add that to your `.travis.yml` making sure to place the variable name in a comment so we know which environment var the secret corresponds to:

```yml
env:
  global:
    # SURGE_TOKEN
    - secure: "BIG_OL_GIBBERISH_STRING="
```

**CircleCI**:

- [ ] `TODO(10): Add section on CircleCI secrets integration` (https://github.com/FormidableLabs/formideploy/issues/10)

#### GitHub Integration

We get PR deployment notifications and links via the GitHub [deployments](https://developer.github.com/v3/repos/deployments/) API.

Each lander and the base website have dedicated GitHub users that should be used for CI integration with `formideploy`. If a user for a given lander does not exist, please reach out to Roemer or Lauren to have us create one. You should **never** use a personal access token for CI integration.

Find the appropriate GitHub user in the 1password `Individual Contributor IC` vault, most likely named `GitHub ({LANDER_NAME}-ci)`.

* Base website example: `GitHub (formidable-com-ci)`
* Lander examples: `GitHub (spectacle-ci)`, `GitHub (urql-ci)`, ...

**Add `GITHUB_DEPLOYMENT_TOKEN`**: Once you've found the relevant entry in 1password, look to the `Tokens` section for a `GITHUB_DEPLOYMENT_TOKEN` key and token value and add it to your environment variable secrets in CI. If the information is missing, please reach out to Roemer, who will create one (https://github.com/settings/tokens with permissions for the limited `repo > repo_deployment` for public repos and the much more expansive `repo` for private ones).

#### Staging CI

Deploying to staging requires the following secrets from the `Individual Contributor IC` vault encrypted into your CI environment.

* `Surge.sh`: Look in the notes section.
    * **Add `SURGE_LOGIN`**
    * **Add `SURGE_TOKEN`**

**Travis**: For Travis CI users, we will then need a dedicated deployment job. Here's a good example:

```yml
jobs:
  include:
    - stage: documentation
      node_js: '12'
      script:
        # Switch to docs location, install and check.
        - cd docs
        - yarn install --frozen-lockfile
        - yarn run check-ci
        # Build docs.
        - yarn run clean
        - yarn run build
        # Deploy to staging.
        - yarn run deploy:stage
```

`formideploy` is only involved in the last step (`yarn run deploy:stage` assuming you wrapped up a command as we recommend). But the overall job structure just runs **one** staging deployment per PR commit no matter what your build matrix otherwise looks like.

**CircleCI**:

- [ ] `TODO(10): Add section on jobs into CircleCI. (urql)` (https://github.com/FormidableLabs/formideploy/issues/10)

#### Production CI

Deploying to production requires the following secrets from the `Individual Contributor IC` vault encrypted into your CI environment.

* `AWS IAM ({LANDER_NAME}-ci)` _or `AWS IAM (formidable-com-ci)` for the base website and find "Keys" section:
    * * **Add `AWS_ACCESS_KEY_ID`**
    * * **Add `AWS_SECRET_ACCESS_KEY`**

**Travis**: For Travis CI users, enhance the previous staging `jobs.include` task we created above with a `deploy` entry to take the same build and deploy it to production. Here's an example:

```yml
jobs:
  include:
    # PREVIOUS ENTRY FROM STAGING SETUP
    - stage: documentation
      node_js: '12'
      script:
        # ...
        # NOTE: We're going to reuse this build for production.
        - yarn run build
        # ...
      # --> ADD THIS SECTION TO DEPLOY TO PROD ON MASTER MERGE <--
      deploy:
        # Deploy master to production
        - provider: script
          script: yarn run deploy:prod
          skip_cleanup: true
          on:
            branch: master
```

Upon merging a PR to `master`, the production deploy should be triggered!

**CircleCI**:

- [ ] `TODO(10): Add section on jobs into CircleCI. (urql)` (https://github.com/FormidableLabs/formideploy/issues/10)

## Actions

### Serve

Serve your build (specified at `build.dir`) with:

```sh
$ formideploy serve
$ formideploy serve --port 3333

# ... which should be scripted in package.json as ...
$ yarn serve
```

And then look for at the terminal logs for localhost website to view, e.g.:

```sh
[serve] Serving build from "dist/open-source/spectacle" at: http://localhost:4000/open-source/spectacle
```

### Deploy: Staging

Deploy your build (at `build.dir`) to `https://{staging.domain}/{site.basePath)}` with:

```sh
$ formideploy deploy --staging --dryrun # Skips actual deploy
$ formideploy deploy --staging

# ... which should be scripted in package.json as ...
$ yarn deploy:stage --dryrun
$ yarn deploy:stage
```

And then look for at the terminal logs for staging website to view, e.g.:

```sh
[deploy:staging] Publish success for: https://formidable-com-spectacle-staging-333.surge.sh/open-source/spectacle
```

If you want to do a manual deploy from localdev, use simulated environment variables to actually trigger the deploy:

```sh
$ SURGE_LOGIN=<SNIPPED> \
  SURGE_TOKEN=<SNIPPED> \
  FORMIDEPLOY_BUILD_ID=<MAKE_UP_A_NUMBER_OR_STRING> \
  yarn deploy:stage
```

_Note_: Localdev deploys will skip GitHub deployment PR integration.

### Deploy: Production

Deploy your build (at `build.dir`) to `https://{production.domain}/{site.basePath)}` with the following. (**Note**: We're leaving in the `--dryrun` flag in these examples so you don't accidentally do a production deploy. If you really mean to do it from localdev, remove `--dryrun`).

```sh
$ formideploy deploy --production --dryrun

# ... which should be scripted in package.json as ...
$ yarn deploy:prod --dryrun
```

And then look for at the terminal logs for production website to view, e.g.:

```sh
[deploy:production] Publish success for: https://formidable.com/open-source/spectacle
```

If you want to do a manual deploy from localdev, use the appropriate AWS IAM CI user (in this case an example lander):

```sh
$ aws-vault exec fmd-{LANDER_NAME}-ci -- \
  yarn deploy:prod --dryrun
```

_Note_: Localdev deploys will skip GitHub deployment PR integration.

#### Production Archives

To aid with rollbacks and disaster recovery, uploading to production additionally creates a tarball of all of the relevant website files that are uploaded to a separate S3 bucket.

Archives are named in the format:

```
s3://{production.bucket}-archives/{production.domain}/{site.basePath}/archive-{DATE_NUM}-{DATE}-{GIT_SHA}-{GIT_STATE}.tar.gz
```

Where the parts are as follows:

* `DATE` is the ISO8601 deployment date in GMT
* `DATE_NUM` is a special number based on milliseconds since epoch that decreases as the number increases / dates get later. The use of `DATE_NUM` is to keep the most recent archives at the front of a bucket listing lexicographically, as front-to-back querying is the only efficient operation in S3.
* `GIT_SHA` is the short 7-character git hash of the deployed version
* `GIT_STATE` is an indication of whether git state is `clean` (no changes introduced locally) or `dirty`.

We additionally store metadata on the archive objects, e.g.:

```js
{
  "x-amz-meta-deploy-date": "2020-06-04T20:30:03.636Z",
  "x-amz-meta-deploy-type": "deploy",
  "x-amz-meta-build-job-id": "343824144",
  "x-amz-meta-build-job-url": "https://travis-ci.com/FormidableLabs/spectacle/jobs/343824144",
  "x-amz-meta-git-user-name": "Travis CI User",
  "x-amz-meta-git-user-email": "travis@example.org",
  "x-amz-meta-git-branch": "master",
  "x-amz-meta-git-commit-date": "2020-06-04T20:25:58.000Z",
  "x-amz-meta-git-sha": "e15c7688118826b533a4720c689607da78396842",
  "x-amz-meta-git-state": "clean",
  "x-amz-meta-git-sha-short": "e15c768"
}
```

Some complexities worth mentioning:

* **Rolling back**: Our archives only contain files from the build (typically `dist`). This means things like redirects, metadata, cache settings, etc. are not contained usefully in the archive. Accordingly, the pristine way to do a rollback is also to checkout the source repo (lander or base website) at the deployed hash found in the archive file name at `GIT_SHA` and in metadata headers at `git-sha`.

### Archives

Get a list of production archives that can be rolled back to. This action is intended to only be run from the CLI by a user intending to examine completed deployments / evaluate rollback options.

```sh
# List 10 most recent archives
$ aws-vault exec fmd-{LANDER_NAME}-ci -- \
  formideploy archives

# List 2 archives starting on/after 2020-06-04T21:27:44.409Z date (UTC)
$ aws-vault exec fmd-{LANDER_NAME}-ci -- \
  formideploy archives --start 2020-06-04T21:27:44.409Z --limit 2
```

Sample output:

```md
[archives] Found 6 archives:

| Deploy Date              | Type   | Git SHA | Git State | Name                                                              |
| ------------------------ | ------ | ------- | --------- | ----------------------------------------------------------------- |
| 2020-06-05T02:23:26.965Z | deploy | 3a9319f | clean     | archive-8638408676193035-20200605-022326-965-3a9319f-clean.tar.gz |
| 2020-06-05T02:22:34.842Z | deploy | 3a9319f | clean     | archive-8638408676245158-20200605-022234-842-3a9319f-clean.tar.gz |
| 2020-06-05T02:21:57.429Z | deploy | 3a9319f | clean     | archive-8638408676282571-20200605-022157-429-3a9319f-clean.tar.gz |
| 2020-06-04T21:27:44.409Z | deploy | bf41536 | clean     | archive-8638408693935591-20200604-212744-409-bf41536-clean.tar.gz |
| 2020-06-04T20:30:03.636Z | deploy | e15c768 | clean     | archive-8638408697396364-20200604-203003-636-e15c768-clean.tar.gz |
| 2020-06-04T19:55:56.390Z | deploy | a151521 | clean     | archive-8638408699443610-20200604-195556-390-a151521-clean.tar.gz |
```

[npm_img]: https://badge.fury.io/js/formideploy.svg
[npm_site]: http://badge.fury.io/js/formideploy
[trav_img]: https://api.travis-ci.com/FormidableLabs/formideploy.svg
[trav_site]: https://travis-ci.com/FormidableLabs/formideploy
