import test from 'node:test';
import assert from 'node:assert/strict';
import { taxCents } from '../../src/tax.js';

test('applies a per-mille rate', () => {
  assert.equal(taxCents(10_000, 200), 2_000);
});

test('rounds half away from zero', () => {
  assert.equal(taxCents(101, 50), 5);
});

test('rejects a negative amount', () => {
  assert.throws(() => taxCents(-1, 200), /bad amount/);
});
