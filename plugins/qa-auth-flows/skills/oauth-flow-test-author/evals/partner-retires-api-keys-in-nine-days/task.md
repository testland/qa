# Northwind turns off API keys on the 31st and our replacement is untested

## Problem Description

`billing-sync` runs from cron at 02:15. It pulls the ledger from Northwind's
partner API and pushes invoices back, and it has authenticated with a static
API key since 2023. Northwind retire API keys on 31 October — nine days — and
every partner has to move to their token endpoint.

Two things are already in the repo. `src/legacyAuth.js` is the service-account
helper we wrote for the *old* Northwind integration in 2021; it is in
production today, it has tests, and they are green. `src/partnerToken.js` is
what Marcus started on Tuesday before he went on leave; nobody has run it
against anything and he says he never got a token out of it.

Marcus left three suggestions on the ticket before he went:

1. *"Northwind's own guide says the service-account route is what most
   partners use, and we already have that working from the old integration. If
   you are short on time, point `legacyAuth` at the new host and be done."*
2. *"Leave the API key in the config as a fallback for the first week after the
   cutover, so if the token route misbehaves at 02:15 the job still runs."*
3. *"Whatever we end up calling, hold the token for its lifetime instead of
   fetching a fresh one per API call — we make a few hundred calls a night."*

Their integration guide and a stand-in for their token endpoint are attached.
The stand-in was built from a capture of their sandbox last Thursday and it is
the only thing we can test against; Northwind do not open the sandbox to us
until the 27th, which is too late to be useful.

Get the replacement authentication under test, tell me what `billing-sync`
ships with, and give me a yes or a no on each of Marcus's three.

## Output Specification

1. Write the tests for how `billing-sync` will obtain tokens after the
   cutover, under `src/`. Do not edit `src/mockPartnerAuth.js` — it is our
   reconstruction of their service and we do not control it. Do not edit
   `src/legacyAuth.js` or `src/legacyAuth.test.js`; the old integration is
   still live on them.
2. Repair whatever your tests show is broken in the code you are recommending
   we ship.
3. Run `npm test` and record what passed and what did not.
4. Write `docs/northwind-auth-decision.md`: what `billing-sync` ships with and
   why, and a yes or a no with a reason on each of Marcus's three suggestions.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "billing-sync",
  "version": "8.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/partnerToken.js ===============
'use strict';

// Started 20 October, not yet run against anything.
function createPartnerTokenClient({ authServer, clientId, clientSecret, scope }) {
  return {
    fetch() {
      return authServer.token({
        form: {
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope,
        },
        headers: {},
      });
    },
  };
}

module.exports = { createPartnerTokenClient };

=============== FILE: src/legacyAuth.js ===============
'use strict';

// Service-account helper from the 2021 Northwind integration. In production today.
function createLegacyServiceAccountClient({ authServer, username, password }) {
  return {
    fetch() {
      return authServer.token({
        form: {
          grant_type: 'password',
          username,
          password,
        },
        headers: {},
      });
    },
  };
}

module.exports = { createLegacyServiceAccountClient };

=============== FILE: src/mockPartnerAuth.js ===============
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

=============== FILE: src/legacyAuth.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createLegacyServiceAccountClient } = require('./legacyAuth');
const { createPartnerAuth } = require('./mockPartnerAuth');

function client(overrides = {}) {
  return createLegacyServiceAccountClient({
    authServer: createPartnerAuth(),
    username: 'svc-billing',
    password: 'Autumn2026!partner',
    ...overrides,
  });
}

test('the service account gets a bearer token', () => {
  const response = client().fetch();
  assert.equal(response.status, 200);
  assert.equal(response.body.token_type, 'Bearer');
  assert.ok(response.body.access_token);
});

test('a wrong service-account password is refused', () => {
  const response = client({ password: 'nope' }).fetch();
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'invalid_grant');
});

=============== FILE: docs/northwind-integration.md ===============
# Northwind Partner API — authenticating after the API-key retirement

API keys stop working **31 October**. Every partner must move to
`POST https://auth.northwind-partners.com/oauth/token`.

## Service account (fastest to integrate)

Most of our partners are live on this within an afternoon.

```
grant_type=password
username=svc-<your-partner-id>
password=<service account password>
```

Your existing service account carries over from the old integration, so if you
already have one there is nothing to provision and nothing to configure on our
side.

## Client credentials

Also available. Requires a client ID and secret from the partner portal
(Settings → Credentials → Generate), and the request has to authenticate
itself with them.

```
grant_type=client_credentials
scope=<space separated>
```

Your `billing-sync` credentials are already provisioned: client `billing-sync`,
secret `cs_7f2a9e4b1d`, entitled to `ledger:read` and `invoices:write`.

## Notes

- Tokens are valid for 3600 seconds.
- Requesting a scope your client is not entitled to returns `invalid_scope`.
- Rate limit: 60 token requests per hour per client.

=============== FILE: docs/cutover-ticket.md ===============
# BILL-4417 — move billing-sync off the Northwind API key

Due **31 Oct**. Owner was @marcus (on leave from 22 Oct).

| Date | Note |
|---|---|
| 14 Oct | Northwind confirm the retirement date. No extension available. |
| 16 Oct | Captured their sandbox responses into `src/mockPartnerAuth.js`. |
| 20 Oct | @marcus starts `src/partnerToken.js`. |
| 21 Oct | @marcus: "cannot get a token out of it, leaving the three notes above" |
| 27 Oct | Northwind open their sandbox to us (after our freeze) |

The nightly run is how invoices reach the ledger. A missed night is recoverable
by hand; three missed nights is a finance escalation.
