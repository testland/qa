'use strict';

const MAX_DAYS = 3;

function runDailyBatch({ pending, client }) {
  const stillPending = [];
  for (const item of pending) {
    const result = client.submit(item.request);
    item.attempts += 1;
    if (result.status === 'retryable' && item.attempts < MAX_DAYS) {
      stillPending.push(item);
    }
  }
  return stillPending;
}

module.exports = { runDailyBatch, MAX_DAYS };
