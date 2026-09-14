import test from 'node:test';
import assert from 'node:assert/strict';
import { share, countFor } from '../lib/share.js';

test('share is a percentage to one decimal place', () => {
  assert.equal(share(305, 465), 65.6);
});

test('share of zero parts is zero', () => {
  assert.equal(share(0, 465), 0);
});

test('a non-positive total is rejected', () => {
  assert.throws(() => share(1, 0), RangeError);
});

test('countFor inverts share', () => {
  assert.equal(countFor(15, 508), 76);
});

test('countFor rejects a share outside 0-100', () => {
  assert.throws(() => countFor(101, 508), RangeError);
});
