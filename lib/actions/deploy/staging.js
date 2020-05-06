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

  // Despite surge being a Node.js library, we opt to shell exec it instead of
  // using the underlying interface because it is quite difficult to hook into
  // the publishing lifecycle for API usage and its error-handling is littered
  // with `process.exit()` making it very dangerous to use in the same
  // process. Plus, the external shell API is pretty simple. :)
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
