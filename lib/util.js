"use strict";

const fs = require("fs");
const { promisify } = require("util");

const chalk = require("chalk");

const { error, log } = console;

const write = process.stdout.write.bind(process.stdout);

const getLoggers = (name) => {
  const prefix = chalk `[{cyan ${name}}]`;

  return {
    log: (msg) => log(`${prefix} ${msg}`),
    error: (err) => {
      write(chalk `${prefix}[{red error}] `);
      error(err);
    }
  };
};

const stat = promisify(fs.stat);

const exists = (filePath) => stat(filePath)
  .then(() => true)
  .catch((err) => {
    if (err.code === "ENOENT") { return false; }
    throw err;
  });

module.exports = {
  getLoggers,
  write,
  exists
};
