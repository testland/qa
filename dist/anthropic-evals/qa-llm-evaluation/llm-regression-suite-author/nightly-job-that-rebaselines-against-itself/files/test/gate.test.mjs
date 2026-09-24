import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, rate, gate, MIN_RATIO } from '../scripts/gate.mjs';

test('rate reads passed over total', () => {
  assert.equal(rate('results/baseline.json'), 0.847);
  assert.equal(rate('results/tonight.json'), 0.844);
});

test('a run that keeps almost all of the baseline passes', () => {
  assert.equal(decide(0.9, 0.895, MIN_RATIO).ok, true);
});

test('a run that loses a tenth of the baseline fails', () => {
  assert.equal(decide(0.9, 0.81, MIN_RATIO).ok, false);
});

test('last night was reported as a pass', () => {
  assert.equal(gate('results/baseline.json', 'results/tonight.json').ok, true);
});
