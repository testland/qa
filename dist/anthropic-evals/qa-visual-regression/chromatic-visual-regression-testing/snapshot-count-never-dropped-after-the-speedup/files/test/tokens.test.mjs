import test from 'node:test';
import assert from 'node:assert/strict';
import { space, SCALE } from '../src/theme/tokens.mjs';

test('maps a step to its pixel value', () => {
  assert.equal(space(0), '0px');
  assert.equal(space(4), '12px');
  assert.equal(space(SCALE.length - 1), '64px');
});

test('rejects a step off the end of the scale', () => {
  assert.throws(() => space(SCALE.length), RangeError);
  assert.throws(() => space(-1), RangeError);
});

test('rejects a non-integer step', () => {
  assert.throws(() => space(1.5), RangeError);
});
