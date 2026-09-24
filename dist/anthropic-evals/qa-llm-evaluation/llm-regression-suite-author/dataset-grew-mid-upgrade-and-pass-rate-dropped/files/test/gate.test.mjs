import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, passRate, verdict } from '../scripts/gate.mjs';

test('baseline run passes five of its six cases', () => {
  assert.equal(passRate(load('results/baseline-2026-08-11.json')), 5 / 6);
});

test('candidate run passes five of its eight cases', () => {
  assert.equal(passRate(load('results/candidate-2026-09-10.json')), 5 / 8);
});

test('a verdict is returned rather than thrown', () => {
  const v = verdict('results/baseline-2026-08-11.json', 'results/candidate-2026-09-10.json');
  assert.equal(typeof v.ok, 'boolean');
});

test('every case in the baseline also appears in the candidate run', () => {
  const ids = (p) => new Set(load(p).results.map((r) => r.id));
  const base = ids('results/baseline-2026-08-11.json');
  const cand = ids('results/candidate-2026-09-10.json');
  for (const id of base) assert.ok(cand.has(id), `${id} missing from the candidate run`);
});
