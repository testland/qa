'use strict';

const BATCH_DELAY_MS = 5000;

async function settleSpans() {
  await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS + 200));
}

module.exports = { settleSpans };
