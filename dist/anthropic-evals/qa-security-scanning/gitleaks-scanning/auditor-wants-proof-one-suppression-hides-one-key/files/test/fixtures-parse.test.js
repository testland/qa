'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const files = [
  'tests/fixtures/sdk-checkout.json',
  'tests/fixtures/checkout-live-replay.json',
];

test('every SDK fixture parses', () => {
  for (const f of files) {
    assert.doesNotThrow(() => JSON.parse(fs.readFileSync(f, 'utf8')), f + ' does not parse');
  }
});

test('every SDK fixture declares the fields the replay harness reads', () => {
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const key of ['stripeKey', 'amountMinor', 'currency']) {
      assert.ok(Object.hasOwn(j, key), f + ' missing ' + key);
    }
  }
});

test('both scan snapshots parse as arrays', () => {
  for (const f of ['.secrets/scan-2026-03-28.json', '.secrets/scan-2026-09-10.json']) {
    assert.ok(Array.isArray(JSON.parse(fs.readFileSync(f, 'utf8'))), f);
  }
});
