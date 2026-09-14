import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, jobNames, overriddenProperties } from './check-envs.mjs';

const workflow = readFileSync(
  new URL('../.github/workflows/orders-load.yml', import.meta.url),
  'utf8',
);
const environments = JSON.parse(
  readFileSync(new URL('../ci/environments.json', import.meta.url), 'utf8'),
).map((e) => e.name);

test('every job in the workflow is found', () => {
  assert.deepEqual(jobNames(workflow), ['dev', 'us-staging', 'eu-staging', 'prod']);
});

test('every declared environment has a job', () => {
  assert.deepEqual(check(workflow, environments), []);
});

test('an environment with no job is reported', () => {
  const found = check(workflow, [...environments, 'apac-staging']);
  assert.deepEqual(found, ['no job for environment apac-staging']);
});

test('the properties the workflow overrides are listed', () => {
  assert.deepEqual(overriddenProperties(workflow).sort(), ['BASE_HOST', 'PORT', 'THREADS']);
});
