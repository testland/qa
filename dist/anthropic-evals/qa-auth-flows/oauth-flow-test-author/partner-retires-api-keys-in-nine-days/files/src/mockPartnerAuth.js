'use strict';

const crypto = require('node:crypto');

// Reconstruction of Northwind's /oauth/token from the 16 October capture.
const CLIENTS = {
  'billing-sync': { secret: 'cs_7f2a9e4b1d', scopes: ['ledger:read', 'invoices:write'] },
};

const SERVICE_ACCOUNTS = {
  'svc-billing': 'Autumn2026!partner',
};

function parseBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  const raw = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = raw.indexOf(':');
  if (sep < 0) return null;
  return { id: raw.slice(0, sep), secret: raw.slice(sep + 1) };
}

function createPartnerAuth() {
  function token({ form = {}, headers = {} } = {}) {
    const creds = parseBasic(headers.authorization || headers.Authorization);

    if (form.grant_type === 'client_credentials') {
      if (!creds) {
        return {
          status: 401,
          body: { error: 'invalid_client', error_description: 'client_secret_basic required' },
        };
      }
      const client = CLIENTS[creds.id];
      if (!client || client.secret !== creds.secret) {
        return { status: 401, body: { error: 'invalid_client' } };
      }
      const requested = String(form.scope || '').split(' ').filter(Boolean);
      if (requested.some((s) => !client.scopes.includes(s))) {
        return { status: 400, body: { error: 'invalid_scope' } };
      }
      return {
        status: 200,
        body: {
          access_token: `at_${crypto.randomBytes(8).toString('hex')}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: requested.join(' ') || client.scopes.join(' '),
          refresh_token: `rt_${crypto.randomBytes(8).toString('hex')}`,
        },
      };
    }

    if (form.grant_type === 'password') {
      if (SERVICE_ACCOUNTS[form.username] !== form.password) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
      return {
        status: 200,
        body: {
          access_token: `at_${crypto.randomBytes(8).toString('hex')}`,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'ledger:read invoices:write',
          refresh_token: `rt_${crypto.randomBytes(8).toString('hex')}`,
        },
      };
    }

    return { status: 400, body: { error: 'unsupported_grant_type' } };
  }

  return { token };
}

module.exports = { createPartnerAuth };
