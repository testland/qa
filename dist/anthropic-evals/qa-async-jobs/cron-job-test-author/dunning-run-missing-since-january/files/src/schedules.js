'use strict';

// intent is the requirement as the requesting team wrote it; expr is what shipped.
module.exports = [
  {
    name: 'invoice-dunning',
    expr: '0 5 * 13 *',
    intent: '05:00 UTC on the 13th of every month',
  },
  {
    name: 'weekly-digest',
    expr: '0 14 * * 7',
    intent: '14:00 UTC every Sunday',
  },
  {
    name: 'ledger-export',
    expr: '0 0 3 * * *',
    intent: '03:00 UTC every night',
  },
  {
    name: 'card-retry',
    expr: '0 7 2,16 * *',
    intent: '07:00 UTC on the 2nd and the 16th of every month',
  },
  {
    name: 'queue-heartbeat',
    expr: '*/10 * * * *',
    intent: 'every 10 minutes, around the clock',
  },
];
