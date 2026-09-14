'use strict';

function percentile(values, p) {
  if (!values.length) throw new RangeError('no values');
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

module.exports = { percentile };
