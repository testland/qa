'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { grantRole, hasPermission } = require('../src/accounts');
const { account, org, knownRoles } = require('./fixtures');

test('an account belongs to its org', () => {
  assert.equal(account.orgId, org.id);
});

test('an editor can write', () => {
  assert.equal(hasPermission(account, 'write'), true);
});

test('granting admin allows deleting', () => {
  grantRole(account, 'admin');

  assert.equal(hasPermission(account, 'delete'), true);
});

test('an admin keeps the editor permissions', () => {
  assert.equal(hasPermission(account, 'write'), true);
  assert.equal(account.roles.length, 2);
});

test('an unknown role is refused', () => {
  assert.throws(() => grantRole(account, 'owner'), /Unknown role/);
  assert.equal(account.roles.length, 2);
});

test('every known role can be granted', () => {
  for (const role of knownRoles) {
    grantRole(account, role);
  }

  assert.equal(account.roles.length, knownRoles.length);
});
