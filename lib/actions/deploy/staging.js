"use strict";

/**
 * Deploy static build to staging.
 */

const { config, validate } = require("../../config");
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:staging");

const staging = async ({ dryrun }) => {
  await validate(config);

  log("TODO(deploy:staging)", { dryrun });
};

module.exports = {
  staging
};
