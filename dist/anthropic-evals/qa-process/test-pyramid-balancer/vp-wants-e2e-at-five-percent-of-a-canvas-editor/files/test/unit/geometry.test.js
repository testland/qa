import test from 'node:test';
import assert from 'node:assert/strict';
import { snapDistance, boundingBox, rotatedArea, areaOf } from '../../src/geometry.js';

test('snap distance rounds to the grid', () => {
  assert.equal(snapDistance(13, 10), 10);
});

test('snap distance of a negative offset rounds toward zero', () => {
  assert.equal(snapDistance(-13, 10), -10);
});

test('rotation preserves bounding box area', () => {
  assert.equal(rotatedArea({ w: 4, h: 2 }, 90), 8);
});

test('bounding box of two rooms is their union', () => {
  const box = boundingBox([
    { x: 0, y: 0, w: 2, h: 2 },
    { x: 3, y: 1, w: 1, h: 1 }
  ]);
  assert.deepEqual(box, { x: 0, y: 0, w: 4, h: 2 });
});

test('area sums to the sum of its rooms', () => {
  assert.equal(areaOf([{ w: 2, h: 3 }, { w: 1, h: 4 }]), 10);
});

test('area of an empty plan is zero', () => {
  assert.equal(areaOf([]), 0);
});
