'use strict';

// timeZone on the two finance jobs was changed on 2026-09-04, see ops/change-4471.md.
module.exports = [
  {
    name: 'payout-reconcile',
    hour: 1,
    minute: 30,
    timeZone: 'EST',
    owner: 'finance-eng',
    note: 'posts the settlement batch for the previous day; appends, no key on the batch',
  },
  {
    name: 'ledger-close',
    hour: 2,
    minute: 15,
    timeZone: 'Etc/GMT+5',
    owner: 'finance-eng',
    note: 'freezes the books for the previous day; downstream reports read the frozen copy',
  },
  {
    name: 'eu-vat-export',
    hour: 3,
    minute: 0,
    timeZone: 'Europe/Berlin',
    owner: 'tax',
    note: 'uploads the daily VAT file to the filing partner',
  },
  {
    name: 'metrics-rollup',
    hour: 6,
    minute: 0,
    timeZone: 'UTC',
    owner: 'platform',
    note: 'aggregates yesterday into the warehouse',
  },
];
