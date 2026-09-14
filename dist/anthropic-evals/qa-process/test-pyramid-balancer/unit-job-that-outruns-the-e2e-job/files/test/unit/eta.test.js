import test from 'node:test';
import assert from 'node:assert/strict';
import { etaMinutes } from '../../src/dispatch.js';

test('drive time plus stop overhead', () => {
  assert.equal(etaMinutes(100, 3), 181);
});

test('no stops means drive time only', () => {
  assert.equal(etaMinutes(10, 0), 16);
});

test('every stop costs seven minutes', () => {
  assert.equal(etaMinutes(10, 2) - etaMinutes(10, 1), 7);
});
