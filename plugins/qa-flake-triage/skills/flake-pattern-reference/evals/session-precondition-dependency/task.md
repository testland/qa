# Session tests only pass when the whole file runs

## Problem Description

We added a hotfix pipeline that runs a single test by name before deploying:
`node --test --test-name-pattern='<name>'`. Two tests in
`test/session.test.js` fail immediately under it - one with
`TypeError: Cannot read properties of null (reading 'displayName')` and one
with `Error: no active session`. The same two tests are green in the normal
full-file run, and have been for months.

We also moved the sign-out test up a couple of slots while debugging
something unrelated, and two other tests went red in the full run as well.
Moving it back made them green again. Nobody changed `src/session.js` in
either direction.

The hotfix pipeline is not going away, and we want to be able to add tests
anywhere in the file without auditing what runs before them.

## Output Specification

1. Fix `test/session.test.js` so that every test passes both in a full
   `node --test` run and when it is the only test selected by
   `--test-name-pattern`, in any position in the file.
2. Keep all five tests and their assertions about what each scenario should
   produce. Do not modify `src/session.js`.
3. Write `session-notes.md`: why two tests fail alone and pass in the full
   run, why moving one unrelated test changed which tests were red, and the
   rule that keeps a newly added test from re-creating this.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "console-api",
  "version": "1.8.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/session.js ===============
'use strict';

const USERS = {
  ada: { user: 'ada', displayName: 'Ada L.', role: 'admin' },
  grace: { user: 'grace', displayName: 'Grace H.', role: 'auditor' },
};

let active = null;

function signIn(user) {
  const record = USERS[user];
  if (!record) {
    throw new Error(`unknown user: ${user}`);
  }
  active = { ...record };
  return active;
}

function activeSession() {
  return active;
}

function signOut() {
  active = null;
}

function permissions() {
  if (!active) {
    throw new Error('no active session');
  }
  return active.role === 'admin' ? ['read', 'write', 'admin'] : ['read'];
}

module.exports = { signIn, activeSession, signOut, permissions };

=============== FILE: test/session.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  signIn,
  activeSession,
  signOut,
  permissions,
} = require('../src/session');

test('signing in makes a session active', () => {
  const session = signIn('ada');
  assert.equal(session.user, 'ada');
  assert.equal(activeSession().user, 'ada');
});

test('the active session carries the display name', () => {
  assert.equal(activeSession().displayName, 'Ada L.');
});

test('an admin session can write', () => {
  assert.deepEqual(permissions(), ['read', 'write', 'admin']);
});

test('signing out clears the active session', () => {
  signOut();
  assert.equal(activeSession(), null);
});

test('an auditor session is read only', () => {
  signIn('grace');
  assert.deepEqual(permissions(), ['read']);
});
