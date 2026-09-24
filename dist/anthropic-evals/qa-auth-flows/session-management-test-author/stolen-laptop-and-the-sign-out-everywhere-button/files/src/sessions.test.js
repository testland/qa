'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessions } = require('./sessions');

test('signing in gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.request(sid), 200);
});

test('the desktop launcher gives a working session', () => {
  const sessions = createSessions();
  const sid = sessions.loginSso('r.adeyemi', 'laptop-7');
  assert.equal(sessions.request(sid), 200);
});

test('an unknown session id is refused', () => {
  const sessions = createSessions();
  assert.equal(sessions.request('not-a-real-session'), 401);
});

test('signing out clears the session cookie', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  const res = sessions.logout(sid);
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /Max-Age=0/);
});

test('sign out everywhere is refused for an unknown session', () => {
  const sessions = createSessions();
  assert.equal(sessions.logoutAll('not-a-real-session').status, 401);
});

test('sign out everywhere ends the session it was pressed on', () => {
  const sessions = createSessions();
  const sid = sessions.login('r.adeyemi', 'pixel-r');
  assert.equal(sessions.logoutAll(sid).status, 200);
  assert.equal(sessions.request(sid), 401);
});

test('sign out everywhere ends the agent second device too', () => {
  const sessions = createSessions();
  const phone = sessions.login('r.adeyemi', 'pixel-r');
  const desk = sessions.login('r.adeyemi', 'desk-12');
  sessions.logoutAll(phone);
  assert.equal(sessions.request(desk), 401);
});
