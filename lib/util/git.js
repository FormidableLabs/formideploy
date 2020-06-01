"use strict";

const execa = require("execa");

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
    if (TRAVIS_PULL_REQUEST_BRANCH && TRAVIS_PULL_REQUEST_SHA) {
      _gitInfo = {
        branch: TRAVIS_PULL_REQUEST_BRANCH,
        sha: TRAVIS_PULL_REQUEST_SHA
      };
    } else if (TRAVIS_BRANCH && TRAVIS_COMMIT) {
      _gitInfo = {
        branch: TRAVIS_BRANCH,
        sha: TRAVIS_COMMIT
      };
    } else if (CIRCLE_BRANCH && CIRCLE_SHA1) {
      _gitInfo = {
        branch: CIRCLE_BRANCH,
        sha: CIRCLE_SHA1
      };
    } else {
      // From git directly (may fail in CI on specific clones)
      _gitInfo = await Promise.all([
        ["show", "-s", "--pretty=%d", "HEAD"],
        // %cd committer date (format respects --date= option)
        ["show", "--no-patch", "--no-notes", "--pretty='%cd'", "--date=iso-local", "HEAD"],
        ["rev-parse", "HEAD"]
      ].map((args) => execa("git", args, {
        stdio: "pipe",
        env: {
          ...process.env,
          TZ: "GMT"
        }
      }).then(({ stdout }) => stdout)))
        .then(([branch, commitDate, sha]) => ({
          // (HEAD -> BRANCH_NAME, origin/BRANCH_NAME)
          branch: (branch.match(/\(HEAD -> ([^,)]+)/) || [])[1] || null,
          commitDate: new Date(commitDate).toISOString(),
          sha
        }));
    }
  }

  return _gitInfo;
};

module.exports = {
  gitInfo
};
