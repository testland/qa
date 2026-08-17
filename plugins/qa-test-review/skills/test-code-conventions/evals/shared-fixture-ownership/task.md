# Account tests only pass in the order they are written

## Problem Description

`tests/fixtures.js` builds one account when it is imported, grants it a role,
and hands the same object to every test in the suite. Two things follow from
that.

The first is that tests cannot be run on their own. `node --test
--test-name-pattern 'an admin keeps the editor permissions'` fails, because the
role it depends on is granted by the test above it. The same is true of the
last test in `tests/permissions.test.js`. Nobody noticed, because the whole
file always runs.

The second is that a reader cannot tell what any test is actually about. The
starting state - which org, which role, whether the account is still active -
is in another file, and each test silently changes it for the next one.

We are about to turn on parallel execution, which will run these in an
unpredictable order.

## Output Specification

1. Rework `tests/fixtures.js`, `tests/accounts.test.js` and
   `tests/permissions.test.js` so that every test passes when it runs alone and
   passes in any order relative to the others. Verify this: each test must pass
   under `node --test --test-name-pattern '<that test name>'`.
2. Every assertion that exists today must still exist. This is a rework of how
   the tests get their data, not a trim.
3. Anything a test's assertions depend on must be visible from that test.
4. Produce `fixture-review.md` explaining what was shared, what may still be
   shared, and how you decided.

Do not change `src/accounts.js`.

Run `npm test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "accounts",
  "version": "4.1.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/accounts.js ===============
'use strict';

const PERMISSIONS = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete'],
};

function createAccount({ id, email, orgId }) {
  return { id, email, orgId, roles: [], active: true };
}

function grantRole(account, role) {
  if (!PERMISSIONS[role]) {
    throw new Error(`Unknown role: ${role}`);
  }
  if (!account.roles.includes(role)) {
    account.roles.push(role);
  }
  return account;
}

function deactivate(account) {
  account.active = false;
  return account;
}

function hasPermission(account, permission) {
  if (!account.active) {
    return false;
  }
  return account.roles.some((role) => PERMISSIONS[role].includes(permission));
}

module.exports = { createAccount, grantRole, deactivate, hasPermission };

=============== FILE: tests/fixtures.js ===============
'use strict';

const { createAccount, grantRole } = require('../src/accounts');

const org = { id: 'org-42', name: 'Acme', plan: 'team', seats: 25 };

const account = createAccount({ id: 'u-1', email: 'ada@acme.test', orgId: org.id });
grantRole(account, 'editor');

const knownRoles = ['viewer', 'editor', 'admin'];

module.exports = { org, account, knownRoles };

=============== FILE: tests/accounts.test.js ===============
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

=============== FILE: tests/permissions.test.js ===============
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
