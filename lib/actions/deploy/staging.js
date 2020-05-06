"use strict";

/**
 * Deploy static build to staging.
 */

const path = require("path");
const { config, validate } = require("../../config");
const { build, domain, site } = config.required;
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:staging");

const staging = async ({ dryrun }) => {
  await validate(config);

  const url = path.join(domain.staging, site.basePath);

  log(`TODO(deploy:staging)${JSON.stringify({ dryrun, config: config.raw }, null, 2)}`);
};

module.exports = {
  staging
};
