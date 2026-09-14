'use strict';

function withRetry(fn, attempts) {
  let left = attempts;
  let lastError;
  while (left > 0) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
      left -= 1;
    }
  }
  throw lastError;
}

module.exports = { withRetry };
