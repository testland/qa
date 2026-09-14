'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessions } = require('./sessions');

test('signing in gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'laptop-7');
  assert.equal(sessions.request(sid), 200);
});

test('an unknown session id is refused', () => {
  const sessions = createSessions();
  assert.equal(sessions.request('not-a-real-session'), 401);
});

test('signing out clears the session cookie', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'laptop-7');
  const res = sessions.logout(sid);
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /Max-Age=0/);
});

test('sign out everywhere succeeds for a signed-in agent', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.logoutAll(sid).status, 200);
});

test('sign out everywhere is refused for an unknown session', () => {
  const sessions = createSessions();
  assert.equal(sessions.logoutAll('not-a-real-session').status, 401);
});
