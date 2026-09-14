'use strict';

const crypto = require('node:crypto');

// Generated from the portal realm export by scripts/export-realm.mjs.
// Do not hand-edit; regenerate from the realm instead.
function createIdp({ clientId }) {
  const grants = new Map();
  let seq = 0;

  function newAccessToken() {
    seq += 1;
    return `at_${seq}_${crypto.randomBytes(6).toString('hex')}`;
  }

  function issueGrant(subject) {
    const refresh = `rt_${subject}_${crypto.randomBytes(6).toString('hex')}`;
    grants.set(refresh, { subject, issuedAt: Date.now() });
    return {
      access_token: newAccessToken(),
      token_type: 'Bearer',
      expires_in: 300,
      refresh_token: refresh,
    };
  }

  function token(form = {}) {
    if (form.client_id !== clientId) {
      return { status: 401, body: { error: 'invalid_client' } };
    }

    if (form.grant_type === 'authorization_code') {
      if (form.code !== 'valid-code') {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
      return { status: 200, body: issueGrant('u_2291') };
    }

    if (form.grant_type === 'refresh_token') {
      const grant = grants.get(form.refresh_token);
      if (!grant) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
      return {
        status: 200,
        body: {
          access_token: newAccessToken(),
          token_type: 'Bearer',
          expires_in: 300,
          refresh_token: form.refresh_token,
        },
      };
    }

    return { status: 400, body: { error: 'unsupported_grant_type' } };
  }

  return { token };
}

module.exports = { createIdp };
