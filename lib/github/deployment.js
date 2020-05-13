"use strict";

/**
 * Create GitHub deployment for PRs.
 */
const chalk = require("chalk");
const { Octokit } = require("@octokit/rest");
const { config: { build, github } } = require("../config");
const { gitInfo } = require("../util");

const DEPLOYMENT_CREATED = 201;

class Deployment {
  constructor({ environment, url, dryrun = false, log, error }) {
    const { GITHUB_DEPLOYMENT_TOKEN } = process.env;

    this.auth = GITHUB_DEPLOYMENT_TOKEN;
    this.client = new Octokit({ auth: this.auth });
    this.dryrun = dryrun;
    this.environment = environment;
    this.url = url;
    this.log = log;
    this.error = error;

    // Only enable if have authentication, in a real PR, or production in master.
    this.enabled = !this.dryrun && this.auth && (
      // In a real PR
      build.id && build.isPullRequest
    );
    this.deploymentId = undefined;
  }

  // Provide rationale for disabled reason.
  get disabledReason() {
    if (this.enabled) { return null; }
    if (this.dryrun) { return "dryrun"; }
    if (!this.auth) { return "not authenticated"; }
    if (!build.id || !build.isPullRequest) { return "not a pull request for staging"; }

    throw new Error("Unhandled reason");
  }

  // Create a new deployment.
  async start() {
    const { enabled, environment, client, url, log, error } = this;
    if (!enabled) {
      return void log(chalk `{yellow Skipping notifications}: ${this.disabledReason}`);
    }

    const { branch, sha } = await gitInfo();
    log(chalk `Starting notification for: {gray ${JSON.stringify({ branch, sha })}}`);

    // https://octokit.github.io/rest.js/v17#repos-create-deployment
    /* eslint-disable camelcase */
    await client.repos.createDeployment({
      owner: github.org,
      repo: github.repo,
      ref: sha,
      environment,
      production_environment: environment === "production",
      description:
        `Starting ${environment} deployment of ${JSON.stringify({ branch, sha })} to ${url}`,
      auto_merge: false, // Do not require branch caught up with master.
      required_contexts: [] // we call _within_ CI, so can't wait during `"state":"in_progress"`
    })
    /* eslint-enable camelcase */
      .then(({ status, data: { id } }) => {
        // **Note**: There are some scenarios in which a deployment isn't created
        // See: https://developer.github.com/v3/repos/deployments/#merged-branch-response
        // We can consider handling them later if we encounter them.
        // - 202 if you let github auto-merge master into your branch if it's conflict-free
        // - 409 for merge conflict
        // - 409 for status check failure (e.g. CI failed) (Can allow with `required_contexts: []`)
        if (status !== DEPLOYMENT_CREATED) {
          throw new Error(
            chalk `Failed to create notification for: {gray ${JSON.stringify({ branch, sha, id })}}`
          );
        }
        log(chalk `Started notification for: {gray ${JSON.stringify({ branch, sha, id })}}`);
        this.deploymentId = id;
      })
      .catch((err) => {
        error(`Start notification error: ${err}`);
        throw error;
      });
  }

  // Finish deployment with status.
  async finish({ state }) {
    const { enabled, deploymentId, environment, client, url, log, error } = this;
    if (!(enabled && deploymentId)) { return null; }

    log(chalk `Finishing notification for: {gray ${JSON.stringify({ deploymentId, url })}}`);

    // https://octokit.github.io/rest.js/v17#repos-create-deployment-status
    /* eslint-disable camelcase */
    return client.repos.createDeploymentStatus({
      owner: github.org,
      repo: github.repo,
      deployment_id: deploymentId,
      environment_url: url,
      auto_inactive: true,
      environment,
      state
    })
    /* eslint-enable camelcase */
      .then(() => {
        log(chalk `Finished notification for: {gray ${JSON.stringify({ deploymentId, url })}}`);
      })
      .catch((err) => {
        error(`Finish notification error: ${err}`);
        throw error;
      });
  }
}

module.exports = {
  Deployment
};
