"use strict";

/**
 * Deploy static build to staging.
 */

const { config, validate } = require("../../config");
const { build, domain, site } = config;
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:staging");

const staging = async ({ dryrun }) => {
  await validate(config);

  log(`TODO(deploy:staging)${JSON.stringify({ dryrun, build, domain, site }, null, 2)}`);
};

module.exports = {
  staging
};
