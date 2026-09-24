import test from 'node:test';
import assert from 'node:assert/strict';
import { splitAmount } from '../src/split.js';

test('splits evenly between two parties', () => {
  assert.deepEqual(splitAmount(1000, [50, 50]), [500, 500]);
});

test('splits three ways', () => {
  assert.deepEqual(splitAmount(1200, [25, 25, 50]), [300, 300, 600]);
});

test('rejects shares that do not sum to 100', () => {
  assert.throws(() => splitAmount(1000, [50, 40]), /sum to 100/);
});
