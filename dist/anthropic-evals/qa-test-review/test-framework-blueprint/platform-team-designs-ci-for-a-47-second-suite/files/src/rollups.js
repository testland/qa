'use strict';

function rollup(events, bucketMs) {
  const buckets = new Map();
  for (const e of events) {
    const key = Math.floor(e.t / bucketMs) * bucketMs;
    buckets.set(key, (buckets.get(key) ?? 0) + e.count);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, count]) => ({ t, count }));
}

module.exports = { rollup };
