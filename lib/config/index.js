"use strict";

const path = require("path");
const chalk = require("chalk");
const { exists } = require("../util/file");
const DEFAULTS = require("./defaults");

// ============================================================================
// Configuration
// ============================================================================
// Configuration override formats.
const CONFIGS = [
  "formideploy.config.js"
];

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

// ============================================================================
// Core
// ============================================================================
// Infer build number from Travis, CircleCI environment variables.
const getBuildId = () => {
  const { TRAVIS_BUILD_ID, CIRCLE_BUILD_NUM } = process.env;

  // Travis
  if (TRAVIS_BUILD_ID) {
    return TRAVIS_BUILD_ID;
  }

  // CircleCI
  if (CIRCLE_BUILD_NUM) {
    return CIRCLE_BUILD_NUM;
  }

  return null;
};

// Infer PR number from Travis, CircleCI environment variables.
const getCiChangeId = () => {
  const {
    TRAVIS_PULL_REQUEST,
    CI_PULL_REQUEST = "",
    CIRCLE_PULL_REQUEST = ""
  } = process.env;

  // Travis
  if (TRAVIS_PULL_REQUEST && TRAVIS_PULL_REQUEST !== "false") {
    return TRAVIS_PULL_REQUEST;
  }

  // CircleCI
  const circleParts = (CIRCLE_PULL_REQUEST || CI_PULL_REQUEST).split("/");
  const circleNum = circleParts[circleParts.length - 1];
  if (circleNum) {
    return circleNum;
  }

  return null;
};

const getChangeId = () => {
  const { FORMIDEPLOY_BUILD_ID } = process.env;

  // Manual override
  if (FORMIDEPLOY_BUILD_ID) {
    return FORMIDEPLOY_BUILD_ID;
  }

  return getCiChangeId();
};

const assertConfigValue = (val, name) => {
  if (val) { return val; }
  throw new Error(chalk `Missing config value for {gray ${name}}`);
};

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
  throw new Error(chalk `Must provide local project configuration file: {gray ${cfgs}}`);
};

// Post-process configuration file with mutations.
// eslint-disable-next-line complexity
const getConfig = () => {
  const cfg = getRawConfig();

  // General: first pass.
  cfg.build.buildId = cfg.build.buildId || getBuildId();
  cfg.build.changeId = cfg.build.changeId || getChangeId();
  cfg.build.isPullRequest = cfg.build.isPullRequest !== null
    ? cfg.build.isPullRequest
    : !!getCiChangeId();
  cfg.github.repo = cfg.github.repo || cfg.lander.name || "formidable.com";

  // Lander vs. base site specifics.
  if (cfg.lander.name) {
    // Lander mutations
    cfg.site.basePath = cfg.site.basePath || `open-source/${cfg.lander.name}`;
    cfg.staging.domain = cfg.staging.domain
      || `formidable-com-${cfg.lander.name}-staging-${cfg.build.changeId}.surge.sh`;
  } else {
    // Base website mutations
    cfg.site.basePath = cfg.site.basePath || "";
    cfg.staging.domain = cfg.staging.domain
      || `formidable-com-staging-${cfg.build.changeId}.surge.sh`;
  }

  // General: second pass.
  assertConfigValue(cfg.build.dir, "build.dir");
  cfg.build.path = cfg.build.path || path.join(cfg.build.dir, cfg.site.basePath);

  return cfg;
};

// Validate needed parts of all real actions.
const validate = async (config) => {
  // General
  if (!await exists(config.build.path)) {
    throw new Error(chalk `Build output missing at: {gray ${config.build.path}}`);
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
