#!/usr/bin/env node

"use strict";

const main = async () => {
  console.log("HI");
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line no-process-exit
  });
}
