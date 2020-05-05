"use strict";

const http = require("http");
const path = require("path");

const chalk = require("chalk");
const handler = require("serve-handler");

const { build, site } = require("../config");
const { getLoggers, write, exists } = require("../util");

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

const serve = async ({ port }) => {
  if (typeof site.basePath !== "string") {
    throw new Error(chalk `Missing required configuration: {gray site.basePath}`);
  }

  const buildPath = path.resolve(build.dir, site.basePath);
  if (!await exists(buildPath)) {
    throw new Error(chalk `Build output missing at: {cyan ${buildPath}}`);
  }

  const address = `http://localhost:${port}/${site.basePath}`;
  const server = new http.Server((req, res) => handler(req, res, {
    "public": build.dir,
    trailingSlash: true
  }));

  addHandlers(server);
  server.listen(port, () => {
    log(chalk `Serving build from ${build.dir} at: {cyan.underline ${address}}`);
  });
};

module.exports = {
  serve
};
