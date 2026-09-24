import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, rate } from '../scripts/runs.mjs';

test('baseline reports 25 of 30', () => {
  assert.equal(rate(load('results/baseline-2026-08-30.json').results), 25 / 30);
});

test('candidate reports 29 of 30', () => {
  assert.equal(rate(load('results/candidate-2026-09-11.json').results), 29 / 30);
});

test('both runs cover the same case ids', () => {
  const ids = (p) => load(p).results.map((r) => r.id).sort().join(',');
  assert.equal(ids('results/baseline-2026-08-30.json'), ids('results/candidate-2026-09-11.json'));
});

test('both runs name the same dataset file', () => {
  assert.equal(
    load('results/baseline-2026-08-30.json').datasetFile,
    load('results/candidate-2026-09-11.json').datasetFile,
  );
});
