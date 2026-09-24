'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isRegistered } = require('./redirects');

test('the production callback is accepted', () => {
  assert.equal(isRegistered('https://app.acme.io/auth/callback'), true);
});

test('a preview deploy callback is accepted', () => {
  assert.equal(isRegistered('https://app.acme.io/pr-412/auth/callback'), true);
});

test('the local dev callback is accepted', () => {
  assert.equal(isRegistered('http://localhost:5173/auth/callback'), true);
});

test('an unrelated host is rejected', () => {
  assert.equal(isRegistered('https://evil.test/auth/callback'), false);
});

test('an empty callback is rejected', () => {
  assert.equal(isRegistered(''), false);
});
