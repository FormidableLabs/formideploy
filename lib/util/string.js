"use strict";

// Convert camel case to dash case.
const toDash = (str) => str.replace(/([A-Z])/g, (p) => `-${p[0].toLowerCase()}`);

module.exports = {
  toDash
};
