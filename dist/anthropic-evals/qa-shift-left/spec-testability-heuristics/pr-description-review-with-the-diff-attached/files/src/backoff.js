'use strict';

const DEFAULTS = { baseMs: 200, capMs: 30000, maxAttempts: 5 };

function delayFor(attempt, opts = {}) {
  const { baseMs, capMs } = { ...DEFAULTS, ...opts };
  return Math.min(baseMs * 2 ** (attempt - 1), capMs);
}

function shouldRetry(status, attempt, opts = {}) {
  const { maxAttempts } = { ...DEFAULTS, ...opts };
  if (attempt >= maxAttempts) return false;
  return status === 429 || status >= 500;
}

module.exports = { DEFAULTS, delayFor, shouldRetry };
