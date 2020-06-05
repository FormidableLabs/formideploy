"use strict";

/**
 * List deployed archives.
 */

const path = require("path");
const { config, validate } = require("../config");
const {
  site: { basePath },
  production: { domain, bucket }
} = config;
const { getLoggers } = require("../util/log");
const { exec } = require("../util/process");
const { toCamel } = require("../util/string");
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
    let meta;
    const match = ARCHIVE_NAME_RE.exec(name);
    if (!match) {
      throw new Error(`Could not parse archive name: ${obj.Key}`);
    }

    const [, dateNum,, gitSha, gitState, ext] = match;
    if ([dateNum, gitSha, gitState, ext].some((v) => !v)) {
      throw new Error(`Could not parse archive name: ${obj.Key}`);
    }

    return {
      key: obj.Key,
      name,
      meta: {
        deployDate: fromDateNum(dateNum),
        deployType: ext === "tar.gz" ? "deploy" : "rollback",
        gitSha,
        gitState
      }
    };
  });
};

// TODO: REMOVE
const getMeta = async ({ objs }) => await Promise.all(objs.map((obj) =>
  exec({
    cmd: "aws",
    args: [
      "s3api",
      "head-object",
      "--bucket",
      `${bucket}-archives`,
      "--key",
      obj.Key
    ],
    opts: { stdio: "pipe" },
    log
  })
    .then(({ stdout }) => JSON.parse(stdout))
    .then((data) => ({
      path: obj.Key,
      name: path.basename(obj.Key),
      meta: Object.entries(data.Metadata)
        .sort()
        .reduce((m, [k, v]) => Object.assign(m, { [toCamel(k)]: v }), {})
    }))
));

const archives = async ({ limit, start }) => {
  await validate(config);

  const objs = await getArchives({ limit, start });
  // const meta = await getMeta({ objs });
  console.log("TODO: archives", JSON.stringify({ objs, limit, start }, null, 2));
};

module.exports = {
  archives
};
