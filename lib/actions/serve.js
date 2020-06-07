"use strict";

/**
 * Serve static build in localdev.
 */

const http = require("http");

const chalk = require("chalk");
const handler = require("serve-handler");

const { config, validate } = require("../config");
const { build, site } = config;
const { getLoggers, write } = require("../util/log");
const { downloadArchive } = require("./archives");

const { error, log } = getLoggers("serve");

// Create a single use teardown function.
const getTeardown = (server) => {
  let closed = false;
  return () => {
    if (closed) { return; }

    write("\n");
    log("Graceful shutdown... (Use Ctrl-C for immediate shutdown)");
    closed = true;
    server.close();

    process.on("SIGINT", () => {
      write("\n");
      log("Forced shutdown...");
      process.exit(0); // eslint-disable-line no-process-exit
    });
  };
};

// Add error and signal handlers.
const addHandlers = (server) => {
  const teardown = getTeardown(server);

  server.on("error", (err) => {
    error(err);
    process.exit(1); // eslint-disable-line no-process-exit
  });

  ["SIGINT", "SIGTERM", "exit"].forEach((sig) => process.on(sig, teardown));
};


const serve = async ({ port, archive }) => {
  await validate(config);

  const address = `http://localhost:${port}/${site.basePath}`;

  const publicDir = build.dir;
  if (archive) {
    const tmp = await downloadArchive({ archive });
    console.log("TODO HERE", tmp);
  }

  const server = new http.Server((req, res) => handler(req, res, {
    "public": publicDir,
    trailingSlash: true
  }));

  addHandlers(server);
  server.listen(port, () => {
    log(chalk `Serving build from "{cyan ${build.path}}" at: {cyan.underline ${address}}`);
  });
};

module.exports = {
  serve
};
