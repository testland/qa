import { test } from 'node:test';
import assert from 'node:assert/strict';
import { obscuredBy } from '../tools/obscured.js';

const OVERLAYS = [
  { id: 'sticky site header', top: 0, bottom: 72 },
  { id: 'cookie consent strip', top: 744, bottom: 836 },
  { id: 'fixed action bar', top: 836, bottom: 900 },
];

test('an element clear of every band is not obscured', () => {
  const r = obscuredBy({ top: 300, bottom: 344 }, OVERLAYS);
  assert.equal(r.kind, 'none');
  assert.equal(r.coveredPx, 0);
});

test('an element clipped by one band reports the covered depth', () => {
  const r = obscuredBy({ top: 58, bottom: 102 }, OVERLAYS);
  assert.equal(r.kind, 'partial');
  assert.equal(r.coveredPx, 14);
  assert.deepEqual(r.by, ['sticky site header']);
});

test('an element inside a band is reported as fully covered', () => {
  const r = obscuredBy({ top: 848, bottom: 888 }, OVERLAYS);
  assert.equal(r.kind, 'entire');
  assert.deepEqual(r.by, ['fixed action bar']);
});

test('the consent strip swallows the save-card checkbox', () => {
  const r = obscuredBy({ top: 760, bottom: 780 }, OVERLAYS);
  assert.equal(r.kind, 'entire');
  assert.deepEqual(r.by, ['cookie consent strip']);
});
