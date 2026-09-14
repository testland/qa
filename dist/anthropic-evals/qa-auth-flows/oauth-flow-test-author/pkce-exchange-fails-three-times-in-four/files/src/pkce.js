'use strict';

const crypto = require('node:crypto');

function createVerifier() {
  return crypto.randomBytes(48).toString('base64url');
}

function challengeFor(verifier) {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64').replace(/=+$/, '');
}

function authorizeParams({ clientId, redirectUri, scope, verifier }) {
  return {
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope,
    state: crypto.randomBytes(16).toString('base64url'),
    code_challenge: challengeFor(verifier),
    code_challenge_method: 'S256',
  };
}

function tokenRequestForm({ code, redirectUri, clientId, verifier }) {
  return {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  };
}

module.exports = { createVerifier, challengeFor, authorizeParams, tokenRequestForm };
