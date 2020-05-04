#!/usr/bin/env node

"use strict";

const pkg = require("../package.json");

const { log } = console;

const usage = `
Usage: formideploy <action> [options]

Actions: (<action>)
  serve         Run local server from static build directory
  deploy        Deploy build directory to website

Options:
  --dryrun        Don't actually run deployment actions. [boolean]
  --staging       Deploy build to staging site.          [boolean]
  --production    Deploy build to staging production.    [boolean]
  --help, -h      Show help                              [boolean]
  --version, -v   Show version number                    [boolean]

Examples:
  formideploy serve                           Serve build directory on port 5000.
  formideploy deploy --staging                Deploy build to staging.
  formideploy deploy --production --dryrun    Simulate production build deploy.
`.trim();

// Actions
const help = () => {
  log(usage);
};
const version = () => {
  log(pkg.version);
};

// Get action or help / version.
const getAction = (args) => {
  // Return actions in priority order.
  if (args.includes("--help") || args.includes("-h")) { return help; }
  if (args.includes("--version") || args.includes("-v")) { return version; }

  // Default.
  return help;
};

const getOptions = (args) => ({});

const main = async () => {
  const args = process.argv.slice(2); // eslint-disable-line no-magic-numbers
  const action = getAction(args);
  const opts = getOptions(args);

  action(opts);
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
  });
}
