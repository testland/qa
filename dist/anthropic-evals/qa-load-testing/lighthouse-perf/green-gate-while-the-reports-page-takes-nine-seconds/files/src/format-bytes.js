'use strict';

const UNITS = ['B', 'kB', 'MB', 'GB'];

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('bad byte count');
  let i = 0;
  let v = n;
  while (v >= 1000 && i < UNITS.length - 1) {
    v /= 1000;
    i += 1;
  }
  return Math.round(v * 10) / 10 + ' ' + UNITS[i];
}

module.exports = { formatBytes };
