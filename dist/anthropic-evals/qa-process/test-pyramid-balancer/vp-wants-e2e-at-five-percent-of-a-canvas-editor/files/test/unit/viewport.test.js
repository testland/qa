import test from 'node:test';
import assert from 'node:assert/strict';
import { clampZoom, clampPan } from '../../src/viewport.js';

test('zoom clamps at twenty-five percent', () => {
  assert.equal(clampZoom(10), 25);
});

test('zoom clamps at four hundred percent', () => {
  assert.equal(clampZoom(900), 400);
});

test('pan offset is clamped to the canvas', () => {
  assert.equal(clampPan(5000, 1200, 800), 400);
});

test('pan offset of zero is unchanged', () => {
  assert.equal(clampPan(0, 1200, 800), 0);
});
