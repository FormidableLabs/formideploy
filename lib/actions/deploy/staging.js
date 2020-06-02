"use strict";

/**
 * Deploy static build to staging.
 */

const path = require("path");
const chalk = require("chalk");
const execa = require("execa");

const SURGE_PATH = require.resolve("surge/lib/cli");

const { config, validate } = require("../../config");
const { build, site, staging: { domain } } = config;
const { getLoggers } = require("../../util/log");
const { exec } = require("../../util/process");
const { Deployment } = require("../../github/deployment");

const { log, error } = getLoggers("deploy:staging");

const isAuthenticated = async () => {
  log("Checking authentication status");
  const { stdout } = await execa(SURGE_PATH, ["whoami"]);
  if (!stdout || stdout.includes("Not Authenticated")) {
    return false;
  }

  return true;
};

const surgePublish = async ({ dryrun, url }) => {
  // Despite surge being a Node.js library, we opt to shell exec it instead of
  // using the underlying interface because it is quite difficult to hook into
  // the publishing lifecycle for API usage and its error-handling is littered
  // with `process.exit()` making it very dangerous to use in the same
  // process. Plus, the external shell API is pretty simple. :)
  const cmd = SURGE_PATH;
  const args = ["publish", "--project", build.dir, "--domain", domain];
  if (dryrun) {
    // eslint-disable-next-line max-len
    return void log(chalk `{yellow Skipping deployment} (dryrun): {gray ${[cmd, ...args].join(" ")}}`);
  }

  // Publish.
  log(chalk `Publishing build from "{cyan ${build.path}}" to staging: {cyan.underline ${url}}`);
  await exec({ cmd, args, log });
};

// eslint-disable-next-line max-statements
const staging = async ({ dryrun }) => {
  await validate(config);

  // Deploy Date (NUM) + Hash (?) + Git Dirty (?)
  const { gitInfo } = require("../../util/git");
  const git = await gitInfo();
  const archiveMeta = {
    "git-user-name": git.userName,
    "git-user-email": git.userEmail,
    "git-sha": git.sha,
    "git-sha-short": git.shaShort,
    "git-branch": git.branch,
    "git-commit-date": git.commitDate,
    "git-state": git.state
  };

  console.log("TODO HERE RAW GIT", git);
  console.log("TODO HERE STRINGIFIED", JSON.stringify({
    archiveMeta
  }, null, 2));
  return; // TODO: REMOVE

  const url = `https://${path.join(domain, site.basePath)}`;

  // Check short-circuits.
  if (!build.id) {
    // eslint-disable-next-line max-len
    return void log(chalk `{yellow Skipping deployment} (CI): CI did not provide a {gray build.id} value (e.g., merge or master build)`);
  }

  // Notification start
  const deployment = new Deployment({
    environment: `staging-${build.id}`, url, dryrun, log, error
  });
  await deployment.start();

  // Check if authenticated.
  let err;
  let state = "skipped";
  let msg = chalk.yellow(state);
  if (await isAuthenticated()) {
    // Publish.
    err = await surgePublish({ dryrun, url }).catch((e) => e);
    state = err ? "failure" : "success";
    msg = chalk[err ? "red" : "green"](state);
  }

  // Logging, notifications
  log(chalk `Publish ${msg} for: {cyan.underline ${url}}`);
  await deployment.finish({ state });

  // Bail on error.
  if (err) { throw err; }
};

module.exports = {
  staging
};
