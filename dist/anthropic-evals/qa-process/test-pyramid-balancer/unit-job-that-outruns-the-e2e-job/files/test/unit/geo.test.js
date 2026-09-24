import test from 'node:test';
import assert from 'node:assert/strict';
import { zoneFor } from '../../src/dispatch.js';

test('50km is still zone A', () => {
  assert.equal(zoneFor(50), 'A');
});

test('51km crosses into zone B', () => {
  assert.equal(zoneFor(51), 'B');
});

test('400km is the top of zone B', () => {
  assert.equal(zoneFor(400), 'B');
});

test('negative distance is rejected', () => {
  assert.throws(() => zoneFor(-1), RangeError);
});
