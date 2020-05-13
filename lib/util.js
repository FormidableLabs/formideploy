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
    const { TRAVIS_BRANCH, TRAVIS_COMMIT, CIRCLE_BRANCH, CIRCLE_SHA1 } = process.env;

    // Try environment variables first, then actual git.
    if (TRAVIS_BRANCH && TRAVIS_COMMIT) {
      // Travis
      // https://docs.travis-ci.com/user/environment-variables/#default-environment-variables
      _gitInfo = {
        branch: TRAVIS_BRANCH,
        sha: TRAVIS_COMMIT
      };
    } else if (CIRCLE_BRANCH && CIRCLE_SHA1) {
      // CircleCI
      // https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables
      _gitInfo = {
        branch: CIRCLE_BRANCH,
        sha: CIRCLE_SHA1
      };
    } else {
      // From git directly (may fail in CI on specific clones)
      _gitInfo = await Promise.all([
        ["show", "-s", "--pretty=%d", "HEAD"],
        ["rev-parse", "HEAD"]
      ].map((args) => execa("git", args, { stdio: "pipe" }).then(({ stdout }) => stdout)))
        .then(([branch, sha]) => ({
          // (HEAD -> BRANCH_NAME, origin/BRANCH_NAME)
          branch: (branch.match(/\(HEAD -> ([^,)]+)/) || [])[1] || null,
          sha
        }));
    }
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
