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
  await validate(config);

  const url = `https://${path.join(domain.staging, site.basePath)}`;
  const args = [
    "publish",
    "--project",
    path.resolve(build.dir),
    "--domain",
    domain.staging
  ];

  log(`TODO(deploy:staging)${JSON.stringify({ dryrun, url, args }, null, 2)}`);
};

module.exports = {
  staging
};
