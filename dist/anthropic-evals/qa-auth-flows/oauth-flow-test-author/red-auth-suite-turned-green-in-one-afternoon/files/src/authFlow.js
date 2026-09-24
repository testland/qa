'use strict';

const crypto = require('node:crypto');
const { createVerifier, challengeFor } = require('./pkce');

function randomState() {
  return crypto.randomBytes(16).toString('base64url');
}

function startLogin({ clientId, redirectUri, scope }) {
  const state = randomState();
  const verifier = createVerifier();
  return {
    state,
    verifier,
    params: {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: challengeFor(verifier),
      code_challenge_method: 'S256',
    },
  };
}

function parseCallback(location) {
  const url = new URL(location);
  return {
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
  };
}

function finishLogin({ idp, started, callback, clientId, redirectUri }) {
  if (callback.state !== started.state) {
    throw new Error('state_mismatch');
  }
  return idp.token({
    grant_type: 'authorization_code',
    code: callback.code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: started.verifier,
  });
}

module.exports = { startLogin, finishLogin, parseCallback, randomState };
