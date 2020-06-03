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

  // TODO: REMOVE START
  const { toDash } = require("../../util/string");
  const { toDateNum, toDatePath } = require("../../util/time");
  const { gitInfo } = require("../../util/git");
  const bucket = "TODO_BUCKET";

  const deployDate = new Date();
  const git = await gitInfo();
  const gitMeta = Object.entries(git)
    .reduce((m, [k, v]) => Object.assign(m, { [`git-${toDash(k)}`]: v }), {});

  const archiveBucket = `${bucket}-archives`;
  const archiveName
    = `archive-${toDateNum(deployDate)}-${toDatePath(deployDate)}-${git.shaShort}-${git.state}.tar.gz`;
  const archiveMeta = {
    "deploy-date": deployDate.toISOString(),
    ...gitMeta
  };

  console.log("TODO HERE STAGING", JSON.stringify({
    archiveBucket,
    archiveName,
    archiveMeta
  }, null, 2));
  // TODO: REMOVE END

  const url = `https://${path.join(domain, site.basePath)}`;

  // Check short-circuits.
  if (!build.changeId) {
    // eslint-disable-next-line max-len
    return void log(chalk `{yellow Skipping deployment} (CI): CI did not provide a {gray build.changeId} value (e.g., merge or master build)`);
  }

  // Notification start
  const deployment = new Deployment({
    environment: `staging-${build.changeId}`, url, dryrun, log, error
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
