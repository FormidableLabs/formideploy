"use strict";

// Convert camel case to dash case.
const toDash = (str) => str.replace(/([A-Z])/g, (p) => `-${p[0].toLowerCase()}`);

const toCamel = (str) => str.replace(/(-)([a-z])/g, (p) => `${p[1].toUpperCase()}`);

module.exports = {
  toDash,
  toCamel
};
