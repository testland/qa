'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { check } = require('./scan-policy');

test('the passive crawl is permitted against the live store', () => {
  assert.equal(check({ scanner: 'zap-baseline.py', environment: 'production' }).allowed, true);
});

test('template fuzzing is blocked against the live store', () => {
  const result = check({ scanner: 'nuclei', environment: 'production' });
  assert.equal(result.allowed, false);
  assert.match(result.reason, /active payloads/);
});

test('the full scan is blocked against the live store', () => {
  assert.equal(check({ scanner: 'zap-full-scan.py', environment: 'production' }).allowed, false);
});

test('template fuzzing is permitted against staging', () => {
  assert.equal(check({ scanner: 'nuclei', environment: 'staging' }).allowed, true);
});

test('a plan missing its environment is rejected rather than assumed', () => {
  assert.equal(check({ scanner: 'nuclei' }).allowed, false);
});
