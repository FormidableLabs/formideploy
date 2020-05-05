"use strict";

const path = require("path");
const chalk = require("chalk");

// Configuration override formats.
const CONFIGS = [
  "formideploy.config.js"
];

// Defaults.
const DEFAULTS = {
  build: {
    // Build output directory.
    dir: "dist"
  },
  site: {
    // [REQUIRED] Location to serve from on website.
    basePath: null
  }
};

// Wrapper.
const getConfig = () => {
  for (const cfgPath of CONFIGS) {
    try {
      const override = require(path.resolve(cfgPath)); // eslint-disable-line global-require
      return override(DEFAULTS);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") { throw err; }
    }
  }

  const cfgs = CONFIGS.map((c) => chalk.gray(c)).join(", ");
  throw new Error(`Must provide local project configuration file: ${cfgs}`);
};

module.exports = getConfig();
