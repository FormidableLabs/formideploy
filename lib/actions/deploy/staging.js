"use strict";

/**
 * Deploy static build to staging.
 */

const path = require("path");
const { config, validate } = require("../../config");
const { build, domain, site } = config;
const { getLoggers } = require("../../util");

const { log } = getLoggers("deploy:staging");

const staging = async ({ dryrun }) => {
  await validate(config, { isDeploy: true });
  const url = path.join(config.domain.staging, config.site.basePath);

  log(`TODO(deploy:staging)${JSON.stringify({ dryrun, build, domain, site, url }, null, 2)}`);
};

module.exports = {
  staging
};
