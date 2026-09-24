'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { tally, renderReleaseNotes } = require('../scripts/release-notes.js');

const SAMPLE = [
  { name: 'one', status: 'passed' },
  { name: 'two', status: 'passed' },
  { name: 'three', status: 'failed' },
  { name: 'four', status: 'broken' },
  { name: 'five', status: 'skipped' },
];

test('tallies every allure status', () => {
  assert.deepEqual(tally(SAMPLE), { passed: 2, failed: 1, broken: 1, skipped: 1, unknown: 0 });
});

test('renders a heading carrying the version', () => {
  const md = renderReleaseNotes({
    version: 'v0.0.1',
    results: SAMPLE,
    buildUrl: 'https://ci.example.com/job/gate/1',
  });
  assert.match(md, /^## QA - v0\.0\.1/);
});
