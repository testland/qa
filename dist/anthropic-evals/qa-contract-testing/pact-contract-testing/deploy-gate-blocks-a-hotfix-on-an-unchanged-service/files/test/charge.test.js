'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { serializeCharge } = require('../src/charge');

test('serializeCharge projects the five stored columns', () => {
  const row = {
    id: 'ch_991',
    amount_cents: 4200,
    currency: 'usd',
    status: 'succeeded',
    created_at: '2026-09-12T14:02:00Z',
    internal_ledger_ref: 'lg_44',
  };
  assert.deepEqual(serializeCharge(row), {
    id: 'ch_991',
    amount_cents: 4200,
    currency: 'usd',
    status: 'succeeded',
    created_at: '2026-09-12T14:02:00Z',
  });
});
