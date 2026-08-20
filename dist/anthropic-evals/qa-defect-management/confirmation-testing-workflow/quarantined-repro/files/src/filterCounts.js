'use strict';

function recount(items, activeFacets) {
  const pool = items.filter((item) =>
    Object.entries(activeFacets).every(([k, v]) => item[k] === v),
  );
  const counts = {};
  for (const item of pool) {
    for (const [k, v] of Object.entries(item)) {
      counts[k] = counts[k] || {};
      counts[k][v] = (counts[k][v] || 0) + 1;
    }
  }
  return counts;
}

module.exports = { recount };
