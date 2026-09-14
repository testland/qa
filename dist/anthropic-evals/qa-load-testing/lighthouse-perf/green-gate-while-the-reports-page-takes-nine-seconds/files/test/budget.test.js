'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const budget = JSON.parse(readFileSync(join(__dirname, '..', 'budget.json'), 'utf8'));

test('budget file is a non-empty array', () => {
  assert.ok(Array.isArray(budget) && budget.length > 0);
});

test('every budget entry declares the path it applies to', () => {
  for (const entry of budget) assert.equal(typeof entry.path, 'string');
});
