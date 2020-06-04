"use strict";

/**
 * List deployed archives.
 */

const { config, validate } = require("../config");
const { getLoggers } = require("../util/log");

const { log } = getLoggers("archives");


const archives = async () => {
  await validate(config);

  log("TODO: archives");
};

module.exports = {
  archives
};
