'use strict';

const crypto = require('node:crypto');

// Stands in for the release-candidate IdP's authorize + token endpoints.
function createMockIdp({ clientId, redirectUri }) {
  const pending = new Map();

  function authorize(params) {
    if (params.client_id !== clientId) {
      return { status: 400, body: { error: 'unauthorized_client' } };
    }
    if (params.redirect_uri !== redirectUri) {
      return { status: 400, body: { error: 'invalid_request' } };
    }
    const code = crypto.randomBytes(12).toString('hex');
    pending.set(code, {
      challenge: params.code_challenge,
      method: params.code_challenge_method || 'plain',
    });
    return {
      status: 302,
      location: `${params.redirect_uri}?code=${code}&state=${encodeURIComponent(params.state || '')}`,
    };
  }

  function token(form) {
    if (form.grant_type !== 'authorization_code') {
      return { status: 400, body: { error: 'unsupported_grant_type' } };
    }
    const record = pending.get(form.code);
    if (!record) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }
    pending.delete(form.code);

    let proven = false;
    if (record.method === 'plain') {
      proven = record.challenge === String(form.code_verifier);
    } else if (record.method === 'S256') {
      const expected = crypto
        .createHash('sha256')
        .update(String(form.code_verifier), 'ascii')
        .digest('base64url');
      proven = record.challenge === expected;
    }
    if (!proven) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }

    return {
      status: 200,
      body: {
        access_token: `at_${crypto.randomBytes(8).toString('hex')}`,
        token_type: 'Bearer',
        expires_in: 900,
      },
    };
  }

  return { authorize, token };
}

module.exports = { createMockIdp };
