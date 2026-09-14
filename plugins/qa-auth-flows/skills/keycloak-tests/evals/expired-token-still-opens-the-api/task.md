# A two-day-old token still opens /orders, and the test called "an expired token is refused" is green

## Problem Description

On Thursday a support engineer replayed a customer request out of a HAR file she
had saved on Tuesday, to reproduce a pricing complaint. It went through.
`GET /orders` answered 200 with the customer's orders. The bearer token in that
HAR was issued Tuesday afternoon with a five-minute lifetime, so it had been dead
for about two days by the time she sent it again.

`requireAuth` is the only thing in front of that route. It asks our self-hosted
single-sign-on server about the token before letting the request through.

Here is the part I cannot square. That file has four tests. They are all green.
One of them is literally called `an expired token is refused`, and it has been
green since March. There is an expiry check in `require-auth.js` — I can read it,
it is right there, and on the face of it, it is correct. Yet the replayed request
was admitted.

The gateway access log for the replay is attached. The call out to the SSO server
came back 200, four milliseconds before `/orders` came back 200. The token's own
`exp` decodes to Tuesday 16:31 UTC, so the server was being asked about a token
it had every reason to know was finished.

We run that SSO server ourselves, in Docker, everywhere including on developer
laptops. The orders API is registered on it as a confidential client.

What I want out of this is not a patch that makes this one token bounce. I want
to understand why four green tests did not see it, I want the suite to go red if
anyone puts it back, and I do not believe the in-process stand-in server in
`test/require-auth.test.js` can tell us anything reliable about what the real one
does — that stand-in is the reason we shipped this.

## Output Specification

1. Fix `src/require-auth.js`. Keep the `(headers, opts)` signature and the
   `{ status, body }` return shape — the route handlers destructure both.
2. Make `npm test` go red if the replayed request is reintroduced. The three
   tests covering a missing or non-Bearer `Authorization` header must still pass
   with their intent intact.
3. Add coverage under `test/integration/` that runs against a real SSO server the
   suite brings up itself, with a realm fixture, rather than against anything
   written in-process. Say how it runs in CI.
4. Say what you changed about the existing tests and why.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "orders-api",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/config.js ===============
'use strict';

const config = {
  idpBaseUrl: process.env.SSO_BASE_URL || 'http://localhost:8080',
  realm: process.env.SSO_REALM || 'corp',
  clientId: process.env.SSO_CLIENT_ID || 'orders-api',
  clientSecret: process.env.SSO_CLIENT_SECRET || '',
};

module.exports = { config };

=============== FILE: src/require-auth.js ===============
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

=============== FILE: test/require-auth.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { requireAuth } = require('../src/require-auth.js');

// Stand-in for the SSO server. `answer` is what it replies with.
function startFakeIdp(answer) {
  const payload = answer || {
    active: true,
    preferred_username: 'ada',
    aud: 'orders-api',
    exp: 4102444800,
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, url: 'http://127.0.0.1:' + server.address().port });
    });
  });
}

function opts(url) {
  return { idpBaseUrl: url, realm: 'corp', clientId: 'orders-api', clientSecret: 'shhh' };
}

test('a bearer token is accepted', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer good-token' }, opts(idp.url));
  assert.equal(out.status, 200);
  assert.equal(out.body.user, 'ada');
});

test('an expired token is refused', async (t) => {
  const idp = await startFakeIdp({
    active: true,
    preferred_username: 'ada',
    aud: 'orders-api',
    exp: 1757435462,
  });
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer stale-token' }, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'token_expired');
});

test('a request with no Authorization header is refused', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({}, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'missing_token');
});

test('a non-Bearer Authorization header is refused', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Basic YWRhOnMzY3JldA==' }, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'missing_token');
});

=============== FILE: reports/gateway-access.log ===============
# egress + ingress, request id 7f13c2, 2026-09-11 (Thursday)
# columns: time, direction, method, path, status, response bytes, peer

14:02:41.118  out  POST  /realms/corp/protocol/openid-connect/token/introspect  200    16  sso.corp.internal
14:02:41.122  in   GET   /orders                                                200  4113  orders-api

# The replayed bearer decodes to:
#   iss  https://sso.corp.internal/realms/corp
#   sub  9f2a1c04-8e33-4f61-bb0e-5d7c2a119e40
#   azp  corp-portal
#   iat  2026-09-09T16:26:02Z
#   exp  2026-09-09T16:31:02Z
#
# @mreid: the proxy does not keep response bodies, only sizes. 16 bytes is not a
# token and not a set of claims. Whatever the server said, it was short.

=============== FILE: docs/orders-api-auth.md ===============
# orders-api - how a request is authorised

The gateway terminates TLS and forwards the caller's `Authorization` header
untouched. `requireAuth` is called before any route handler runs and its result
decides whether the handler is entered at all.

| | |
|---|---|
| SSO server | self-hosted, one container per environment, same image everywhere |
| This service is registered as | confidential client `orders-api` in realm `corp` |
| Who else is in that realm | `corp-portal` (the web UI), `svc-reports`, `mobile-app` |
| Token lifetime | realm default, 300 seconds |
| Suite | `npm test`, no dependencies outside Node |

Open since March: we have never run any of this against a real server. The
stand-in in `test/require-auth.test.js` was written in an afternoon so the
middleware could be unit tested, and it is still the only thing the suite talks
to.
