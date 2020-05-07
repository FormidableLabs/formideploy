"use strict";

/**
 * Create GitHub deployment for PRs.
 */
const chalk = require("chalk");
const { Octokit } = require("@octokit/rest");
const { config: { build, github } } = require("../config");

const DEPLOYMENT_CREATED = 201;

class Deployment {
  constructor({ log, error }) {
    const { GITHUB_DEPLOYMENT_TOKEN } = process.env;
    this.auth = GITHUB_DEPLOYMENT_TOKEN || null;
    this.client = new Octokit({
      auth: this.auth
    });
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
  start({ environment, branch, sha, url }) {
    const { client, log, error } = this;

    log(chalk `Starting notification for: {gray ${JSON.stringify({ branch, sha })}}`);
    return client.repos.createDeployment({
      owner: github.org,
      repo: github.repo,
      ref: sha,
      environment,
      description:
        `Starting ${environment} deployment of ${JSON.stringify({ branch, sha })} to ${url}`
    })
      .then(({ status, data: { id } }) => {
        if (status !== DEPLOYMENT_CREATED) {
          throw new Error(
            chalk `Failed to create notification for: {gray ${JSON.stringify({ branch, sha, id })}}`
          );
        }
        log(chalk `Started notification for: {gray ${JSON.stringify({ branch, sha, id })}}`);
        return id;
      })
      .catch((err) => {
        error(`Starting notification error: ${err}`);
        throw error;
      });
  }
}

module.exports = {
  Deployment
};
