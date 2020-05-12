"use strict";

/**
 * Deploy static build to production.
 */

const path = require("path");
const chalk = require("chalk");

const { config, validate } = require("../../config");
const { build, site, production: { domain, bucket } } = config;
const { getLoggers, exec } = require("../../util");

const { log } = getLoggers("deploy:production");

const awsPublish = async ({ dryrun, url }) => {
  // AWS' S3 sync is not available from the Node `aws-sdk`. So we exec the CLI.
  const cmd = "aws";
  const args = ["s3", "ls", bucket];
  if (dryrun) {
    // eslint-disable-next-line max-len
    return void log(chalk `{yellow Skipping deployment} (dryrun): {gray ${[cmd, ...args].join(" ")}}`);
  }

  // Publish.
  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);
  // TODO: Implement
  await exec({ cmd: "echo", args: ["TODO", cmd, ...args], log });
};

const production = async ({ dryrun }) => {
  await validate(config);

  const url = `https://${path.join(domain, site.basePath)}`;

  // // Notification start
  // const deployment = new Deployment({
  //   environment: "production", url, log, error
  // });
  // await deployment.start();

  // TODO: Need to get upstream reference parent branch (usually master).
  // TODO: Could use either (1) git or (2) CI env vars to tell what branch / sha / etc.

  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);

  // Publish.
  const err = await awsPublish({ dryrun, url }).catch((e) => e);

  // Logging, notifications
  const state = err ? "failure" : "success";
  log(chalk `Publish {${err ? "red" : "green"} ${state}} for: {cyan.underline ${url}}`);
  // TODO: await deployment.finish({ state });

  // Bail on error.
  if (err) { throw err; }
};

module.exports = {
  production
};
