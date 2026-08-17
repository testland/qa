'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCampaign } = require('./campaign');

test('accepts an ordinary campaign budget', () => {
  const result = validateCampaign({
    dailyCapCents: 5000,
    totalBudgetCents: 250000,
  });
  assert.deepEqual(result, { ok: true, code: null });
});
