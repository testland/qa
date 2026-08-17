'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildDashboard } = require('./dashboard');
const { DATA } = require('./fixtures');

test('dashboard matches the golden baseline', () => {
  const golden = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '__golden__', 'dashboard.json'), 'utf8'),
  );

  assert.deepEqual(buildDashboard(DATA), golden);
});
