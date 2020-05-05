"use strict";

const path = require("path");
const chalk = require("chalk");

// ============================================================================
// Configuration
// ============================================================================
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

// ============================================================================
// Helpers
// ============================================================================
const copy = (obj) => JSON.parse(JSON.stringify(obj));

const getConfig = () => {
  // Create a copy of defaults to allow safe mutation in overrides.
  const baseCfg = copy(DEFAULTS);

  // Check all configuration paths until we find one.
  for (const cfgPath of CONFIGS) {
    try {
      const override = require(path.resolve(cfgPath)); // eslint-disable-line global-require
      return override(baseCfg);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") { throw err; }
    }
  }

  // Couldn't find any valid configurations.
  const cfgs = CONFIGS.map((c) => chalk.gray(c)).join(", ");
  throw new Error(`Must provide local project configuration file: ${cfgs}`);
};

module.exports = getConfig();
