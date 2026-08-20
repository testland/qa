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
