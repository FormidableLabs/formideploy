"use strict";

/**
 * List deployed archives.
 */

const path = require("path");

const chalk = require("chalk");
const strip = require("strip-ansi");
const table = require("markdown-table");

const { config, validate } = require("../config");
const {
  site: { basePath },
  production: { domain, bucket }
} = config;
const { getLoggers } = require("../util/log");
const { exec } = require("../util/process");
const { toDateNum, fromDateNum } = require("../util/time");

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

const archives = async ({ limit, start }) => {
  await validate(config);

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

  log(chalk `Found {cyan ${objs.length}} archives:\n\n${results}`);
};

module.exports = {
  archives
};
