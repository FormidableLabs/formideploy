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

const { log } = getLoggers("archives");

const getArchives = async () => {
  const prefix = [domain, basePath, "archive-"].filter(Boolean).join("/");

  const { stdout } = await exec({
    cmd: "aws",
    args: [
      "s3api",
      "list-objects-v2",
      "--bucket",
      `${bucket}-archives`,
      "--prefix",
      prefix
    ],
    opts: { stdio: "pipe" },
    log
  });
  return JSON.parse(stdout).Contents;
};

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

const archives = async () => {
  await validate(config);

  const objs = await getArchives();
  const meta = await getMeta({ objs });
  console.log("TODO: archives", JSON.stringify({ objs, meta }, null, 2));
};

module.exports = {
  archives
};
