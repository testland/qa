import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export const config = JSON.parse(readFileSync('eval/regression.config.json', 'utf8'));

test('config names a dataset file', () => {
  assert.match(config.datasetFile, /^datasets\/.+\.jsonl$/);
});

test('config declares at least one provider', () => {
  assert.ok(Array.isArray(config.providers) && config.providers.length >= 1);
  for (const p of config.providers) assert.equal(typeof p.id, 'string');
});

test('config declares a grader', () => {
  assert.equal(typeof config.grader.model, 'string');
});

test('config declares a gate', () => {
  assert.ok(config.gate && Object.keys(config.gate).length >= 1);
});
