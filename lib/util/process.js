"use strict";

const chalk = require("chalk");
const execa = require("execa");

const { config: { production: { region } } } = require("../config");
const _log = console.log; // eslint-disable-line no-console

// Execa wrapper.
const exec = ({
  cmd,
  args,
  opts = { stdio: "inherit" },
  log = _log
}) => {
  const cmdStr = chalk `{gray ${[cmd, ...args].join(" ")}}`;

  log(chalk `Running: ${cmdStr}`);
  return execa(cmd, args, opts)
    .then((results) => {
      if (results.exitCode !== 0) { throw new Error(`Command ${cmdStr} exited non-zero`); }
      return results;
    });
};

// AWS helper
const execAws = ({ args, opts, log }) => exec({
  cmd: "aws",
  args: [].concat(
    args || [],
    region ? ["--region", region] : []
  ),
  opts,
  log
});

module.exports = {
  exec,
  execAws
};
