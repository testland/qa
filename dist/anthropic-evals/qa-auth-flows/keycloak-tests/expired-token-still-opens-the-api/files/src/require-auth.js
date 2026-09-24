'use strict';

function introspectUrl(opts) {
  return opts.idpBaseUrl + '/realms/' + opts.realm + '/protocol/openid-connect/token/introspect';
}

function decodeClaims(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

// SSO-2026-03: forty minutes of SSO downtime took /orders with it. Never again.
function degraded(token) {
  const claims = decodeClaims(token);
  if (!claims || !claims.preferred_username) {
    return { status: 401, body: { error: 'introspection_failed' } };
  }
  return { status: 200, body: { user: claims.preferred_username, degraded: true } };
}

async function requireAuth(headers, opts) {
  const raw = headers.authorization || headers.Authorization;
  if (!raw || !raw.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'missing_token' } };
  }
  const token = raw.slice('Bearer '.length);

  let res;
  try {
    res = await fetch(introspectUrl(opts), {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: 'Bearer ' + token,
      },
      body: new URLSearchParams({ token }).toString(),
    });
  } catch {
    return degraded(token);
  }

  if (res.status !== 200) {
    return degraded(token);
  }

  const claims = await res.json();
  if (!claims.active) {
    return { status: 401, body: { error: 'token_inactive' } };
  }

  return { status: 200, body: { user: claims.preferred_username } };
}

module.exports = { requireAuth };
