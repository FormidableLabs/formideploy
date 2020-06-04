"use strict";

const fs = require("fs").promises;
const path = require("path");

const exists = (filePath) => fs.stat(filePath)
  .then(() => true)
  .catch((err) => {
    if (err.code === "ENOENT") { return false; }
    throw err;
  });

// Recursive file traversal.
const getFiles = ({ dir }) => fs.readdir(dir, { withFileTypes: true })
  // Traverse
  .then((dirents) => Promise.all(dirents.map((dirent) => {
    const resolved = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles({ dir: resolved }) : resolved;
  })))
  // Flatten results
  .then((files) => [].concat(...files));

module.exports = {
  exists,
  getFiles
};
