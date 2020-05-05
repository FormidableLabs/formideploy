"use strict";

const path = require("path");
const chalk = require("chalk");

// Configuration override formats.
const CONFIGS = [
  "formideploy.config.js"
];

const getOverride = () => {
  for (const cfgPath of CONFIGS) {
    try {
      return require(path.resolve(cfgPath)); // eslint-disable-line global-require
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") { throw err; }
    }
  }

  const cfgs = CONFIGS.map((c) => chalk.gray(c)).join(", ");
  throw new Error(`Must provide local project configuration file: ${cfgs}`);
};

// Defaults.
let config = {
  build: {
    // Build output directory.
    dir: "dist"
  },
  site: {
    // [REQUIRED] Location to serve from on website.
    basePath: null
  }
};

// Project overrides.
const override = getOverride();
config = override(config);

module.exports = config;
