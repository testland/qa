'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { signIn, getDashboard } = require('../src/app');

test('sign-in rejects a wrong password', async () => {
  const res = await signIn('verify@auben.test', 'nope');
  assert.equal(res.status, 401);
});

test('the dashboard refuses an unknown session', async () => {
  const res = await getDashboard('t-nobody');
  assert.equal(res.status, 401);
});
