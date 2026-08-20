'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const tenancy = require('../src/tenancy');
const { makeOrg, makeUser, makeApiKey } = require('./support/factories');

afterEach(() => {
  tenancy.deleteAllUsers();
});

test('lists the users of an org', () => {
  const org = makeOrg();
  makeUser(org, 'ana@example.test');
  makeUser(org, 'bo@example.test');
  assert.equal(tenancy.usersIn(org.id).length, 2);
});

test('rejects a duplicate email', () => {
  const org = makeOrg();
  makeUser(org, 'ana@example.test');
  assert.throws(() => makeUser(org, 'ana@example.test'), /already exists/);
});

test('revokes an api key', () => {
  const org = makeOrg();
  const user = makeUser(org, 'cy@example.test');
  const key = makeApiKey(user);
  tenancy.revokeApiKey(key.id);
  assert.equal(tenancy.keysFor(user.id).length, 0);
});

test('issues an api key to a user', () => {
  const org = makeOrg();
  const user = makeUser(org, 'di@example.test');
  makeApiKey(user);
  assert.equal(tenancy.keysFor(user.id).length, 1);
});

test('leaves no rows behind', () => {
  assert.deepEqual(tenancy.counts(), { orgs: 0, users: 0, keys: 0 });
});
