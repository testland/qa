'use strict';
const { provider } = require('../src/tracing');

async function settleSpans() {
  await provider.forceFlush();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

module.exports = { settleSpans };
