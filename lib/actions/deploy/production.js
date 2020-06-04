"use strict";

/**
 * Deploy static build to production.
 */

const os = require("os");
const path = require("path");
const chalk = require("chalk");

const { config, validate } = require("../../config");
const {
  build,
  site: { basePath, redirects, excludes },
  production: { domain, bucket }
} = config;
const { write, getLoggers } = require("../../util/log");
const { getFiles } = require("../../util/file");
const { exec } = require("../../util/process");
const { gitInfo } = require("../../util/git");
const { toDash } = require("../../util/string");
const { toDateNum, toDatePath } = require("../../util/time");
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

const s3Path = (extra = "") => `s3://${path.join(bucket, basePath, extra)}`;

// Need to map a redirect to a full file that we'll create in s3.
// `path/to/dir/file.html` -> `path/to/dir/file.html`
// `path/to/dir/` -> `path/to/dir/index.hml`
// `path/to/dir` -> `path/to/dir/index.hml`
const redirectFile = (f) => path.extname(f) ? f : path.join(f, "index.html");

const isAuthenticated = () => exec({
  cmd: "aws",
  args: ["sts", "get-caller-identity"],
  opts: { stdio: "pipe" },
  log
})
  .then(() => true)
  .catch(() => false);

// Publish to AWS with redirects, CDN, etc.
// eslint-disable-next-line max-statements
const awsPublish = async ({ dryrun, url }) => {
  // AWS' S3 sync is not available from the Node `aws-sdk`. So we exec the CLI.
  const cmd = "aws";
  const dryrunFlag = dryrun ? AWS_DRY_RUN_FLAG : "";
  const s3Dest = s3Path();
  const s3cmd = async ({ args, dryrunMsg }) => {
    if (dryrun) {
      write(`(dryrun) ${dryrunMsg}\n`);
      return null;
    }

    const { stdout } = await exec({ cmd, args, opts: { stdio: "pipe" }, log });
    return JSON.parse(stdout);
  };

  // Sync files.
  log(chalk `Publishing build from "{cyan ${build.path}}" to production: {cyan.underline ${url}}`);
  await exec({
    cmd,
    args: [
      "s3",
      "sync",
      dryrunFlag,
      "--cache-control",
      `max-age=${CACHE_MAX_AGE_DEFAULT},public`,
      "--delete",
      // Re-upload size match files unless exact same timestamp.
      // We've had issues in the past where new files _should_ have been
      // uploaded, but weren't, so this helps mitigate the issue.
      "--exact-timestamps",
      // Aggregate built-in and configuration excludes, as well as redirect
      // files which should be preserved.
      ...[].concat(
        AWS_EXCLUDES,
        excludes.map((e) => `${e}${e.endsWith("/") ? "" : "/"}*`),
        Object.keys(redirects).map(redirectFile)
      ).reduce((m, exc) => m.concat(["--exclude", exc]), []),
      build.path,
      s3Dest // Copy to nested destination for landers
    ].filter(Boolean),
    log
  });

  // Set longer TTLs on hashed assets.
  //
  // Do a "fake" copy within the bucket to force metadata updates.
  const files = await getFiles({ dir: build.path });
  const hashedPaths = files.filter((f) => HASHED_FILE_RE.test(f));
  const hashedIncludes = hashedPaths
    .map((f) => ["--include", path.relative(build.path, f)])
    .reduce((m, a) => m.concat(a), []);

  log(chalk `Setting longer TTLs on {cyan ${hashedPaths.length}} hashed assets`);
  await exec({
    cmd,
    args: [
      "s3",
      "cp",
      dryrunFlag,
      "--recursive",
      "--metadata-directive",
      "REPLACE",
      "--cache-control",
      `max-age=${CACHE_MAX_AGE_HASHED},public`,
      "--exclude",
      "*",
      ...hashedIncludes,
      s3Dest,
      s3Dest
    ].filter(Boolean),
    log
  });

  // Create redirects.
  //
  // We do this with empty body `put-bucket` requests that create an empty
  // file in S3 with the metadata that causes website redirects.
  //
  // Test results with:
  // ```sh
  // $ curl -I https://formidable.com/services/performance/
  // HTTP/2 301
  // content-length: 0
  // date: Fri, 15 May 2020 21:36:46 GMT
  // location: /services/perf-and-auditing
  // server: AmazonS3
  // x-cache: Miss from cloudfront
  // via: 1.1 760139201585481b26f947c5f776103a.cloudfront.net (CloudFront)
  // x-amz-cf-pop: SEA19-C2
  // x-amz-cf-id: ah8c3MRNl9kcq4N_vQ-FaPEWy6jKA71W0EG7uEJzpuobhunsG0zxzg==
  // ```
  log(chalk `Creating {cyan ${Object.keys(redirects).length}} redirects`);

  const etags = await Promise.all(Object.entries(redirects).map(async ([src, dest]) => {
    const results = await s3cmd({
      args: [
        "s3api",
        "put-object",
        "--bucket",
        bucket,
        "--key",
        redirectFile(src),
        "--website-redirect-location",
        dest
      ],
      dryrunMsg: `redirect: ${s3Path(redirectFile(src))} to ${dest}`
    });

    return results ? results.ETag : results;
  }));
  log(chalk `Created {cyan ${Object.keys(redirects).length}} redirects. `
    + chalk `Etags: {gray ${etags.filter(Boolean).join(", ")}}`);

  // Invalidate smallest applicable CDN cache path
  //
  // We use a heuristic to get distribution to invalidate as follows:
  // 1. Assume `production.domain` matches value in `DistributionList.Items.[*].Aliases.Items`
  // 2. Assume all distributions fit within a single request.
  log(chalk `Finding CDN distribution for {cyan ${domain}}`);
  const dist = await s3cmd({
    args: [
      "cloudfront",
      "list-distributions",
      "--query",
      "DistributionList.Items[].{Id: Id, DomainName: DomainName, Aliases: Aliases}"
      + `[?contains(Aliases.Items, '${domain}')]`
    ],
    dryrunMsg: "list-distributions"
  })
    .then((dists) => {
      if (dists === null) { return { Id: "EMPTY", DomainName: "EMPTY" }; }
      if (dists.length === 1) { return dists[0]; }

      throw new Error("Expected exactly 1 matching distribution, found "
        + `${dists.length}: ${JSON.stringify(dists.map(({ Id }) => Id))}`);
    });

  const invalidatePath = path.join("/", basePath, "*");
  log(chalk `Invalidating CDN {gray ${dist.Id}} ({gray ${dist.DomainName}}) `
    + chalk `cache path {cyan ${invalidatePath}}`);
  const invalidation = await s3cmd({
    args: [
      "cloudfront",
      "create-invalidation",
      "--distribution-id",
      dist.Id,
      "--paths",
      invalidatePath
    ],
    dryrunMsg: `create-invalidation for ${dist.Id} of ${invalidatePath}`
  });

  if (invalidation) {
    log(chalk `Created invalidation for CDN {gray ${dist.Id}} ({gray ${dist.DomainName}}) `
    + chalk `with id {gray ${invalidation.Invalidation.Id}}`);
  }
};

// Produce all applicable archive information.
const getArchiveInfo = async () => {
  const deployDate = new Date();
  const git = await gitInfo();
  const gitMeta = Object.entries(git)
    .reduce((m, [k, v]) => Object.assign(m, { [`git-${toDash(k)}`]: v }), {});

  const name
    = `archive-${toDateNum(deployDate)}-${toDatePath(deployDate)}-${git.shaShort}-${git.state}.tar.gz`;
  const archivePath = `${domain}/${basePath}/${name}`;
  return {
    src: {
      path: build.path
    },
    zip: {
      path: path.join(os.tmpdir(), archivePath)
    },
    dest: {
      bucket: `${bucket}-archives`,
      name,
      path: archivePath
    },
    meta: {
      "deploy-date": deployDate.toISOString(),
      // TODO(20): Add `rollback` type when doing that source.
      // https://github.com/FormidableLabs/formideploy/issues/20
      "deploy-type": "deploy",
      "build-job-id": build.jobId,
      "build-job-url": build.jobUrl,
      ...gitMeta
    }
  };
};

const createArchive = async () => {
  const archive = await getArchiveInfo();

  log(chalk `Creating local archive {gray ${archive.zip.path}} from {gray ${archive.src.path}}`);
  await exec({ cmd: "mkdir", args: ["-p", path.dirname(archive.zip.path)], log });
  await exec({
    cmd: "tar",
    args: ["-czf", archive.zip.path, "."],
    opts: { cwd: archive.src.path },
    log
  });

  return archive;
};

const destroyArchive = async ({ archive }) => {
  console.log("TODO: IMPLEMENT destroyArchive", { archive });
};

const production = async ({ dryrun }) => {
  await validate(config);

  const url = `https://${path.join(domain, basePath)}`;
  const archiveInfo = await getArchiveInfo();

  console.log("TODO HERE PRODUCTION", JSON.stringify({
    archiveInfo
  }, null, 2));
  return; // TODO: REMOVE

  // Notification start
  const deployment = new Deployment({ environment: "production", url, dryrun, log, error });
  await deployment.start();

  // Check if authenticated.
  let archive; // TODO: Refactor to be `src` or something
  let err;
  let state = "skipped";
  let msg = chalk.yellow(state);
  if (await isAuthenticated()) {
    // TODO(archives): Provide an out for "no archive" deploy?
    // TODO(20): ROLLBACK - don't create a new archive?
    //
    // Create archive.
    archive = await createArchive();

    // Publish.
    err = await awsPublish({ dryrun, url, archive }).catch((e) => e);
    state = err ? "failure" : "success";
    msg = chalk[err ? "red" : "green"](state);
  }

  // Logging, notifications
  log(chalk `Publish ${msg} for: {cyan.underline ${url}}`);
  await deployment.finish({ state });
  await destroyArchive({ archive });

  // Bail on error.
  if (err) { throw err; }
};

module.exports = {
  createArchive, // TODO: REMOVE
  production
};
