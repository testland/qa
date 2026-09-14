# Two asks on the same cookie before Thursday's release

## Problem Description

`atlas-app` is our project-tracking SaaS. The session cookie is built in one
place, `src/cookie.js`, from whichever file under `config/` matches the
environment. I have two requests queued against it for Thursday and I would
like them dealt with together, because whoever picks this up is going to be in
that file anyway.

The first is from Priya on identity. Google Workspace sign-in is broken for the
forty-odd accounts that came across in the Northgate acquisition: they finish
consent at `accounts.google.com`, land back on
`https://app.atlas.example/auth/callback`, and arrive signed out every time.
It works if she pastes the callback URL into the address bar herself. She wants
`sameSite` moved from `Strict` to `Lax` in `config/production.json` and she has
forty paying seats behind it.

The second is from Tom on growth. He wants the session cookie issued on
`Domain=.atlas.example` so `blog.atlas.example` and `status.atlas.example` can
tell who is reading and show the right call to action. He has been told the
config key already exists, so he is expecting a one-line change. For context
neither of those hosts runs on our infrastructure: the blog is a hosted
WordPress that our content agency publishes into, and the status page is a
third-party product.

Ops have added a note to the thread about how requests actually arrive in
production, which I have left in as they wrote it.

The repo is attached. There are five green tests on the cookie builder. I want
a straight answer on each ask, and if the tests are not covering something they
should be, say so rather than assuming the green run means the header is fine.

## Output Specification

1. Write `src/cookie.attributes.test.js`, covering the header the app actually
   emits in production. Do not modify `src/cookie.test.js` and do not modify
   `src/requests.js` — the request objects in it are a capture, not something
   to edit.
2. Change `src/cookie.js` and the files under `config/` as your findings
   require.
3. Run `npm test`. The tree you hand back must be green.
4. Write `docs/cookie-decision.md`: a separate answer to each of the two asks,
   plus anything you found that neither of them raised.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "atlas-app",
  "version": "4.9.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: config/production.json ===============
{
  "path": "/",
  "sameSite": "Strict",
  "cookieDomain": ".atlas.example"
}

=============== FILE: config/development.json ===============
{
  "path": "/",
  "sameSite": "Strict"
}

=============== FILE: src/requests.js ===============
'use strict';

// Request objects exactly as they reach the app. Captured 2 September from a
// production node behind the load balancer, and from a local `npm start`.
const productionRequest = {
  protocol: 'http',
  host: 'app.atlas.example',
  headers: {
    host: 'app.atlas.example',
    'x-forwarded-proto': 'https',
    'x-forwarded-for': '203.0.113.44',
  },
};

const developmentRequest = {
  protocol: 'http',
  host: 'localhost:3000',
  headers: { host: 'localhost:3000' },
};

module.exports = { productionRequest, developmentRequest };

=============== FILE: src/cookie.js ===============
'use strict';

function buildSessionCookie({ sid, config, req }) {
  const parts = [`sid=${sid}`];
  parts.push(`Path=${config.path}`);
  parts.push('HttpOnly');
  parts.push(`SameSite=${config.sameSite}`);
  if (req.protocol === 'https') parts.push('Secure');
  if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
  if (config.maxAgeSeconds) parts.push(`Max-Age=${config.maxAgeSeconds}`);
  return parts.join('; ');
}

module.exports = { buildSessionCookie };

=============== FILE: src/cookie.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSessionCookie } = require('./cookie');
const { productionRequest, developmentRequest } = require('./requests');
const production = require('../config/production.json');
const development = require('../config/development.json');

test('the cookie carries the session id', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /^sid=abc123;/);
});

test('the cookie is not readable from page scripts', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /HttpOnly/);
});

test('the cookie is scoped to the app root', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: production, req: productionRequest });
  assert.match(header, /Path=\//);
});

test('the builder emits the SameSite value it is given', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: productionRequest,
  });
  assert.match(header, /SameSite=Strict/);
});

test('local development still gets a usable cookie', () => {
  const header = buildSessionCookie({ sid: 'abc123', config: development, req: developmentRequest });
  assert.match(header, /^sid=abc123;/);
});

=============== FILE: docs/cookie-thread.md ===============
# #eng-auth, 9-10 September

**Priya (identity), 9 Sep 14:02**

> Google Workspace sign-in is dead for the Northgate accounts. They approve
> consent at accounts.google.com, get bounced to
> `https://app.atlas.example/auth/callback`, and land on the signed-out page
> every single time. Same account, same browser, works if I type the callback
> URL into the address bar. Forty paying seats. I want `sameSite` changed from
> `Strict` to `Lax` in `config/production.json` for Thursday.

**Tom (growth), 10 Sep 09:41**

> Separate ask while somebody is in that file. Put the session cookie on
> `Domain=.atlas.example` so `blog.atlas.example` and `status.atlas.example`
> can tell who is reading and swap the call to action. Ops say the key is
> already in the config so it should be a one-liner. `blog.` is a hosted
> WordPress that Fieldhaus publish into — four of their staff have admin on it
> — and `status.` is a third-party status page. Neither is our infrastructure
> and neither is in our change-control process, before anyone asks.

**Ops, 10 Sep 10:15**

> For the record on how requests land: the load balancer terminates TLS at the
> edge and forwards to the app nodes inside the VPC over plain HTTP, so
> `req.protocol` is `http` on every production request — that is what the
> capture in `src/requests.js` shows. The original proto is in
> `x-forwarded-proto`. Everything in `config/production.json` ships to prod
> as written; `cookieDomain` has been in that file since a subdomain
> experiment in 2025 that was never unwound.
