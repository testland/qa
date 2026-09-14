'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: sign in', () => {
  app.signIn('verify@auben.test', process.env.VERIFY_PASSWORD || 'seeded-pw').then((res) => {
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });
});
