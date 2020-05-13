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

// Return current info from git.
const gitInfo = () => Promise.all([
  ["symbolic-ref", "--short", "HEAD"],
  ["rev-parse", "HEAD"]
].map((args) => execa("git", args, { stdio: "pipe" }).then(({ stdout }) => stdout)))
  .then(([branch, sha]) => ({
    branch,
    sha
  }));

module.exports = {
  getLoggers,
  write,
  exists,
  exec,
  gitInfo
};
