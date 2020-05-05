"use strict";

const path = require("path");
const chalk = require("chalk");
const { exists } = require("./util");

// ============================================================================
// Configuration
// ============================================================================
// Configuration override formats.
const CONFIGS = [
  "formideploy.config.js"
];

// Defaults.
const DEFAULTS = {
  lander: {
    // [REQUIRED(LANDER)] If project is a lander, specify the package name here.
    // E.g. `spectacle`, `renature`, etc. This is currently also assumed to be
    // the GitHub repository name as well.
    //
    // If not specified, we will assume base website.
    name: null
  },
  build: {
    // Build output directory.
    dir: "dist",

    // Location / nested path of contained site. This is deployed to
    // `site.basePath`.
    //
    // If this value is left empty / null, it will default to:
    // `{build.dir}/{site.basePath}`.
    base: null
  },
  site: {
    // Location / nested path from which to serve the website.
    //
    // If this value is left empty / null, it will default to:
    // 1. `open-source/{lander.name}` if `lander.name` is specified
    // 2. "" if not (assumed to be base website)
    //
    // **Note**: `build.dir` output must match this value (e.g., if
    // ends up as `open-source/{lander.name}` the default value would mean that
    // `{build.dir}/open-source/{lander.name}` must exist and be servable / deployable).
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

// Get raw configuration file and merge defaults.
const getRawConfig = () => {
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

// Post-process configuration file with mutations.
const getConfig = () => {
  const cfg = getRawConfig();

  // Lander vs. base site specifics.
  if (cfg.lander.name) {
    // Lander mutations
    cfg.site.basePath = cfg.site.basePath || `open-source/${cfg.lander.name}`;
  } else {
    // Base website mutations
    cfg.site.basePath = cfg.site.basePath || "";
  }

  // General defaults.
  cfg.build.path = cfg.build.path || path.join(cfg.build.dir, cfg.site.basePath);

  return cfg;
};

// Validate needed parts of all real actions.
const validate = async (cfg) => {
  if (typeof cfg.site.basePath !== "string") {
    throw new Error(chalk `Missing required configuration: {gray site.basePath}`);
  }

  const buildPath = path.join(cfg.build.dir, cfg.site.basePath);
  if (!await exists(buildPath)) {
    throw new Error(chalk `Build output missing at: {cyan ${buildPath}}`);
  }
};

// ============================================================================
// Exports
// ============================================================================
module.exports = {
  // Lazy, cached getter.
  // Could later do something more sophisticated with config cache.
  get config() {
    this._cachedConfig = this._cachedConfig || getConfig();
    return this._cachedConfig;
  },

  validate
};
