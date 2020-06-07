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
const { downloadArchive, displayArchive } = require("./archives");

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

  let [publicDir, publicPath] = [build.dir, build.path];
  if (archive) {
    const archiveInfo = await downloadArchive({ archive });
    [publicDir, publicPath] = [archiveInfo.build.base, archiveInfo.build.full];
    await displayArchive({ archive });
  }

  const server = new http.Server((req, res) => handler(req, res, {
    "public": publicDir,
    trailingSlash: true
  }));

  addHandlers(server);
  server.listen(port, () => {
    log(chalk `Serving build from "{cyan ${publicPath}}" at: {cyan.underline ${address}}`);
  });
};

module.exports = {
  serve
};
