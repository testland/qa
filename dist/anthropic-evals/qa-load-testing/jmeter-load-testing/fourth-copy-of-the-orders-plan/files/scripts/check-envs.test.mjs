import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, jobNames, overriddenProperties, propertiesReadBy } from './check-envs.mjs';

const workflow = readFileSync(
  new URL('../.github/workflows/orders-load.yml', import.meta.url),
  'utf8',
);
const plan = readFileSync(new URL('../plans/orders.jmx', import.meta.url), 'utf8');
const environments = JSON.parse(
  readFileSync(new URL('../ci/environments.json', import.meta.url), 'utf8'),
).map((e) => e.name);

test('every job in the workflow is found', () => {
  assert.deepEqual(jobNames(workflow), ['dev', 'us-staging', 'eu-staging', 'prod']);
});

test('the properties the workflow overrides are listed', () => {
  assert.deepEqual(overriddenProperties(workflow).sort(), ['BASE_HOST', 'PORT', 'THREADS']);
});

test('the plan reads every value the workflow overrides', () => {
  const read = propertiesReadBy(plan);
  for (const p of overriddenProperties(workflow)) {
    assert.ok(read.includes(p), `plan does not read ${p}`);
  }
});

test('an environment with no job is reported', () => {
  const found = check(workflow, [...environments, 'apac-staging'], plan);
  assert.deepEqual(found, ['no job for environment apac-staging']);
});

test('the tree as it stands has nothing to report', () => {
  assert.deepEqual(check(workflow, environments, plan), []);
});
