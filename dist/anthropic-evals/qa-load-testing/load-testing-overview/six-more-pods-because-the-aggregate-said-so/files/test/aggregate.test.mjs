import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { workerP95, workerCount, runP95 } from '../scripts/aggregate.mjs';

const read = (n) =>
  readFileSync(new URL(`../results/worker-${n}_stats.csv`, import.meta.url), 'utf8');
const all = [1, 2, 3, 4].map(read);

test('a generator p95 is read off its Aggregated row', () => {
  assert.equal(workerP95(all[0]), 612);
  assert.equal(workerCount(all[0]), 148900);
});

test('the four generators pool to the run p95', () => {
  assert.equal(runP95(all).toFixed(1), '633.7');
});
