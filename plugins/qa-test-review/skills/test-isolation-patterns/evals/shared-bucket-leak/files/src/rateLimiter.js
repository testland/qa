'use strict';

const buckets = new Map();

function consume(key, limit) {
  const used = buckets.get(key) || 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0 };
  }
  buckets.set(key, used + 1);
  return { allowed: true, remaining: limit - used - 1 };
}

function usage(key) {
  return buckets.get(key) || 0;
}

function resetAll() {
  buckets.clear();
}

module.exports = { consume, usage, resetAll };
