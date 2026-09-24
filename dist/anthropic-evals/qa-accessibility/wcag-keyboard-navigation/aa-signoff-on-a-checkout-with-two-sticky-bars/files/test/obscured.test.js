import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlapReport } from '../tools/obscured.js';

const OVERLAYS = [
  { id: 'sticky site header', top: 0, bottom: 72 },
  { id: 'cookie consent strip', top: 744, bottom: 836 },
  { id: 'fixed action bar', top: 836, bottom: 900 },
];

test('an element clear of every band reports nothing covered', () => {
  const r = overlapReport({ top: 300, bottom: 344 }, OVERLAYS);
  assert.equal(r.coveredPx, 0);
  assert.equal(r.visiblePx, 44);
  assert.deepEqual(r.by, []);
});

test('an element reaching under one band reports the covered depth', () => {
  const r = overlapReport({ top: 58, bottom: 102 }, OVERLAYS);
  assert.equal(r.height, 44);
  assert.equal(r.coveredPx, 14);
  assert.equal(r.visiblePx, 30);
  assert.deepEqual(r.by, ['sticky site header']);
});

test('the gift-message box reaches under the consent strip', () => {
  const r = overlapReport({ top: 690, bottom: 760 }, OVERLAYS);
  assert.equal(r.coveredPx, 16);
  assert.equal(r.visiblePx, 54);
});

test('adjacent bands are not double-counted', () => {
  const r = overlapReport({ top: 800, bottom: 900 }, OVERLAYS);
  assert.equal(r.coveredPx, 100);
  assert.deepEqual(r.by, ['cookie consent strip', 'fixed action bar']);
});
