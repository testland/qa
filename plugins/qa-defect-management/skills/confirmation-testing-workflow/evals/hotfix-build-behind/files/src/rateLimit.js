'use strict';

const BUCKETS = new Map();

function reset() {
  BUCKETS.clear();
}

function take(key, limit) {
  const used = BUCKETS.get(key) || 0;
  if (used >= limit) {
    return { status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 60 };
  }
  BUCKETS.set(key, used + 1);
  return { status: 200, remaining: limit - used - 1 };
}

module.exports = { take, reset };
