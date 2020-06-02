"use strict";

const execa = require("execa");

const SHA_SHORT_LENGTH = 7;

const execGit = (args) => execa("git", args, {
  stdio: "pipe",
  env: {
    ...process.env,
    TZ: "GMT"
  }
})
  .then(({ stdout }) => stdout).catch((err) => err);

// Git inference helpers.
const GIT_DEFAULTS = {
  userName: () => execGit(["config", "--get", "user.name"]),
  userEmail: () => execGit(["config", "--get", "user.email"]),
  branch: () => execGit(["show", "-s", "--pretty=%d", "HEAD"])
    // (HEAD -> BRANCH_NAME, origin/BRANCH_NAME)
    .then((show) => (show.match(/\(HEAD -> ([^,)]+)/) || [])[1]),
  commitDate: () =>
    // %cd committer date (format respects --date= option)
    execGit(["show", "--no-patch", "--no-notes", "--pretty='%cd'", "--date=iso-local", "HEAD"]),
  sha: () => execGit(["rev-parse", "HEAD"]),
  state: () => execGit(["diff", "--no-ext-diff", "--quiet"])
};

// Git metadata (cached).
let _gitInfo;
const gitInfo = async () => {
  if (!_gitInfo) {
    const {
      // https://docs.travis-ci.com/user/environment-variables/#default-environment-variables
      TRAVIS_PULL_REQUEST_BRANCH,
      TRAVIS_PULL_REQUEST_SHA,
      TRAVIS_BRANCH,
      TRAVIS_COMMIT,
      // https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables
      CIRCLE_BRANCH,
      CIRCLE_SHA1
    } = process.env;

    // Try environment variables first (PR, then real branch), then actual git.
    const getters = { ...GIT_DEFAULTS };
    if (TRAVIS_PULL_REQUEST_BRANCH && TRAVIS_PULL_REQUEST_SHA) {
      Object.assign(getters, {
        branch: () => Promise.resolve(TRAVIS_PULL_REQUEST_BRANCH),
        sha: () => Promise.resolve(TRAVIS_PULL_REQUEST_SHA)
      });
    } else if (TRAVIS_BRANCH && TRAVIS_COMMIT) {
      Object.assign(getters, {
        branch: () => Promise.resolve(TRAVIS_BRANCH),
        sha: () => Promise.resolve(TRAVIS_COMMIT)
      });
    } else if (CIRCLE_BRANCH && CIRCLE_SHA1) {
      Object.assign(getters, {
        branch: () => Promise.resolve(CIRCLE_BRANCH),
        sha: () => Promise.resolve(CIRCLE_SHA1)
      });
    }

    // Get live information from git directly and post-process.
    _gitInfo = await Promise.all(Object.entries(getters)
      // Async execute getters.
      .map(([key, fn]) => fn().then((val) => ({ [key]: val })))
    )
      // Create a single object.
      .then((results) => results.reduce((info, o) => Object.assign(info, o), {}))
      // Mutate object to final form.
      .then((info) => ({
        ...info,
        userName: info.userName instanceof Error ? "EMPTY" : info.userName,
        userEmail: info.userEmail instanceof Error ? "EMPTY" : info.userEmail,
        branch: info.branch || "EMPTY",
        commitDate: new Date(info.commitDate).toISOString(),
        shaShort: info.sha.slice(0, SHA_SHORT_LENGTH),
        state: info.state instanceof Error ? "dirty" : "clean"
      }));
  }

  return _gitInfo;
};

module.exports = {
  gitInfo
};
