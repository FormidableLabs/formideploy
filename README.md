formideploy
===========

[![npm version][npm_img]][npm_site]
[![Travis Status][trav_img]][trav_site]

Deployment helpers for everything Formidable website-related.

## Usage

Install the library.

```sh
$ yarn add --dev formideploy
```

Check out basic usage:

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

Formideploy helps serve and deploy for our main website ([`formidable.com`](https://formidable.com)) and our various project landers (e.g., [`spectacle/docs`]() served at [`formidable.com/open-source/spectacle`](https://formidable.com/open-source/spectacle)).

Project integration entails configuration within a repository and secrets placed into CI.

### Repository configuration

- [ ] TODO: Config overrides.

### CI configuration

- [ ] TODO: Getting secrets from 1password.
- [ ] TODO: Integrating into Travis.

### Localdev configuration

- [ ] TODO: Localdev - aws-cli, aws-vault, etc.

## Actions

### Serve

- [ ] TODO: Localdev serving

### Deploy

- [ ] TODO: Staging, prod deploys with dryrun


[npm_img]: https://badge.fury.io/js/formideploy.svg
[npm_site]: http://badge.fury.io/js/formideploy
[trav_img]: https://api.travis-ci.com/FormidableLabs/formideploy.svg
[trav_site]: https://travis-ci.com/FormidableLabs/formideploy
