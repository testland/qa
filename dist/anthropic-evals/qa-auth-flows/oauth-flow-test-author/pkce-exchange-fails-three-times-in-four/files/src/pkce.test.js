'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifier, challengeFor, authorizeParams } = require('./pkce');

test('the verifier is inside the length the provider accepts', () => {
  assert.ok(createVerifier().length <= 128);
});

test('the verifier carries no character the audit pipeline rejects', () => {
  assert.match(createVerifier(), /^[A-Za-z0-9]+$/);
});

test('the same verifier always gives the same challenge', () => {
  const verifier = createVerifier();
  assert.equal(challengeFor(verifier), challengeFor(verifier));
});

test('the authorize request carries a challenge and a method', () => {
  const params = authorizeParams({
    clientId: 'checkout-web',
    redirectUri: 'https://checkout.example.com/auth/callback',
    scope: 'openid profile',
    verifier: createVerifier(),
  });
  assert.equal(params.response_type, 'code');
  assert.ok(params.code_challenge);
  assert.equal(params.code_challenge_method, 'S256');
});
