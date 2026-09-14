'use strict';

const crypto = require('node:crypto');
const { isRegistered } = require('./redirects');

function createIdp({ clientId }) {
  const pending = new Map();

  function authorize(params = {}) {
    if (params.client_id !== clientId) {
      return { status: 400, body: { error: 'unauthorized_client' } };
    }
    if (!isRegistered(params.redirect_uri)) {
      return { status: 400, body: { error: 'invalid_request' } };
    }
    const code = crypto.randomBytes(10).toString('hex');
    pending.set(code, {
      redirectUri: params.redirect_uri,
      challenge: params.code_challenge || null,
      method: params.code_challenge_method || null,
    });
    const location = new URL(params.redirect_uri);
    location.searchParams.set('code', code);
    location.searchParams.set('state', params.state || '');
    return { status: 302, location: location.toString() };
  }

  function token(form = {}) {
    if (form.grant_type !== 'authorization_code') {
      return { status: 400, body: { error: 'unsupported_grant_type' } };
    }
    const record = pending.get(form.code);
    if (!record) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }
    pending.delete(form.code);
    if (record.challenge) {
      const expected = crypto
        .createHash('sha256')
        .update(String(form.code_verifier), 'ascii')
        .digest('base64url');
      if (record.method !== 'S256' || record.challenge !== expected) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
    }
    return {
      status: 200,
      body: {
        access_token: `at_${crypto.randomBytes(8).toString('hex')}`,
        token_type: 'Bearer',
        expires_in: 600,
      },
    };
  }

  return { authorize, token };
}

module.exports = { createIdp };
