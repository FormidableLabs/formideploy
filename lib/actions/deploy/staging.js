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

const checkAuthenticated = async ({ dryrun }) => {
  log("Checking authentication status");
  if (dryrun) { return; }

  const { stdout } = await execa(SURGE_PATH, ["whoami"]);
  if (!stdout || stdout.includes("Not Authenticated")) {
    throw new Error("Environment is missing surge credentials");
  }
};

const staging = async ({ dryrun }) => {
  await validate(config);

  // TODO(4): Add GH deployment / url comment.
  // https://github.com/FormidableLabs/formideploy/issues/4
  const url = `https://${path.join(domain.staging, site.basePath)}`;
  log(chalk `Publishing build from "{cyan ${build.path}}" to staging: {cyan.underline ${url}}`);

  if (!build.id) {
    // eslint-disable-next-line max-len
    log(chalk `{yellow Skipping deployment} (CI): CI did not provide a {gray build.id} value (e.g., merge or master build)`);
    return;
  }

  // Check authentication.
  await checkAuthenticated({ dryrun });

  // Notification start
  let deployment;
  let deploymentId;
  if (!build.isPullRequest) {
    log(chalk `{yellow Skipping notifications} (CI): Not a deployable pull request.`);
  } else {
    deployment = new Deployment({ log, error });
    const { branch, sha } = await deployment.ref;

    deploymentId = await deployment
      .start({ environment: "staging", branch, sha, url });
  }

  // Publish.
  // Despite surge being a Node.js library, we opt to shell exec it instead of
  // using the underlying interface because it is quite difficult to hook into
  // the publishing lifecycle for API usage and its error-handling is littered
  // with `process.exit()` making it very dangerous to use in the same
  // process. Plus, the external shell API is pretty simple. :)
  const cmd = SURGE_PATH;
  const args = [
    "publish",
    "--project",
    path.resolve(build.dir),
    "--domain",
    domain.staging
  ];

  if (dryrun) {
    log(chalk `{yellow Skipping deployment} (dryrun): {gray ${[cmd, ...args].join(" ")}}`);
    return;
  }

  await exec({ cmd, args, log })
    .catch((err) => err)
    .then((err) => {
      const _log = err ? error : log;
      const msg = err ? "red failure" : "green success";

      // Logging, notifications
      _log(chalk `Publish {${msg}} for: {cyan.underline ${url}}`);
      if (deployment) {
        log(`TODO: NOTIFICATION END: ${JSON.stringify({ deploymentId })}`);
      }

      // Bail on error.
      if (err) { throw err; }
    });
};

module.exports = {
  staging
};
