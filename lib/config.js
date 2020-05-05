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
// Simple deep copy.
const copy = (obj) => JSON.parse(JSON.stringify(obj));

// A simply, two-level deep merge.
// We assume the first object has **all** the keys we need.
const merge = (obj1, obj2) => Object.keys(obj1)
  .reduce((obj, key) => {
    Object.assign(obj[key], obj2[key]);
    return obj;
  }, copy(obj1));

const getConfig = () => {
  // Check all configuration paths until we find one.
  for (const cfgPath of CONFIGS) {
    try {
      const override = require(path.resolve(cfgPath)); // eslint-disable-line global-require

      // If function call it with a copy of our defaults, otherwise, merge.
      return typeof override === "function"
        ? override(copy(DEFAULTS))
        : merge(DEFAULTS, override);
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") { throw err; }
    }
  }

  // Couldn't find any valid configurations.
  const cfgs = CONFIGS.map((c) => chalk.gray(c)).join(", ");
  throw new Error(`Must provide local project configuration file: ${cfgs}`);
};

module.exports = getConfig();
