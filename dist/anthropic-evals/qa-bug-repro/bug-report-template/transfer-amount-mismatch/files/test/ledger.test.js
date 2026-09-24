'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { transfer, reconcile } = require('../src/ledger');
const { renderAmount } = require('../src/statement-renderer');

const ledger = JSON.parse(
  readFileSync(path.join(__dirname, '..', 'data', 'ledger-export.json'), 'utf8'),
);

test('an instant-route transfer leaves the customer whole', () => {
  const r = reconcile(transfer(ledger, 'TRF-90b02'));
  assert.strictEqual(r.balanced, true);
  assert.strictEqual(r.delta, 0);
});

test('the statement renderer prints minor units faithfully', () => {
  assert.strictEqual(renderAmount(125000), 'GBP 1,250.00');
  assert.strictEqual(renderAmount(120500), 'GBP 1,205.00');
});
