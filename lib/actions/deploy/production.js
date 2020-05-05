"use strict";

/**
 * Deploy static build to production.
 */

const { config, validate } = require("../../config");
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:production");

const production = async ({ dryrun }) => {
  await validate(config);

  log("TODO(deploy:production)", { dryrun });
};

module.exports = {
  production
};
