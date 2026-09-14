import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry } from '../../src/ledger/entry.js';

test('entry carries the minor amount unchanged', () => {
  const e = buildEntry({ amountMinor: 1999, currency: 'USD', ref: 'R1', postedAt: '2026-09-15' });
  assert.equal(e.amount_minor, 1999);
});

test('entry stamps the schema version', () => {
  const e = buildEntry({ amountMinor: 1, currency: 'EUR', ref: 'R2', postedAt: '2026-09-15' });
  assert.equal(e.schema, 'ledger.entry.v3');
});

test('a fractional minor amount is rejected', () => {
  assert.throws(
    () => buildEntry({ amountMinor: 19.99, currency: 'USD', ref: 'R3', postedAt: '2026-09-15' }),
    TypeError
  );
});

test('a malformed currency code is rejected', () => {
  assert.throws(
    () => buildEntry({ amountMinor: 1, currency: 'usd', ref: 'R4', postedAt: '2026-09-15' }),
    RangeError
  );
});
