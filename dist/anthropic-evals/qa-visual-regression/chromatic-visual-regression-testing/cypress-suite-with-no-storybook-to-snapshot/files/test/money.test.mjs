import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMinorUnits, sumMinorUnits } from '../src/format/money.mjs';

test('formats minor units without floating point drift', () => {
  assert.equal(formatMinorUnits(104299).replace(/ /g, ' '), '€1,042.99');
  assert.equal(formatMinorUnits(0).replace(/ /g, ' '), '€0.00');
});

test('rejects fractional minor units', () => {
  assert.throws(() => formatMinorUnits(10.5), TypeError);
  assert.throws(() => sumMinorUnits([1, 2.5]), TypeError);
});

test('sums minor units exactly', () => {
  assert.equal(sumMinorUnits([104299, 1, 700]), 105000);
  assert.equal(sumMinorUnits([]), 0);
});
