import test from 'node:test';
import assert from 'node:assert/strict';
import { isRetention } from '../src/audit.mjs';

test('a record exactly on the boundary is retained', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now - 30 * 86400000 }, now, 30), true);
});

test('a zero-day window retains everything', () => {
  const now = 1_800_000_000_000;
  assert.equal(isRetention({ createdAt: now }, now, 0), true);
});
