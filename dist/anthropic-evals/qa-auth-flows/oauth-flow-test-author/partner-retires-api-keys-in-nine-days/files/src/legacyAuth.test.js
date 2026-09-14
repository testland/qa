'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLegacyServiceAccountClient } = require('./legacyAuth');
const { createPartnerAuth } = require('./mockPartnerAuth');

function client(overrides = {}) {
  return createLegacyServiceAccountClient({
    authServer: createPartnerAuth(),
    username: 'svc-billing',
    password: 'Autumn2026!partner',
    ...overrides,
  });
}

test('the service account gets a bearer token', () => {
  const response = client().fetch();
  assert.equal(response.status, 200);
  assert.equal(response.body.token_type, 'Bearer');
  assert.ok(response.body.access_token);
});

test('a wrong service-account password is refused', () => {
  const response = client({ password: 'nope' }).fetch();
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'invalid_grant');
});
