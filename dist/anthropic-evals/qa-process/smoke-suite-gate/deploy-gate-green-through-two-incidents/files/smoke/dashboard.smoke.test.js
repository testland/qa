'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: dashboard loads', async () => {
  const res = await app.getDashboard('t-smoke-session');
  assert.ok(res.status !== 500, 'dashboard should not blow up');
});
