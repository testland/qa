'use strict';

const MAX_ATTEMPTS = 3;

function backoffMs(attempt) {
  return Math.min(1000 * 2 ** attempt, 8000);
}

// A delivery that has already been charged must never be retried, whatever the
// transport said.
function shouldRetry(delivery) {
  if (delivery.charged) return false;
  if (delivery.attempts >= MAX_ATTEMPTS) return false;
  return delivery.lastError === 'timeout' || delivery.status >= 500;
}

module.exports = { MAX_ATTEMPTS, backoffMs, shouldRetry };
