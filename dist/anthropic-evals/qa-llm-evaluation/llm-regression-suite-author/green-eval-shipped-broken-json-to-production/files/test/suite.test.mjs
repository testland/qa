import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export function cases(path = 'eval/cases.jsonl') {
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function run(path = 'results/pr-1180.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('every case has an id and at least one assertion', () => {
  for (const c of cases()) {
    assert.equal(typeof c.id, 'string');
    assert.ok(Array.isArray(c.assert) && c.assert.length >= 1, `${c.id} has no assertions`);
  }
});

test('case ids are unique', () => {
  const ids = cases().map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the captured run covers exactly the cases in the case file', () => {
  const fromCases = cases().map((c) => c.id).sort().join(',');
  const fromRun = run().results.map((r) => r.id).sort().join(',');
  assert.equal(fromRun, fromCases);
});

test('the captured run was reported as a full pass', () => {
  assert.equal(run().results.filter((r) => r.success).length, 8);
});
