"use strict";

/**
 * Deploy static build to production.
 */

const path = require("path");
const chalk = require("chalk");

const { config, validate } = require("../../config");
const { build, site, production: { domain, bucket } } = config;
const { getLoggers, exec, gitInfo } = require("../../util");

const { log } = getLoggers("deploy:production");

const AWS_DRY_RUN_FLAG = "--dryrun";
const AWS_EXCLUDES = ["*.DS_Store*"];

// Cache values (in seconds)
// TODO(15): Implement better caching.
// https://github.com/FormidableLabs/formideploy/issues/15
const CACHE_MAX_AGE_DEFAULT = 10 * 60; // eslint-disable-line no-magic-numbers

const awsPublish = async ({ dryrun, url }) => {
  // AWS' S3 sync is not available from the Node `aws-sdk`. So we exec the CLI.
  //
  // TODO: Also hard-code `dryrun` :P
  // TODO: Enhanced excludes via config for `formidable.com`
  //
  const cmd = "aws";
  const args = [
    "s3",
    "sync",
    dryrun ? AWS_DRY_RUN_FLAG : "",
    "--cache-control",
    `max-age=${CACHE_MAX_AGE_DEFAULT},public`,
    "--delete",
    ...AWS_EXCLUDES.reduce((m, exc) => m.concat(["--exclude", exc]), []),
    build.path,
    `s3://${path.join(bucket, site.basePath)}`
  ].filter(Boolean);

  // Sync files.
  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);
  await exec({ cmd, args, log });

  // TODO(production): Set longer TTLs on hashed assets.
  log(chalk `Setting longer TTLs on {cyan TODO_NUMBER} hashed assets`);

  // TODO(production): Create redirects.
  log(chalk `Creating {cyan TODO_NUMBER} redirects`);

  // TODO(production): Invalidate smallest applicable CDN cache path
  log(chalk `Invalidating CDN cache path {cyan TODO_PATH}`);
};

const production = async ({ dryrun }) => {
  await validate(config);

  const url = `https://${path.join(domain, site.basePath)}`;

  const gitMeta = await gitInfo();
  console.log("TODO HERE", { gitMeta });
  throw new Error("TODO RETROFIT DEPLOYMENT");

  // // Notification start
  // const deployment = new Deployment({
  //   environment: "production", url, log, error
  // });
  // await deployment.start();

  // TODO: Need to get upstream reference parent branch (usually master).
  // TODO: Could use either (1) git or (2) CI env vars to tell what branch / sha / etc.

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
