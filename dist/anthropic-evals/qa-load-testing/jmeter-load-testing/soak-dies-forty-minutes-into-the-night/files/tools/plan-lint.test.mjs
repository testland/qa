import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lint, rules } from './plan-lint.mjs';

const withDuration = `
<ThreadGroup testname="ok">
  <stringProp name="ThreadGroup.num_threads">10</stringProp>
  <stringProp name="ThreadGroup.duration">600</stringProp>
</ThreadGroup>`;

const withoutDuration = `
<ThreadGroup testname="bad">
  <stringProp name="ThreadGroup.num_threads">10</stringProp>
  <stringProp name="ThreadGroup.duration"></stringProp>
</ThreadGroup>`;

test('a thread group with a duration passes', () => {
  assert.deepEqual(lint(withDuration), []);
});

test('a thread group without a duration is flagged', () => {
  const found = lint(withoutDuration);
  assert.equal(found.length, 1);
  assert.equal(found[0].rule, 'threadgroup-duration');
});

test('rule ids are unique', () => {
  const ids = rules.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the shipped soak plan passes every rule', () => {
  const xml = readFileSync(new URL('../plans/search-soak.jmx', import.meta.url), 'utf8');
  assert.deepEqual(lint(xml), []);
});
