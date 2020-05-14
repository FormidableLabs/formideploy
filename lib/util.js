"use strict";

const fs = require("fs").promises;
const path = require("path");

const chalk = require("chalk");
const execa = require("execa");
const pkg = require("../package.json");

const { error, log } = console;

// ---------------------------------------------------------------------------
// Logging, stdout
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------
const exists = (filePath) => fs.stat(filePath)
  .then(() => true)
  .catch((err) => {
    if (err.code === "ENOENT") { return false; }
    throw err;
  });

// Recursive file traversal.
const getFiles = ({ dir }) => fs.readdir(dir, { withFileTypes: true })
  // Traverse
  .then((dirents) => Promise.all(dirents.map((dirent) => {
    const resolved = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles({ dir: resolved }) : resolved;
  })))
  // Flatten results
  .then((files) => [].concat(...files));

// ---------------------------------------------------------------------------
// Process
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------
// Git metadata (cached).
let _gitInfo;
const gitInfo = async () => {
  if (!_gitInfo) {
    // TODO: HERE -- In a PR we need PR specific stuff.
    const {
      // https://docs.travis-ci.com/user/environment-variables/#default-environment-variables
      TRAVIS_PULL_REQUEST_BRANCH,
      TRAVIS_PULL_REQUEST_SHA,
      TRAVIS_BRANCH,
      TRAVIS_COMMIT,
      // https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables
      CIRCLE_BRANCH,
      CIRCLE_SHA1
    } = process.env;

    // Try environment variables first (PR, then real branch), then actual git.
    if (TRAVIS_PULL_REQUEST_BRANCH && TRAVIS_PULL_REQUEST_SHA) {
      _gitInfo = {
        branch: TRAVIS_PULL_REQUEST_BRANCH,
        sha: TRAVIS_PULL_REQUEST_SHA
      };
    } else if (TRAVIS_BRANCH && TRAVIS_COMMIT) {
      _gitInfo = {
        branch: TRAVIS_BRANCH,
        sha: TRAVIS_COMMIT
      };
    } else if (CIRCLE_BRANCH && CIRCLE_SHA1) {
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
  getFiles,
  exec,
  gitInfo
};
