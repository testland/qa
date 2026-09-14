'use strict';

// everyMinutes is the interval the Java trigger fired on.
module.exports = [
  {
    name: 'vat-file-upload',
    everyMinutes: 1440,
    note: 'uploads one XML per period to the filing partner; the partner holds one file per period and returns 409 for a second',
  },
  {
    name: 'payout-post',
    everyMinutes: 1440,
    note: 'appends the settlement batch for the period to the ledger; nothing in the ledger is keyed on the period',
  },
  {
    name: 'dunning-email',
    everyMinutes: 1440,
    note: 'emails every customer whose invoice fell overdue in the period',
  },
  {
    name: 'metrics-rollup',
    everyMinutes: 60,
    note: 'rewrites the warehouse partition for the period from source',
  },
  {
    name: 'session-prune',
    everyMinutes: 15,
    note: 'deletes every session whose expiry has passed, whatever period it is handed',
  },
];
