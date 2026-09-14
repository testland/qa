'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIdp } = require('./mockIdp');
const { startLogin, completeLogin, parseCallback } = require('./authFlow');

const CLIENT_ID = 'acme-web';
const REDIRECT_URI = 'https://app.acme.io/auth/callback';

function startFlow(idp) {
  const started = startLogin({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI, scope: 'openid profile' });
  const redirect = idp.authorize(started.params);
  return { started, redirect };
}

test('authorization code exchange returns a bearer token', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const { started, redirect } = startFlow(idp);
  const callback = parseCallback(redirect.location);
  assert.equal(callback.state, started.state);
  const exchanged = completeLogin({ idp, clientId: CLIENT_ID, redirectUri: REDIRECT_URI, code: callback.code });
  assert.equal(exchanged.status, 200);
  assert.equal(exchanged.body.token_type, 'Bearer');
});

test('a code the server never issued is refused', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const exchanged = completeLogin({ idp, clientId: CLIENT_ID, redirectUri: REDIRECT_URI, code: 'not-a-code' });
  assert.equal(exchanged.status, 400);
  assert.equal(exchanged.body.error, 'invalid_grant');
});

test('two tabs can each start a login and the first one still completes', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const tabOne = startFlow(idp);
  startFlow(idp);
  const callback = parseCallback(tabOne.redirect.location);
  const exchanged = completeLogin({ idp, clientId: CLIENT_ID, redirectUri: REDIRECT_URI, code: callback.code });
  assert.equal(exchanged.status, 200);
});
