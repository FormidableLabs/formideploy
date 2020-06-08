"use strict";

/**
 * List deployed archives.
 */

const os = require("os");
const path = require("path");

const chalk = require("chalk");
const strip = require("strip-ansi");
const table = require("markdown-table");

const { config, validate } = require("../config");
const {
  site: { basePath },
  production: { domain, bucket }
} = config;
const { exists } = require("../util/file");
const { getLoggers } = require("../util/log");
const { exec } = require("../util/process");
const { toDateNum, fromDateNum } = require("../util/time");
const { toCamel } = require("../util/string");

const { log } = getLoggers("archives");

const ARCHIVE_NAME_RE
  = /archive-([0-9]+?)-([0-9]{8}-[0-9]{6}-[0-9]{3})-([a-f0-9]{7})-(clean|dirty)\.(tar\.gz|json)/;

const getArchives = async ({ limit, start }) => {
  const prefix = [domain, basePath, "archive-"].filter(Boolean).join("/");
  const startAfter = `${prefix}${toDateNum(start)}`;

  const { stdout } = await exec({
    cmd: "aws",
    args: [
      "s3api",
      "list-objects-v2",
      "--bucket",
      `${bucket}-archives`,
      "--prefix",
      prefix,
      "--max-items",
      limit,
      "--start-after",
      startAfter
    ],
    opts: { stdio: "pipe" },
    log
  });

  const data = JSON.parse(stdout);
  return data.Contents.map((obj) => {
    const name = path.basename(obj.Key);

    // Parse parts:
    // archive-8638408676245158-20200605-022234-842-3a9319f-clean.tar.gz
    // archive-{DATE_NUM}-{DATE}-{GIT_SHA}-{DEPLOY_STATE}.{DEPLOY_TYPE}
    const [, dateNum,, gitSha, gitState, ext] = ARCHIVE_NAME_RE.exec(name) || [];
    if ([dateNum, gitSha, gitState, ext].some((v) => !v)) {
      throw new Error(`Could not parse archive name: ${obj.Key}`);
    }

    return {
      key: obj.Key,
      name,
      meta: {
        deployDate: fromDateNum(dateNum).toISOString(),
        deployType: ext === "tar.gz" ? "deploy" : "rollback",
        gitSha,
        gitState
      }
    };
  });
};

const displayArchives = async ({ limit, start }) => {
  const objs = await getArchives({ limit, start });
  const results = table(
    [
      ["Deploy Date", "Type", "Git SHA", "Git State", "Name"].map((s) => chalk.gray.bold(s)),
      ...objs.map(({ name, meta: { deployDate, deployType, gitSha, gitState } }) =>
        [
          deployDate.split("").map((c) => (/[TZ]/).test(c) ? chalk.gray(c) : c).join(""),
          deployType === "deploy" ? chalk.green(deployType) : chalk.red(deployType),
          gitSha,
          gitState === "clean" ? chalk.green(gitState) : chalk.red(gitState),
          chalk.cyan(name)
        ]
      )
    ],
    {
      stringLength: (cell) => strip(cell).length // fix alignment with chalk.
    }
  );

  return chalk `Found {cyan ${objs.length}} archives:\n\n${results}`;
};

const getArchiveMeta = async ({ archive }) => {
  const archivePath = [domain, basePath, archive].filter(Boolean).join("/");

  const { stdout } = await exec({
    cmd: "aws",
    args: [
      "s3api",
      "head-object",
      "--bucket",
      `${bucket}-archives`,
      "--key",
      archivePath
    ],
    opts: { stdio: "pipe" },
    log
  });

  const obj = JSON.parse(stdout);
  return {
    name: archivePath,
    meta: Object.entries(obj.Metadata)
      .sort()
      .reduce((m, [k, v]) => Object.assign(m, { [toCamel(k)]: v }), {})
  };
};

const downloadArchive = async ({ archive }) => {
  const archivePath = [domain, basePath, archive].filter(Boolean).join("/");
  const tmpDir = os.tmpdir();
  const zipPath = path.join(tmpDir, "formideploy-zips", archivePath);
  const build = {
    base: path.join(tmpDir, "formideploy-builds", domain),
    full: path.join(tmpDir, "formideploy-builds", [domain, basePath].filter(Boolean).join("/"))
  };

  // Make intermediate dirs.
  await exec({ cmd: "mkdir", args: ["-p", path.dirname(zipPath)], log });
  if (await exists(zipPath)) {
    log(chalk `Found cached archive at: {cyan ${zipPath}} `);
  } else {
    log(chalk `Downloading archive to: {cyan ${zipPath}} `);
    await exec({
      cmd: "aws",
      args: [
        "s3",
        "cp",
        `s3://${bucket}-archives/${archivePath}`,
        zipPath
      ],
      log
    });
  }

  // Wipe and unpack.
  await exec({ cmd: "rm", args: ["-rf", build.full], log });
  await exec({ cmd: "mkdir", args: ["-p", build.full], log });

  await exec({
    cmd: "tar",
    args: ["-xzf", zipPath],
    opts: { cwd: build.full },
    log
  });

  return {
    zip: {
      full: zipPath
    },
    build
  };
};

const displayArchiveMeta = ({ name, meta }) => {
  const maxKeyLen = Object.keys(meta).reduce((m, k) => Math.max(m, k.length), 0) + 1;
  const results = Object.entries(meta)
    .map(([key, val]) => chalk `* ${`${key}:`.padEnd(maxKeyLen, " ")} {green ${val}}`)
    .join("\n");
  return chalk `Metadata for archive: {cyan ${name}}\n${results}`;
};

const archives = async ({ limit, start, archive }) => {
  await validate(config);

  const report = await (
    archive
      ? getArchiveMeta({ archive }).then((meta) => displayArchiveMeta(meta))
      : displayArchives({ limit, start })
  );
  log(report);
};

module.exports = {
  archives,
  getArchiveMeta,
  displayArchiveMeta,
  downloadArchive
};
