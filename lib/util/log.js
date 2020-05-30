"use strict";

const chalk = require("chalk");
const pkg = require("../../package.json");

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

module.exports = {
  write,
  getLoggers
};
