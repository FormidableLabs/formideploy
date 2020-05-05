formideploy
===========

[![npm version][npm_img]][npm_site]
[![Travis Status][trav_img]][trav_site]

Deployment helpers for everything Formidable website-related.

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
  "serve": "formideploy serve",
  "deploy:stage": "formideploy deploy --staging",
  "deploy:prod": "formideploy deploy --production",
}
```

And then you'll need to override some configuration variables. Open up [`lib/config.js`](./lib/config.js) and look for the `DEFAULTS` object and comments (particularly those prefixed with `[REQUIRED]`). You will need to override the defaults with a configuration file in the current working directory from which you run `formideploy` named `formideployrc.js`. The overrides can be either a function that takes as input the default configuration and mutates it, or an object which is deep merged into the defaults.

Here are both ways of doing the necessary overrides:

```js
// formideployrc.js (Object Version)
module.exports = {
  lander: {
    name: "spectacle"
  }
};
```

```js
// formideployrc.js (Function Version)
module.exports = (cfg) => {
  cfg.lander.name = "spectacle";
  return cfg;
};
```

### CI configuration
`
- [ ] `TODO: Getting secrets from 1password.`
- [ ] `TODO: Integrating into Travis.`

### Localdev configuration

- [ ] `TODO: Localdev - aws-cli, aws-vault, etc.`

## Actions

### Serve

Once you have configured `formideploy`, you can serve your production build (specified at `build.dir`) with:

```sh
$ formideploy serve
$ formideploy serve --port 3333
```

And then look for the terminal log message as to where to navigate to to see your lander / base website in action!

```sh
[serve] Serving build from "dist" at: http://localhost:5000/open-source/spectacle
```

### Deploy

- [ ] `TODO: Staging, prod deploys with dryrun`

[npm_img]: https://badge.fury.io/js/formideploy.svg
[npm_site]: http://badge.fury.io/js/formideploy
[trav_img]: https://api.travis-ci.com/FormidableLabs/formideploy.svg
[trav_site]: https://travis-ci.com/FormidableLabs/formideploy
