'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSessions } = require('./sessions');
const { createClock, MINUTE } = require('./clock');
const config = require('../config/session.json');

function setup() {
  const clock = createClock(Date.parse('2026-09-07T09:00:00Z'));
  return { clock, sessions: createSessions({ clock, config }) };
}

test('a signed-in clinician can open a record', () => {
  const { sessions } = setup();
  const sid = sessions.login('dr.okafor');
  assert.equal(sessions.request(sid), 200);
});

test('an unknown session id is refused', () => {
  const { sessions } = setup();
  assert.equal(sessions.request('not-a-real-session'), 401);
});

test('five minutes of quiet does not end the session', () => {
  const { clock, sessions } = setup();
  const sid = sessions.login('dr.okafor');
  clock.tick(5 * MINUTE);
  assert.equal(sessions.request(sid), 200);
});

test('thirty-one minutes of quiet ends the session', () => {
  const { clock, sessions } = setup();
  const sid = sessions.login('dr.okafor');
  clock.tick(31 * MINUTE);
  assert.equal(sessions.request(sid), 401);
});

test('the session cookie expires after eight hours', () => {
  const { sessions } = setup();
  const sid = sessions.login('dr.okafor');
  assert.match(sessions.cookieFor(sid), /Max-Age=28800/);
});

test('signing out ends the session immediately', () => {
  const { sessions } = setup();
  const sid = sessions.login('dr.okafor');
  sessions.logout(sid);
  assert.equal(sessions.request(sid), 401);
});
