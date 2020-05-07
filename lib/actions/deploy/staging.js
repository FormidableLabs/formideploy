"use strict";

/**
 * Deploy static build to staging.
 */

const path = require("path");
const chalk = require("chalk");
const execa = require("execa");

const SURGE_PATH = require.resolve("surge/lib/cli");

const { config, validate } = require("../../config");
const { build, domain, site } = config;
const { getLoggers, exec } = require("../../util");
const { Deployment } = require("../../github/deployment");

const { log, error } = getLoggers("deploy:staging");

const checkAuthenticated = async () => {
  log("Checking authentication status");
  const { stdout } = await execa(SURGE_PATH, ["whoami"]);
  if (!stdout || stdout.includes("Not Authenticated")) {
    throw new Error("Environment is missing surge credentials");
  }
};

const staging = async ({ dryrun }) => {
  await validate(config);

  // Despite surge being a Node.js library, we opt to shell exec it instead of
  // using the underlying interface because it is quite difficult to hook into
  // the publishing lifecycle for API usage and its error-handling is littered
  // with `process.exit()` making it very dangerous to use in the same
  // process. Plus, the external shell API is pretty simple. :)
  const cmd = SURGE_PATH;
  const args = ["publish", "--project", path.resolve(build.dir), "--domain", domain.staging];
  const url = `https://${path.join(domain.staging, site.basePath)}`;

  // Check short-circuits.
  if (dryrun) {
    log(chalk `{yellow Skipping deployment} (dryrun): {gray ${[cmd, ...args].join(" ")}}`);
    return;
  } else if (!build.id) {
    // eslint-disable-next-line max-len
    log(chalk `{yellow Skipping deployment} (CI): CI did not provide a {gray build.id} value (e.g., merge or master build)`);
    return;
  }

  // Notification start
  const deployment = new Deployment({ environment: `staging-${build.id}`, url, log, error });
  const deploymentId = await deployment.start();

  // Check authentication.
  await checkAuthenticated();

  // Publish.
  log(chalk `Publishing build from "{cyan ${build.path}}" to staging: {cyan.underline ${url}}`);
  const err = await exec({ cmd, args, log }).catch((e) => e);

  // Logging, notifications
  const state = err ? "failure" : "success";
  log(chalk `Publish {${err ? "red" : "green"} ${state}} for: {cyan.underline ${url}}`);
  if (deploymentId) {
    await deployment.finish({ state, deploymentId });
  }

  // Bail on error.
  if (err) { throw err; }
};

module.exports = {
  staging
};
