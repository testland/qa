'use strict';

const crypto = require('node:crypto');

function randomState() {
  return crypto.randomBytes(16).toString('base64url');
}

function startLogin({ clientId, redirectUri, scope }) {
  const state = randomState();
  return {
    state,
    params: {
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope,
      state,
    },
  };
}

function completeLogin({ idp, clientId, redirectUri, code }) {
  return idp.token({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
  });
}

function parseCallback(location) {
  const url = new URL(location);
  return {
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
  };
}

module.exports = { startLogin, completeLogin, parseCallback, randomState };
