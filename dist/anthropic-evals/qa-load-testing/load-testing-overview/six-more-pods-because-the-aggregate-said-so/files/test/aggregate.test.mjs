import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workerP95, runP95 } from '../scripts/aggregate.mjs';

const read = (n) =>
  readFileSync(new URL(`../results/worker-${n}_stats.csv`, import.meta.url), 'utf8');
const all = [1, 2, 3, 4].map(read);

test('a worker p95 is read off its Aggregated row', () => {
  assert.equal(workerP95(all[0]), 268);
  assert.equal(workerP95(all[3]), 2810);
});

test('the readiness run reports 2810ms', () => {
  assert.equal(runP95(all), 2810);
});
