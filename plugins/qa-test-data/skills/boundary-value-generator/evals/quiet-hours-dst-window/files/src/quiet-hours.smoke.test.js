'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isQuietHours } = require('./quiet-hours');

test('a mid-afternoon instant is not quiet hours', () => {
  const result = isQuietHours('2026-01-15T18:00:00.000Z', 'America/New_York');
  assert.deepEqual(result, { quiet: false, code: null });
});
