"use strict";

/**
 * Deploy static build to production.
 */

const path = require("path");
const chalk = require("chalk");

const { config, validate } = require("../../config");
const { build, site, production: { domain, bucket } } = config;
const { getLoggers, getFiles, exec } = require("../../util");
const { Deployment } = require("../../github/deployment");

const { log, error } = getLoggers("deploy:production");

const AWS_DRY_RUN_FLAG = "--dryrun";
const AWS_EXCLUDES = ["*.DS_Store*"];

// Infer "this file name has a hash value based on unique contents".
// _Note_: Old version of Gatsby would run afoul with this detection as they
// hashed based on _source_ but not _actually produced_ contents.
const HASHED_FILE_RE = /[/.][a-f0-9]{8,}\.[a-z]+$/;

// Cache values (in seconds)
// TODO(15): Implement better caching.
// https://github.com/FormidableLabs/formideploy/issues/15
const CACHE_MAX_AGE_DEFAULT = 10 * 60; // eslint-disable-line no-magic-numbers
const CACHE_MAX_AGE_HASHED = 365 * 24 * 60 * 60; // eslint-disable-line no-magic-numbers

const awsPublish = async ({ dryrun, url }) => {
  // AWS' S3 sync is not available from the Node `aws-sdk`. So we exec the CLI.
  //
  // TODO: Also hard-code `dryrun` :P
  // TODO: Enhanced excludes via config for `formidable.com`
  //
  const cmd = "aws";
  const s3Bucket = `s3://${bucket}`;
  const s3Dest = `s3://${path.join(bucket, site.basePath)}`;

  // Sync files.
  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);
  await exec({
    cmd,
    args: [
      "s3",
      "sync",
      dryrun ? AWS_DRY_RUN_FLAG : "",
      "--cache-control",
      `max-age=${CACHE_MAX_AGE_DEFAULT},public`,
      "--delete",
      ...AWS_EXCLUDES.reduce((m, exc) => m.concat(["--exclude", exc]), []),
      build.path,
      s3Dest // Copy to nested destination for landers
    ].filter(Boolean),
    log
  });

  // Set longer TTLs on hashed assets.
  //
  // Do a "fake" copy within the bucket to force metadata updates.
  const files = await getFiles({ dir: build.dir });
  const hashedPaths = files.filter((f) => HASHED_FILE_RE.test(f));
  const hashedIncludes = hashedPaths
    .map((f) => ["--include", path.relative(build.dir, f)])
    .reduce((m, a) => m.concat(a), []);

  log(chalk `Setting longer TTLs on {cyan ${hashedPaths.length}} hashed assets`);
  await exec({
    cmd,
    args: [
      "s3",
      "cp",
      dryrun ? AWS_DRY_RUN_FLAG : "",
      "--recursive",
      "--metadata-directive",
      "REPLACE",
      "--cache-control",
      `max-age=${CACHE_MAX_AGE_HASHED},public`,
      "--exclude",
      "*",
      ...hashedIncludes,
      s3Bucket, // Use root path here because hashed path are relative to root
      s3Bucket
    ].filter(Boolean),
    log
  });

  // TODO(production): Create redirects.
  log(chalk `Creating {cyan TODO_NUMBER} redirects`);

  // TODO(production): Invalidate smallest applicable CDN cache path
  log(chalk `Invalidating CDN cache path {cyan TODO_PATH}`);
};

const production = async ({ dryrun }) => {
  await validate(config);

  const url = `https://${path.join(domain, site.basePath)}`;

  // Notification start
  const deployment = new Deployment({ environment: "production", url, dryrun, log, error });
  await deployment.start();

  // Publish.
  const err = await awsPublish({ dryrun, url }).catch((e) => e);

  // Logging, notifications
  const state = err ? "failure" : "success";
  log(chalk `Publish {${err ? "red" : "green"} ${state}} for: {cyan.underline ${url}}`);
  await deployment.finish({ state });

  // Bail on error.
  if (err) { throw err; }
};

module.exports = {
  production
};
