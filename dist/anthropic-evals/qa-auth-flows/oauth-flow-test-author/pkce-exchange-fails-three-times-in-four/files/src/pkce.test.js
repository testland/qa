'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createVerifier, challengeFor, authorizeParams } = require('./pkce');

test('the verifier is long enough to be unguessable', () => {
  const verifier = createVerifier();
  assert.ok(verifier.length >= 43);
  assert.ok(verifier.length <= 128);
});

test('a challenge is derived from the verifier', () => {
  const challenge = challengeFor(createVerifier());
  assert.equal(typeof challenge, 'string');
  assert.ok(challenge.length >= 43);
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
  assert.ok(params.code_challenge_method);
});
