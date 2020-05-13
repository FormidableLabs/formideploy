"use strict";

const fs = require("fs").promises;

const chalk = require("chalk");
const execa = require("execa");
const pkg = require("../package.json");

const { error, log } = console;

const write = process.stdout.write.bind(process.stdout);

const getLoggers = (name = pkg.name) => {
  const prefix = chalk `[{cyan ${name}}]`;

  return {
    log: (msg) => log(`${prefix} ${msg}`),
    error: (err) => {
      write(chalk `${prefix}[{red error}] `);
      error(err);
    }
  };
};

const exists = (filePath) => fs.stat(filePath)
  .then(() => true)
  .catch((err) => {
    if (err.code === "ENOENT") { return false; }
    throw err;
  });

// Execa wrapper.
const exec = (options) => {
  const { cmd, args, opts = { stdio: "inherit" } } = options;
  const _log = options.log || log;
  const cmdStr = chalk `{gray ${[cmd, ...args].join(" ")}}`;

  _log(chalk `Running: ${cmdStr}`);
  return execa(cmd, args, opts)
    .then(({ exitCode }) => {
      if (exitCode !== 0) { throw new Error(`Command ${cmdStr} exited non-zero`); }
    });
};

// Git metadata (cached).
let _gitInfo;
const gitInfo = async () => {
  if (!_gitInfo) {
    _gitInfo = Promise.all([
      // Note: Cannot use `git symbolic-ref --short HEAD` because Travis, etc.
      // are in detached HEAD state.
      ["show", "-s", "--pretty=%d", "HEAD"],
      ["rev-parse", "HEAD"]
    ].map((args) => execa("git", args, { stdio: "pipe" }).then(({ stdout }) => stdout)))
      .then(([branch, sha]) => ({
        // (HEAD -> BRANCH_NAME, origin/BRANCH_NAME)
        branch: branch.match(/\(HEAD -> ([^,]+)/)[1],
        sha
      }));
  }

  return _gitInfo;
};

module.exports = {
  getLoggers,
  write,
  exists,
  exec,
  gitInfo
};
