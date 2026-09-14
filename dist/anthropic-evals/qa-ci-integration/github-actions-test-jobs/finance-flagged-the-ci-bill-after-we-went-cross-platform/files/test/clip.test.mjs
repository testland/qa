import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, chunk } from '../src/clip.mjs';

test('clamps below the floor', () => {
  assert.equal(clamp(-4, 0, 10), 0);
});

test('clamps above the ceiling', () => {
  assert.equal(clamp(99, 0, 10), 10);
});

test('leaves a value inside the range alone', () => {
  assert.equal(clamp(5, 0, 10), 5);
});

test('rejects an inverted range', () => {
  assert.throws(() => clamp(1, 10, 0), RangeError);
});

test('chunks evenly', () => {
  assert.deepEqual(chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]);
});

test('chunks with a short tail', () => {
  assert.deepEqual(chunk([1, 2, 3], 2), [[1, 2], [3]]);
});

test('rejects a zero chunk size', () => {
  assert.throws(() => chunk([1], 0), RangeError);
});
