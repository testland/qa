'use strict';

const ORDER = {
  number: 'INV-1001',
  paidCents: 3000,
  method: 'card',
  lines: [
    { sku: 'A-1', cents: 1000 },
    { sku: 'B-2', cents: 2000 },
  ],
};

const ACCOUNT = { id: 'acc_9', openingCents: 5000, movements: [-1200, 400, -300] };

module.exports = { ORDER, ACCOUNT };
