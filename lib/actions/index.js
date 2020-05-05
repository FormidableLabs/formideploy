"use strict";

/**
 * Actions.
 */
const { serve } = require("./serve");
const { staging } = require("./deploy/staging");
const { production } = require("./deploy/production");

module.exports = {
  serve,
  deploy: {
    staging,
    production
  }
};
