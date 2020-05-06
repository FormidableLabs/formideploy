"use strict";

/**
 * Deploy static build to production.
 */

const path = require("path");
const chalk = require("chalk");

const { config, validate } = require("../../config");
const { build, domain, site } = config;
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:production");

const production = async ({ dryrun }) => {
  await validate(config);

  const url = `https://${path.join(domain.production, site.basePath)}`;
  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);

  // TODO(3): Deploy to production.
  // https://github.com/FormidableLabs/formideploy/issues/3
  log("TODO(deploy:production)", { dryrun });
};

module.exports = {
  production
};
