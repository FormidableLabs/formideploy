"use strict";

/**
 * Create GitHub deployment for PRs.
 */
const chalk = require("chalk");
const { Octokit } = require("@octokit/rest");
const { config: { build, github } } = require("../config");

const DEPLOYMENT_CREATED = 201;

class Deployment {
  constructor({ environment, url, isProduction = false, log, error }) {
    const { GITHUB_DEPLOYMENT_TOKEN } = process.env;
    this.auth = GITHUB_DEPLOYMENT_TOKEN || null;
    this.client = new Octokit({
      auth: this.auth
    });
    this.environment = environment;
    this.url = url;
    this.isProduction = isProduction;
    this.log = log;
    this.error = error;
  }

  // Get current git ref if actual PR
  get ref() {
    // Only attempt reference if authenticated and in prod or a real PR.
    if (this.auth && (this.isProduction || build.id && build.isPullRequest)) {
      /* eslint-disable camelcase */
      return this.client.pulls.get({
        owner: github.org,
        repo: github.repo,
        pull_number: build.id
      })
        .then(({ data: { head } }) => ({
          branch: head.ref,
          sha: head.sha
        }));
    }

    return Promise.resolve(null);
  }

  // Create a new deployment.
  async start() {
    const { environment, client, url, log, error } = this;

    const ref = await this.ref;
    if (!ref) {
      log(chalk `{yellow Skipping notifications} (CI): Not a deployable git reference.`);
      return null;
    }

    const { branch, sha } = ref;
    log(chalk `Starting notification for: {gray ${JSON.stringify({ branch, sha })}}`);

    // https://octokit.github.io/rest.js/v17#repos-create-deployment
    return client.repos.createDeployment({
      owner: github.org,
      repo: github.repo,
      ref: sha,
      environment,
      description:
        `Starting ${environment} deployment of ${JSON.stringify({ branch, sha })} to ${url}`,
      required_contexts: [] // we call _within_ CI, so can't wait during `"state":"in_progress"`
    })
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
        return id;
      })
      .catch((err) => {
        error(`Start notification error: ${err}`);
        throw error;
      });
  }

  // Finish deployment with status.
  async finish({ state, deploymentId }) {
    if (!deploymentId) { return null; }

    const { environment, client, url, log, error } = this;
    log(chalk `Finishing notification for: {gray ${JSON.stringify({ deploymentId, url })}}`);

    // https://octokit.github.io/rest.js/v17#repos-create-deployment-status
    return client.repos.createDeploymentStatus({
      owner: github.org,
      repo: github.repo,
      deployment_id: deploymentId,
      environment_url: url,
      auto_inactive: true,
      environment,
      state
    })
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
