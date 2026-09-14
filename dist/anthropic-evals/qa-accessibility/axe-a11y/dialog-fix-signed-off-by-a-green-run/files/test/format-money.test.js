import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMinor } from '../src/format-money.js';

test('formats minor units as currency', () => {
  assert.equal(formatMinor(129900, 'USD'), '$1,299.00');
});
