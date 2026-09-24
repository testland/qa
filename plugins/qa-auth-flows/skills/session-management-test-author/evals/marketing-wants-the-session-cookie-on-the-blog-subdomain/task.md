# Two asks on the same cookie before Thursday's release

## Problem Description

`atlas-app` is our project-tracking SaaS. The session cookie is built in one
place, `src/cookie.js`, from whichever file under `config/` matches the
environment. I have two requests queued against it for Thursday and I would
like them dealt with together, because whoever picks this up is going to be in
that file anyway.

The first is from Priya on identity. Google Workspace sign-in is broken for the
forty-odd accounts that came across in the Northgate acquisition: they finish
consent at `accounts.google.com`, get redirected back to
`https://app.atlas.example/auth/callback`, and arrive signed out every time.
It works if she pastes the callback URL into the address bar herself. She wants
`sameSite` moved from `Strict` to `Lax` in `config/production.json` and she has
forty paying seats behind it. The redirect she is describing is captured in the
thread.

The second is from Tom on growth. He wants the session cookie readable on
`blog.atlas.example` and `status.atlas.example` so those pages can tell who is
reading and show the right call to action. Ops have told him the config already
has a domain key in it, so he is expecting a one-line change and has said as
much to his stakeholders.

I have attached the thread, the hosting inventory Ops keep, and a capture of
the request objects as they actually reach the app in each environment.

The repo has five green tests on the cookie builder. I want a straight answer
on each ask, and I want to know what the header we put on real users' browsers
actually contains — do not assume the green run means it is fine, because the
green run and the production header are not obviously the same thing to me.

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
// production node, and from a local `npm start`.
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

const anyRequest = { protocol: 'https', host: 'app.atlas.example', headers: {} };

test('the cookie carries the session id', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /^sid=abc123;/);
});

test('the cookie is not readable from page scripts', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /HttpOnly/);
});

test('the cookie is scoped to the app root', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /Path=\//);
});

test('the builder emits the SameSite value it is given', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /SameSite=Strict/);
});

test('the cookie is marked Secure over TLS', () => {
  const header = buildSessionCookie({
    sid: 'abc123',
    config: { path: '/', sameSite: 'Strict' },
    req: anyRequest,
  });
  assert.match(header, /Secure/);
});

=============== FILE: docs/hosting-inventory.md ===============
# Hosting inventory — atlas.example (Ops, reviewed 1 September)

| Host | What it is | Runs on | Change control | Admins |
|---|---|---|---|---|
| `app.atlas.example` | the product | our VPC, behind the edge load balancer | our pipeline | 6 engineers |
| `api.atlas.example` | public API | our VPC, same load balancer | our pipeline | 6 engineers |
| `blog.atlas.example` | marketing blog | hosted WordPress, vendor-managed | none | 4 Fieldhaus staff, 2 of ours |
| `status.atlas.example` | status page | third-party SaaS, vendor-managed | none | vendor + 2 of ours |
| `atlas.example` | apex, redirects to `app.` | our edge | our pipeline | 6 engineers |

Edge topology: clients terminate TLS at the edge load balancer, which forwards
to app nodes inside the VPC. Everything in `config/production.json` ships to
production as written.

=============== FILE: docs/cookie-thread.md ===============
# #eng-auth, 9-10 September

**Priya (identity), 9 Sep 14:02**

> Google Workspace sign-in is dead for the Northgate accounts. They approve
> consent at accounts.google.com, get bounced to
> `https://app.atlas.example/auth/callback`, and land on the signed-out page
> every single time. Same account, same browser, works if I type the callback
> URL into the address bar. Forty paying seats. I want `sameSite` changed from
> `Strict` to `Lax` in `config/production.json` for Thursday.
>
> Capture of the hop that fails, from her browser:
>
> ```
> GET /auth/callback?code=4%2F0AX4…&state=9f21…
>   > host: app.atlas.example
>   > referer: https://accounts.google.com/
>   > sec-fetch-site: cross-site
>   > sec-fetch-mode: navigate
>   > sec-fetch-dest: document
>   < 302 Location: /sign-in?next=%2F
> ```

**Tom (growth), 10 Sep 09:41**

> Separate ask while somebody is in that file. I want `blog.atlas.example` and
> `status.atlas.example` to be able to read the session cookie so they can tell
> who is reading and swap the call to action. Ops say there is already a domain
> key in the config, so I am told this is a one-liner and I have promised it
> for Thursday.

**Ops, 10 Sep 10:15**

> Inventory is attached for whoever picks this up. No opinion from us on either
> ask; we just host the things.
