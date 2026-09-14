import test from 'node:test';
import assert from 'node:assert/strict';
import { tierFor, chargeCents } from './tiers.js';

test('the free tier covers its upper bound', () => {
  assert.equal(tierFor(1000).name, 'free');
});

test('one unit past the free bound is growth', () => {
  assert.equal(tierFor(1001).name, 'growth');
});

test('the scale tier catches everything above growth', () => {
  assert.equal(tierFor(50001).name, 'scale');
});

test('negative units are rejected', () => {
  assert.throws(() => tierFor(-1), RangeError);
});

test('free usage is free', () => {
  assert.equal(chargeCents(1000), 0);
});

test('growth usage charges four cents a unit', () => {
  assert.equal(chargeCents(20000), 80000);
});
