import test from 'node:test';
import assert from 'node:assert/strict';
import { pct, plural } from '../lib/format.js';

test('formats a percentage', () => {
  assert.equal(pct(79.6), '80%');
});

test('pluralises a count', () => {
  assert.equal(plural(1, 'defect'), '1 defect');
  assert.equal(plural(5, 'defect'), '5 defects');
});
