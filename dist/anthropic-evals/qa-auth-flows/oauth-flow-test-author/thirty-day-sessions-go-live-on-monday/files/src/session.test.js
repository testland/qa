'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIdp } = require('./mockIdp');
const { createSession, signIn } = require('./session');

const CLIENT_ID = 'portal-spa';

test('signing in yields an access token and a refresh token', () => {
  const session = signIn({ idp: createIdp({ clientId: CLIENT_ID }), clientId: CLIENT_ID, code: 'valid-code' });
  assert.ok(session.accessToken());
  assert.ok(session.refreshToken());
});

test('a refresh replaces the access token', () => {
  const session = signIn({ idp: createIdp({ clientId: CLIENT_ID }), clientId: CLIENT_ID, code: 'valid-code' });
  const before = session.accessToken();
  const response = session.refresh();
  assert.equal(response.status, 200);
  assert.notEqual(session.accessToken(), before);
});

test('the session survives several refreshes in a row', () => {
  const session = signIn({ idp: createIdp({ clientId: CLIENT_ID }), clientId: CLIENT_ID, code: 'valid-code' });
  for (let i = 0; i < 5; i += 1) {
    assert.equal(session.refresh().status, 200);
  }
  assert.ok(session.accessToken());
});

test('a refresh token the server never issued is refused', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const session = createSession({
    idp,
    clientId: CLIENT_ID,
    tokens: { access_token: 'at_stale', refresh_token: 'rt_made_up' },
  });
  const response = session.refresh();
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'invalid_grant');
});
