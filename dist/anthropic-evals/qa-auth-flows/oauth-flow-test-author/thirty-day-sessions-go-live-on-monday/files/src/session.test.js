'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIdp } = require('./mockIdp');
const { createSession, signIn, createMemoryStorage, STORAGE_KEY } = require('./session');

const CLIENT_ID = 'portal-spa';

function signedIn() {
  const storage = createMemoryStorage();
  const session = signIn({
    idp: createIdp({ clientId: CLIENT_ID }),
    clientId: CLIENT_ID,
    code: 'valid-code',
    storage,
  });
  return { session, storage };
}

test('signing in yields an access token and a refresh token', () => {
  const { session } = signedIn();
  assert.ok(session.accessToken());
  assert.ok(session.refreshToken());
});

test('a refresh replaces the access token', () => {
  const { session } = signedIn();
  const before = session.accessToken();
  const response = session.refresh();
  assert.equal(response.status, 200);
  assert.notEqual(session.accessToken(), before);
});

test('a refresh hands back a different refresh token', () => {
  const { session } = signedIn();
  const before = session.refreshToken();
  session.refresh();
  assert.notEqual(session.refreshToken(), before);
});

test('the session survives several refreshes in a row', () => {
  const { session } = signedIn();
  for (let i = 0; i < 5; i += 1) {
    assert.equal(session.refresh().status, 200);
  }
  assert.ok(session.accessToken());
});

test('a refresh token the server never issued is refused', () => {
  const storage = createMemoryStorage();
  const session = createSession({
    idp: createIdp({ clientId: CLIENT_ID }),
    clientId: CLIENT_ID,
    tokens: { access_token: 'at_stale', refresh_token: 'rt_made_up' },
    storage,
  });
  const response = session.refresh();
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'invalid_grant');
});

test('signing out clears the stored session', () => {
  const { session, storage } = signedIn();
  assert.ok(storage.get(STORAGE_KEY));
  session.signOut();
  assert.equal(storage.get(STORAGE_KEY), null);
});
