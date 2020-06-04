#!/usr/bin/env node

"use strict";

const chalk = require("chalk");
const { archives, serve, deploy } = require("../lib/actions");
const { getLoggers } = require("../lib/util/log");

const pkg = require("../package.json");
const { log, error } = getLoggers(pkg.name);

const DEFAULT_PORT = 5000;
const USAGE = `
Usage: ${pkg.name} <action> [options]

Actions: (<action>)
  serve         Run local server from static build directory
  deploy        Deploy build directory to website
  archives      List production archives

Options:
  --staging       Deploy build to staging site.          [boolean]
  --production    Deploy build to staging production.    [boolean]
  --dryrun        Don't actually run deployment actions. [boolean]
  --port          Port to run local server on.           [number] [default: 5000]
  --help, -h      Show help                              [boolean]
  --version, -v   Show version number                    [boolean]

Examples:
  ${pkg.name} serve --port=3333               Serve build directory on port 5000.
  ${pkg.name} deploy --staging                Deploy build to staging.
  ${pkg.name} deploy --production --dryrun    Simulate production build deploy.
`.trim();

// ============================================================================
// Actions
// ============================================================================
const help = async () => { log(USAGE); };
const version = async () => { log(pkg.version); };

// ============================================================================
// Configuration
// ============================================================================
// Get action or help / version name
const getAction = (args, opts) => {
  // Return actions in priority order.
  if (args.includes("--help") || args.includes("-h")) { return help; }
  if (args.includes("--version") || args.includes("-v")) { return version; }
  if (args.includes("archives")) { return archives; }
  if (args.includes("serve")) { return serve; }
  if (args.includes("deploy")) {
    return opts.production ? deploy.production : deploy.staging;
  }

  // Default.
  return help;
};

// Get options for actions.
const getOptions = (args) => ({
  port: parseInt(args.find((val, i) => args[i - 1] === "--port")) || DEFAULT_PORT,
  dryrun: args.includes("--dryrun"),
  production: args.includes("--production") && !args.includes("--staging"),
  staging: args.includes("--staging")
});

// ============================================================================
// Script
// ============================================================================
const main = async () => {
  const args = process.argv.slice(2); // eslint-disable-line no-magic-numbers
  const opts = getOptions(args);
  const action = getAction(args, opts);
  const actionName = JSON.stringify({ action: action.name });
  log(chalk `Starting {green ${actionName}} with options {gray ${JSON.stringify(opts)}}`);
  await action(opts);
};

if (require.main === module) {
  main().catch((err) => {
    error(err);
    process.exit(1); // eslint-disable-line no-process-exit
  });
}
