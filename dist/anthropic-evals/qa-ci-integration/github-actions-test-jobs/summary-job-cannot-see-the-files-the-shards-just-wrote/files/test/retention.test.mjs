import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetention } from '../src/audit.mjs';

test('a record past the window is retained', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 40 * 86400000 }, now, 30), true);
});

test('a record inside the window is not', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 5 * 86400000 }, now, 30), false);
});
