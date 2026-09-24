'use strict';

// everyMinutes is the interval the Java trigger fired on. What each job does is
// in src/handlers.js.
module.exports = [
  { name: 'vat-file-upload', everyMinutes: 1440 },
  { name: 'payout-post', everyMinutes: 1440 },
  { name: 'dunning-email', everyMinutes: 1440 },
  { name: 'metrics-rollup', everyMinutes: 60 },
  { name: 'session-prune', everyMinutes: 15 },
];
