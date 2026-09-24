import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCents } from '../../src/dispatch.js';

test('zone A quote includes the per-500g step', () => {
  assert.equal(quoteCents(1200, 'A'), 555);
});

test('zone B base rate applies', () => {
  assert.equal(quoteCents(500, 'B'), 655);
});

test('zone C is the most expensive base', () => {
  assert.ok(quoteCents(500, 'C') > quoteCents(500, 'B'));
});

test('non-positive weight is rejected', () => {
  assert.throws(() => quoteCents(0, 'A'), RangeError);
});

test('unknown zone is rejected', () => {
  assert.throws(() => quoteCents(100, 'Z'), RangeError);
});
