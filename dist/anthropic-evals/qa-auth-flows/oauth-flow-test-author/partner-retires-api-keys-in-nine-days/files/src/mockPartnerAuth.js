'use strict';

const crypto = require('node:crypto');

// Reconstruction of Northwind's token endpoint and ledger API, 18 October capture.
const CLIENTS = {
  'billing-sync': { secret: 'cs_7f2a9e4b1d', granted: ['ledger:read'] },
};

const SERVICE_ACCOUNTS = {
  'svc-reporting': { password: 'Autumn2026!partner', granted: ['ledger:read'] },
};

function parseBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  const raw = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const sep = raw.indexOf(':');
  if (sep < 0) return null;
  return { id: raw.slice(0, sep), secret: raw.slice(sep + 1) };
}

function createPartnerAuth() {
  const live = new Map();

  function issue(granted) {
    const accessToken = `at_${crypto.randomBytes(8).toString('hex')}`;
    live.set(accessToken, granted);
    return {
      status: 200,
      body: {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        scope: granted.join(' '),
        refresh_token: `rt_${crypto.randomBytes(8).toString('hex')}`,
      },
    };
  }

  function token({ form = {}, headers = {} } = {}) {
    if (form.grant_type === 'client_credentials') {
      const creds = parseBasic(headers.authorization || headers.Authorization);
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
      const asked = String(form.scope || '').split(' ').filter(Boolean);
      const granted = (asked.length ? asked : client.granted).filter((s) => client.granted.includes(s));
      return issue(granted);
    }

    if (form.grant_type === 'password') {
      const account = SERVICE_ACCOUNTS[form.username];
      if (!account || account.password !== form.password) {
        return { status: 400, body: { error: 'invalid_grant' } };
      }
      return issue(account.granted);
    }

    return { status: 400, body: { error: 'unsupported_grant_type' } };
  }

  function ledger({ path = '/ledger', method = 'GET', accessToken } = {}) {
    const granted = live.get(accessToken);
    if (!granted) return { status: 401, body: { error: 'invalid_token' } };
    const needed = method === 'GET' ? 'ledger:read' : 'invoices:write';
    if (!granted.includes(needed)) {
      return { status: 403, body: { error: 'insufficient_scope', scope: needed } };
    }
    return { status: 200, body: { path, method, ok: true } };
  }

  return { token, ledger };
}

module.exports = { createPartnerAuth };
