"use strict";

/**
 * Deploy static build to staging.
 */

const { config, validate } = require("../../config");
const { getLoggers } = require("../../util");

const { log } = getLoggers("serve");

const deployStaging = async ({ dryrun }) => {
  await validate(config);

  log("TODO", { dryrun });
};

module.exports = {
  deployStaging
};
