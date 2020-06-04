"use strict";

/**
 * Actions.
 */
const { archives } = require("./archives");
const { serve } = require("./serve");
const { staging } = require("./deploy/staging");
const { production } = require("./deploy/production");

module.exports = {
  archives,
  serve,
  deploy: {
    staging,
    production
  }
};
