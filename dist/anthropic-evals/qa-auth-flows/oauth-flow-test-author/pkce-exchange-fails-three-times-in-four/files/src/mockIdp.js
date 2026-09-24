'use strict';

const crypto = require('node:crypto');

const VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;

// Stands in for the release-candidate provider's authorize + token endpoints.
function createMockIdp({ clientId, clientSecret, redirectUri }) {
  const pending = new Map();

  function authorize(params = {}) {
    if (params.client_id !== clientId) {
      return { status: 400, body: { error: 'unauthorized_client' } };
    }
    if (params.redirect_uri !== redirectUri) {
      return { status: 400, body: { error: 'invalid_request' } };
    }
    if (params.code_challenge && params.code_challenge_method !== 'S256') {
      return { status: 400, body: { error: 'invalid_request', error_description: 'S256 only' } };
    }
    const code = crypto.randomBytes(12).toString('hex');
    pending.set(code, { challenge: params.code_challenge || null });
    return {
      status: 302,
      location: `${params.redirect_uri}?code=${code}&state=${encodeURIComponent(params.state || '')}`,
    };
  }

  function readClientAuth(form, headers) {
    const header = headers.authorization || headers.Authorization;
    if (header && header.startsWith('Basic ')) {
      const raw = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const sep = raw.indexOf(':');
      if (sep < 0) return null;
      return { id: raw.slice(0, sep), secret: raw.slice(sep + 1) };
    }
    if (form.client_id && form.client_secret) {
      return { id: form.client_id, secret: form.client_secret };
    }
    return null;
  }

  function token(form = {}, headers = {}) {
    if (form.grant_type !== 'authorization_code') {
      return { status: 400, body: { error: 'unsupported_grant_type' } };
    }
    const creds = readClientAuth(form, headers);
    if (!creds || creds.id !== clientId || creds.secret !== clientSecret) {
      return { status: 401, body: { error: 'invalid_client' } };
    }
    const record = pending.get(form.code);
    if (!record) {
      return { status: 400, body: { error: 'invalid_grant' } };
    }
    pending.delete(form.code);
    if (record.challenge) {
      const verifier = String(form.code_verifier || '');
      if (!VERIFIER.test(verifier)) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
      const expected = crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url');
      if (record.challenge !== expected) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
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
