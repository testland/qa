'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deactivate, hasPermission } = require('../src/accounts');
const { account } = require('./fixtures');

test('an active editor can read', () => {
  assert.equal(hasPermission(account, 'read'), true);
});

test('deactivating removes reading', () => {
  deactivate(account);

  assert.equal(hasPermission(account, 'read'), false);
});

test('a deactivated account cannot write either', () => {
  assert.equal(hasPermission(account, 'write'), false);
});
