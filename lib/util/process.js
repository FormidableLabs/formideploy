"use strict";

const chalk = require("chalk");
const execa = require("execa");

const { log } = console;

// Execa wrapper.
const exec = (options) => {
  const { cmd, args, opts = { stdio: "inherit" } } = options;
  const _log = options.log || log;
  const cmdStr = chalk `{gray ${[cmd, ...args].join(" ")}}`;

  _log(chalk `Running: ${cmdStr}`);
  return execa(cmd, args, opts)
    .then((results) => {
      if (results.exitCode !== 0) { throw new Error(`Command ${cmdStr} exited non-zero`); }
      return results;
    });
};

module.exports = {
  exec
};
