"use strict";

/**
 * Create GitHub deployment for PRs.
 */
const chalk = require("chalk");
const { Octokit } = require("@octokit/rest");
const { config: { build, github } } = require("../config");

const DEPLOYMENT_CREATED = 201;

class Deployment {
  constructor({ environment, url, log, error }) {
    const { GITHUB_DEPLOYMENT_TOKEN } = process.env;
    this.auth = GITHUB_DEPLOYMENT_TOKEN || null;
    this.client = new Octokit({
      auth: this.auth
    });
    this.environment = environment;
    this.url = url;
    this.log = log;
    this.error = error;
  }

  // Get current git ref if actual PR
  get ref() {
    if (!this.auth || !build.id) { return null; }

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

  // Create a new deployment.
  start({ branch, sha }) {
    const { environment, client, url, log, error } = this;

    log(chalk `Starting notification for: {gray ${JSON.stringify({ branch, sha })}}`);
    // https://octokit.github.io/rest.js/v17#repos-create-deployment
    return client.repos.createDeployment({
      owner: github.org,
      repo: github.repo,
      ref: sha,
      environment,
      description:
        `Starting ${environment} deployment of ${JSON.stringify({ branch, sha })} to ${url}`
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
  finish({ state, deploymentId }) {
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