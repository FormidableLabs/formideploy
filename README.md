formideploy
===========

[![npm version][npm_img]][npm_site]
[![Travis Status][trav_img]][trav_site]

Deployment helpers for everything Formidable website-related. This tool helps our base website and open source landers projects:

* Serve a production build in localdev
* Deploy the build to staging (`surge.sh`)
* Deploy the build to production (AWS)

## Usage

```
Usage: formideploy <action> [options]

Actions: (<action>)
  serve         Run local server from static build directory
  deploy        Deploy build directory to website

Options:
  --staging       Deploy build to staging site.          [boolean]
  --production    Deploy build to staging production.    [boolean]
  --dryrun        Don't actually run deployment actions. [boolean]
  --port          Port to run local server on.           [number] [default: 5000]
  --help, -h      Show help                              [boolean]
  --version, -v   Show version number                    [boolean]

Examples:
  formideploy serve                           Serve build directory on port 5000.
  formideploy deploy --staging                Deploy build to staging.
  formideploy deploy --production --dryrun    Simulate production build deploy.
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

### CI configuration

The following section discusses how to hook up staging and production deploys in your CI.

#### Secrets

We maintain our secrets in 1password and the relevant credentials can be found in the `Individual Contributors` vault. Most of the secrets we need are environment variables that need to be added to CI.

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

#### Staging Deploy CI

- [ ] `TODO: Getting secrets from 1password.`
- [ ] `TODO: Integrating into Travis.`
- [ ] `TODO(10): Integrating into CircleCI. (urql)` (https://github.com/FormidableLabs/formideploy/issues/10)

### Localdev configuration

- [ ] `TODO: Localdev - aws-cli, aws-vault, etc.`

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

Deploy your build (at `build.dir`) to `https://{domain.staging}/{site.basePath)}` with:

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

### Deploy: Production

- [ ] `TODO(3): Production deploy`

[npm_img]: https://badge.fury.io/js/formideploy.svg
[npm_site]: http://badge.fury.io/js/formideploy
[trav_img]: https://api.travis-ci.com/FormidableLabs/formideploy.svg
[trav_site]: https://travis-ci.com/FormidableLabs/formideploy
