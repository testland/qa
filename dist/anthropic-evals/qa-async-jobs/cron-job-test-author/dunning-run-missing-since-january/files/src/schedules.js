'use strict';

// intent is the requirement as the requesting team wrote it; expr is what shipped.
module.exports = [
  {
    name: 'invoice-dunning',
    expr: '0 5 13 1 *',
    intent: '05:00 UTC on the 13th of every month',
  },
  {
    name: 'statement-mail',
    expr: '0 9 1 * 1',
    intent: '09:00 UTC on the 1st of every month',
  },
  {
    name: 'card-retry',
    expr: '0 7 31 * *',
    intent: '07:00 UTC on the last day of every month',
  },
  {
    name: 'fx-refresh',
    expr: '*/40 * * * *',
    intent: 'every 40 minutes, around the clock',
  },
  {
    name: 'weekly-digest',
    expr: '0 14 * * 0',
    intent: '14:00 UTC every Sunday',
  },
  {
    name: 'queue-heartbeat',
    expr: '*/10 * * * *',
    intent: 'every 10 minutes, around the clock',
  },
];
