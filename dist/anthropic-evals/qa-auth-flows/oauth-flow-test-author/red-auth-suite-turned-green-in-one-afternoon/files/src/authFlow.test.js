'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createIdp } = require('./mockIdp');
const { startLogin, finishLogin, parseCallback } = require('./authFlow');

const CLIENT_ID = 'acme-web';
const REDIRECT_URI = 'https://app.acme.io/auth/callback';

function startFlow(idp, overrides = {}) {
  const started = startLogin({
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scope: 'openid profile',
    ...overrides,
  });
  const redirect = idp.authorize(started.params);
  return { started, redirect };
}

test('the authorization code exchange returns a bearer token', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const { started, redirect } = startFlow(idp);
  const callback = parseCallback(redirect.location);
  assert.equal(callback.state, started.state);
  const exchanged = finishLogin({ idp, started, callback, clientId: CLIENT_ID, redirectUri: REDIRECT_URI });
  assert.equal(exchanged.status, 200);
  assert.equal(exchanged.body.token_type, 'Bearer');
});

test('a code the server never issued is refused', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const { started } = startFlow(idp);
  const exchanged = finishLogin({
    idp,
    started,
    callback: { code: 'not-a-code', state: started.state },
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
  });
  assert.equal(exchanged.status, 400);
  assert.equal(exchanged.body.error, 'invalid_grant');
});

test("a callback carrying another login's state is refused", () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const mine = startFlow(idp);
  const other = startFlow(idp);
  assert.throws(() =>
    finishLogin({
      idp,
      started: mine.started,
      callback: other.callback,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
    }),
  );
});

test('an exchange that cannot prove the verifier is refused', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const mine = startFlow(idp);
  assert.throws(() =>
    finishLogin({
      idp,
      started: { ...mine.started, verifier: 'not-the-verifier' },
      callback: mine.callback,
      clientId: CLIENT_ID,
      redirectUri: REDIRECT_URI,
    }),
  );
});

test('two tabs can each start a login and the first one still completes', () => {
  const idp = createIdp({ clientId: CLIENT_ID });
  const tabOne = startFlow(idp);
  startFlow(idp);
  const callback = parseCallback(tabOne.redirect.location);
  const exchanged = finishLogin({
    idp,
    started: tabOne.started,
    callback,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
  });
  assert.equal(exchanged.status, 200);
});
