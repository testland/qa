import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { breaches, thresholdFor } from './gate.mjs';

const statistics = JSON.parse(
  readFileSync(new URL('../artifacts/statistics-2026-09-11.json', import.meta.url), 'utf8'),
);
const thresholds = JSON.parse(
  readFileSync(new URL('./thresholds.json', import.meta.url), 'utf8'),
);

const named = (sampler) =>
  breaches(statistics, thresholds).filter((b) => b.sampler === sampler);

test('a sampler with no entry of its own uses the default', () => {
  assert.equal(thresholdFor('GET /search/facets', thresholds), 3000);
});

test('a sampler with an entry of its own uses it', () => {
  assert.equal(thresholdFor('GET /reporting/ledger', thresholds), 8000);
});

test('last night breaches on the reporting export sampler', () => {
  assert.deepEqual(named('GET /reporting/export'), [
    { sampler: 'GET /reporting/export', p95: 31402, limit: 8000 },
  ]);
});

test('last night breaches on the admin audit log sampler', () => {
  assert.deepEqual(named('GET /admin/audit-log'), [
    { sampler: 'GET /admin/audit-log', p95: 4918, limit: 4000 },
  ]);
});

test('the checkout and search samplers are inside their thresholds', () => {
  assert.deepEqual(named('POST /checkout/pay'), []);
  assert.deepEqual(named('GET /search/facets'), []);
});

test('the run is clean on errors', () => {
  assert.deepEqual(
    breaches(statistics, thresholds).filter((b) => 'errors' in b),
    [],
  );
});
