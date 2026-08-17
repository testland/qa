import { expect, test } from 'vitest';
import { delaysFor } from './attempts.js';

test('doubles the wait between attempts', () => {
  expect(delaysFor(3, 1000)).toEqual([1000, 2000]);
});

test('a single attempt never waits', () => {
  expect(delaysFor(1, 1000)).toEqual([]);
});
