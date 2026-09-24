# A two-day-old token still opens /orders, and all five auth tests are green

## Problem Description

On Thursday a support engineer replayed a customer request out of a HAR file she
had saved on Tuesday, to reproduce a pricing complaint. It went through.
`GET /orders` answered 200 with the customer's orders. The bearer token in that
HAR was issued Tuesday afternoon with a five-minute lifetime, so it had been dead
for about two days by the time she sent it again.

`requireAuth` is the only thing in front of that route. It asks our self-hosted
single-sign-on server about the token before letting the request through, and it
refuses the request when the server says the token is not active. I can read that
check in `src/require-auth.js` and on the face of it it is correct. There are five
tests over that file and all five are green.

The gateway access log for the replay is attached, along with the counters the
platform team pulled for me off the last 180 days. I do not know what to make of
them yet and I would rather you looked before I start guessing.

@nbowen on the SRE side has two things he wants held to, and he has earned the
right to ask:

- In March the SSO box was gone for forty minutes and `/orders` went with it,
  through no fault of ours. He wrote the change that stopped that happening again
  and he does not want it taken back out. His line on it is "our availability must
  not be a function of theirs — if you undo that you are choosing to hand them our
  uptime." He is not wrong about the March incident; I was on that call too.
- He also wants the call out to the SSO server to carry a timeout, because a hung
  SSO would otherwise pile requests up on us until we fall over. Nobody has done
  that yet.

We run the SSO server ourselves, in Docker, everywhere including on developer
laptops. The orders API is registered on it as a confidential client.

What I want out of this is not a patch that makes this one token bounce. I want to
understand why five green tests did not see it, and I do not believe the in-process
stand-in in `test/require-auth.test.js` can tell us anything reliable about what
the real server does — that stand-in is the reason we shipped this.

## Output Specification

1. Fix `src/require-auth.js`. Keep the `(headers, opts)` signature and the
   `{ status, body }` return shape — the route handlers destructure both.
2. Leave `npm test` green, and make it go red if the replayed request is ever
   reintroduced.
3. Add coverage under `test/integration/` that runs against a real SSO server the
   suite brings up itself, with a realm fixture, rather than against anything
   written in-process. Say how it runs in CI.
4. Write `docs/auth-decision.md`: what you changed about the existing tests and
   why, and your answer to each of @nbowen's two points.

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

=============== FILE: src/outbound.js ===============
'use strict';

const { config } = require('./config.js');

// Service-to-service token for the calls /orders makes into billing.
async function serviceToken() {
  if (!config.clientSecret) {
    throw new Error('SSO_CLIENT_SECRET is not set');
  }
  const res = await fetch(
    config.idpBaseUrl + '/realms/' + config.realm + '/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    },
  );
  if (res.status !== 200) {
    throw new Error('service token request failed: ' + res.status);
  }
  return (await res.json()).access_token;
}

module.exports = { serviceToken };

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

function unsignedToken(payload) {
  const seg = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return seg({ alg: 'RS256', typ: 'JWT' }) + '.' + seg(payload) + '.' + 'c2lnbmF0dXJl';
}

test('a bearer token is accepted', async (t) => {
  const idp = await startFakeIdp();
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer good-token' }, opts(idp.url));
  assert.equal(out.status, 200);
  assert.equal(out.body.user, 'ada');
});

test('a token the server says is not active is refused', async (t) => {
  const idp = await startFakeIdp({ active: false });
  t.after(() => idp.server.close());

  const out = await requireAuth({ authorization: 'Bearer stale-token' }, opts(idp.url));
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'token_inactive');
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

// SSO-2026-03. Nothing about orders should depend on the SSO box being up.
test('the API keeps serving while the SSO server is unreachable', async () => {
  const token = unsignedToken({ preferred_username: 'ada', aud: 'orders-api', exp: 4102444800 });

  const out = await requireAuth(
    { authorization: 'Bearer ' + token },
    opts('http://127.0.0.1:1'),
  );
  assert.equal(out.status, 200);
  assert.equal(out.body.user, 'ada');
});

=============== FILE: reports/gateway-access.log ===============
# egress + ingress, request id 7f13c2, 2026-09-11 (Thursday)
# columns: time, direction, method, path, status, response bytes, peer

14:02:41.118  out  POST  /realms/corp/protocol/openid-connect/token/introspect  401   118  sso.corp.internal
14:02:41.122  in   GET   /orders                                                200  4113  orders-api

# The replayed bearer decodes to:
#   iss  https://sso.corp.internal/realms/corp
#   sub  9f2a1c04-8e33-4f61-bb0e-5d7c2a119e40
#   azp  corp-portal
#   iat  2026-09-09T16:26:02Z
#   exp  2026-09-09T16:31:02Z
#
# @mreid: the proxy keeps response sizes, not bodies, so I cannot tell you what
# the SSO server actually said back. Only that it did not say 200.

=============== FILE: reports/auth-counters.md ===============
# orders-api auth counters, 180 days (2026-03-15 to 2026-09-11)

Pulled by @kpatel off the platform dashboard. These are emitted by
`src/require-auth.js` on each branch it takes.

| counter                  | total      |
|--------------------------|------------|
| auth.request             | 41,208,714 |
| auth.missing_token       |     92,331 |
| auth.introspection.ok    |          0 |
| auth.token_inactive      |          0 |
| auth.degraded            | 41,116,383 |

SSO server availability over the same window, from the platform team's own
dashboard: 100%. The last recorded unavailability of that server was the
2026-03-14 outage, which is outside this window.

=============== FILE: docs/orders-api-auth.md ===============
# orders-api - how a request is authorised

The gateway terminates TLS and forwards the caller's `Authorization` header
untouched. `requireAuth` is called before any route handler runs and its result
decides whether the handler is entered at all.

| | |
|---|---|
| SSO server | self-hosted, one container per environment, same image everywhere |
| This service is registered as | confidential client `orders-api` in realm `corp` |
| Its client secret | `SSO_CLIENT_SECRET`, set from the platform secret store in every environment, including local dev via `.env` |
| Who else is in that realm | `corp-portal` (the web UI), `svc-reports`, `mobile-app` |
| Token lifetime | realm default, 300 seconds |
| Suite | `npm test`, no dependencies outside Node |

Open since March: we have never run any of this against a real server. The
stand-in in `test/require-auth.test.js` was written in an afternoon so the
middleware could be unit tested, and it is still the only thing the suite talks
to.
