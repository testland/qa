'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { validateTiers } = require('../lib/tiers');

test('flags gaps, strays and out-of-range tiers', () => {
  const problems = validateTiers(['a', 'b'], { a: 9, c: 3 });
  assert.deepEqual(problems, ['no tier for b', 'tier for unknown test c', 'tier out of range for a: 9']);
});

test('shipped tier file matches the stats file', () => {
  const root = join(__dirname, '..');
  const stats = JSON.parse(readFileSync(join(root, 'data', 'e2e-stats.json'), 'utf8'));
  const tiers = JSON.parse(readFileSync(join(root, 'data', 'value-tiers.json'), 'utf8'));
  assert.deepEqual(validateTiers(Object.keys(stats.tests), tiers), []);
});
