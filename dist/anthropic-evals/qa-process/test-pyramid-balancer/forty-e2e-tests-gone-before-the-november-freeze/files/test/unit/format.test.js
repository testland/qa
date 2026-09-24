import test from 'node:test';
import assert from 'node:assert/strict';
import { money, receiptLine } from '../../src/format.js';

test('money renders two decimals', () => {
  assert.equal(money(1999, 2), '19.99');
});

test('money renders none for a zero exponent', () => {
  assert.equal(money(1999, 0), '1999');
});

test('money of zero is zero', () => {
  assert.equal(money(0, 2), '0.00');
});

test('receipt line pads the amount to the right', () => {
  assert.match(receiptLine('Total', '19.99'), /^Total {30}19\.99$/);
});

test('receipt line is exactly the requested width', () => {
  assert.equal(receiptLine('Total', '19.99').length, 40);
});

test.todo('receipt line wraps at forty characters');
