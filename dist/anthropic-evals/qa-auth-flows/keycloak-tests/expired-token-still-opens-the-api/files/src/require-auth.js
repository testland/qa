'use strict';

function introspectPath(realm) {
  return '/realms/' + realm + '/protocol/openid-connect/token/introspect';
}

async function requireAuth(headers, opts) {
  const raw = headers.authorization || headers.Authorization;
  if (!raw || !raw.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'missing_token' } };
  }
  const token = raw.slice('Bearer '.length);

  const res = await fetch(opts.idpBaseUrl + introspectPath(opts.realm), {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: 'Bearer ' + token,
    },
    body: new URLSearchParams({ token }).toString(),
  });

  if (res.status !== 200) {
    return { status: 401, body: { error: 'introspection_failed' } };
  }

  const claims = await res.json();
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp <= now) {
    return { status: 401, body: { error: 'token_expired' } };
  }

  return { status: 200, body: { user: claims.preferred_username } };
}

module.exports = { requireAuth };
