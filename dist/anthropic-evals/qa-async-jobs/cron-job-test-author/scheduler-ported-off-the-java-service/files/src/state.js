'use strict';

// Last successful run per job, as the worker recorded it before the outage.
module.exports = {
  'vat-file-upload': Date.UTC(2026, 8, 8, 0, 0),
  'payout-post': Date.UTC(2026, 8, 8, 1, 0),
  'dunning-email': Date.UTC(2026, 8, 8, 6, 0),
  'metrics-rollup': Date.UTC(2026, 8, 8, 19, 0),
  'session-prune': Date.UTC(2026, 8, 8, 19, 0),
};
