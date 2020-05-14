"use strict";

/**
 * Configuration defaults
 */

module.exports = {
  lander: {
    // [REQUIRED(LANDER)] If project is a lander, specify the package name here.
    // E.g. `spectacle`, `renature`, etc. This is currently also assumed to be
    // the GitHub repository name as well.
    //
    // If not specified, we will assume base website.
    name: null
  },
  github: {
    org: "FormidableLabs",
    // Defaults to `{lander.name}` if specified, otherwise `formidable.com`
    repo: null
  },
  build: {
    // Build output directory.
    dir: "dist",

    // Location / nested path of contained site. This is deployed to
    // `site.basePath`.
    //
    // If this value is left empty / null, it will default to:
    // `{build.dir}/{site.basePath}`.
    path: null,

    // Build identifier.
    // Defaults to Travis or CircleCI PR number via environment variables.
    id: null,

    // Is the build environment within a pull request?
    // If so, then will add GitHub PR enhancements.
    // Defaults to true if Travis / CircleCI PR environment variables, otherwise
    // false.
    isPullRequest: null
  },
  // Website parts
  site: {
    // Location / nested path from which to serve the website.
    //
    // If this value is left empty / null, it will default to:
    // 1. `open-source/{lander.name}` if `lander.name` is specified
    // 2. "" if not (assumed to be base website)
    //
    // **Note**: `build.dir` output must match this value (e.g., if
    // ends up as `open-source/{lander.name}` the default value would mean that
    // `{build.dir}/open-source/{lander.name}` must exist and be servable / deployable).
    basePath: null
  },
  staging: {
    // Root domain.
    // If this value is left empty / null, it will default to:
    // 1. `formidable-com-{lander.name}-staging-{build.id}.surge.sh` if lander
    // 2. `formidable-com-staging-{build.id}.surge.sh` if not (assumed to be base website)
    domain: null
  },
  production: {
    // Root domain.
    domain: "formidable.com",

    // Production AWS S3 bucket name
    bucket: "formidable.com",

    // Exclude sub-paths that are uploaded separately.
    // Prevents AWS s3 sync from deleting paths.
    // **Note**: Pretty much only the base website needs this to exclude
    // separately deployed landers.
    excludes: []
  }
};
