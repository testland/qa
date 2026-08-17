# Our test helpers create four kinds of row and we only ever delete one of them

## Problem Description

`tests/tenancy.test.js` is red on its last test, which checks that the file
leaves the database as it found it. Orgs and api keys are piling up. Users are
not, because the file's cleanup hook calls `deleteAllUsers()`.

That hook was written when the helper module only made users. Since then
`tests/support/factories.js` grew an org factory and an api key factory and
nobody updated the hook, and the same will happen with the next factory.

`deleteAllUsers()` is also not something we can keep calling. In CI this
database is shared by three suites running at the same time, and clearing a
whole table has already deleted rows belonging to a suite that was still
running.

The per-row deletes refuse to break referential integrity: a user with api
keys cannot be deleted, and an org with users cannot be deleted.

## Output Specification

1. Change `tests/tenancy.test.js` and `tests/support/factories.js` so that
   everything a test creates is removed after that test, using per-row
   deletes only. Do not modify `src/tenancy.js`.
2. Adding a fifth factory later must not require anyone to edit the cleanup
   hook. Make that property true, and say in the notes what a factory author
   has to do instead.
3. Keep all five tests, their names, and their assertions exactly as they
   are.
4. Run `npm test` before you finish; it must pass.
5. Produce `cleanup-design.md`: what the hook was missing and why it was
   always going to drift, why clearing whole tables is not an option here,
   and the rule for the next factory.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "tenancy",
  "version": "0.8.4",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/tenancy.js ===============
'use strict';

const orgs = new Map();
const users = new Map();
const keys = new Map();
let seq = 1;

function createOrg(name) {
  const org = { id: `org-${seq++}`, name };
  orgs.set(org.id, org);
  return org;
}

function createUser(orgId, email) {
  if (!orgs.has(orgId)) throw new Error(`no such org ${orgId}`);
  for (const user of users.values()) {
    if (user.email === email) throw new Error(`email ${email} already exists`);
  }
  const user = { id: `user-${seq++}`, orgId, email };
  users.set(user.id, user);
  return user;
}

function issueApiKey(userId) {
  if (!users.has(userId)) throw new Error(`no such user ${userId}`);
  const key = { id: `key-${seq++}`, userId };
  keys.set(key.id, key);
  return key;
}

function revokeApiKey(id) {
  keys.delete(id);
}

function deleteUser(id) {
  for (const key of keys.values()) {
    if (key.userId === id) throw new Error(`user ${id} still has api keys`);
  }
  users.delete(id);
}

function deleteOrg(id) {
  for (const user of users.values()) {
    if (user.orgId === id) throw new Error(`org ${id} still has users`);
  }
  orgs.delete(id);
}

function deleteAllUsers() {
  users.clear();
}

function usersIn(orgId) {
  return [...users.values()].filter((u) => u.orgId === orgId);
}

function keysFor(userId) {
  return [...keys.values()].filter((k) => k.userId === userId);
}

function counts() {
  return { orgs: orgs.size, users: users.size, keys: keys.size };
}

module.exports = {
  createOrg, createUser, issueApiKey, revokeApiKey, deleteUser, deleteOrg,
  deleteAllUsers, usersIn, keysFor, counts,
};

=============== FILE: tests/support/factories.js ===============
'use strict';

const tenancy = require('../../src/tenancy');

let n = 0;

function makeOrg() {
  return tenancy.createOrg(`org ${(n += 1)}`);
}

function makeUser(org, email) {
  return tenancy.createUser(org.id, email || `user${(n += 1)}@example.test`);
}

function makeApiKey(user) {
  return tenancy.issueApiKey(user.id);
}

module.exports = { makeOrg, makeUser, makeApiKey };

=============== FILE: tests/tenancy.test.js ===============
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
