'use strict';

const crypto = require('node:crypto');

// LOG-221: the audit pipeline rejects '-' and '_' in indexed fields.
function createVerifier() {
  return crypto.randomBytes(32).toString('base64url').replace(/[-_]/g, '');
}

function challengeFor(verifier) {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
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

function tokenRequestForm({ code, redirectUri, clientId, clientSecret, verifier }) {
  return {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: verifier,
  };
}

module.exports = { createVerifier, challengeFor, authorizeParams, tokenRequestForm };
