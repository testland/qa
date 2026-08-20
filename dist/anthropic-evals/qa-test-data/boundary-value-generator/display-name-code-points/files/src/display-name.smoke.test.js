'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDisplayName } = require('./display-name');

test('accepts an ordinary display name', () => {
  const result = validateDisplayName('ada');
  assert.equal(result.ok, true);
  assert.equal(result.code, null);
});
