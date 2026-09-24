# A customer's production key was revoked and all he did was open an email link

## Problem Description

`ledgerly` is our invoicing product. On 3 September, W. Mbeki at Cranmere
Logistics raised ticket 7734: their production integration key `k_8812`
stopped working at 09:58 and nobody on their side revoked it. The only thing
he did around then was open a link in an email claiming to be a Ledgerly
invoice, which rendered a blank page, so he closed it. The access log lines for
that session are in the attached thread, headers and all.

Separately, our DAST vendor's run 214 landed the day after with three findings
against the account area, all filed as the same class and all High. The
scanner's caveat is printed under its table: it flags authenticated GET
requests it cannot prove are safe, it does not read response bodies and it does
not compare server state between runs. I need each of the three triaged against
what the code actually does, because I am not signing off three High findings
on a vendor's say-so and I am not dismissing them on mine either.

Owen and Mira have both replied on the thread. Owen thinks the ticket and the
scanner findings are one false positive three times over, because we set
`SameSite=Lax` on the session cookie and a cross-site request therefore cannot
carry it. Mira's position is that if we have to satisfy the vendor anyway, the
cheap version is to append the token to the links the dashboard renders as a
query parameter and reject the request when it is absent — one afternoon, and
no change to the email templates or the mobile app, both of which build those
URLs themselves and neither of which can send a custom header.

The repo is attached: the router, and five green tests on it. There is an
anti-forgery helper in there already that both write endpoints go through, so
whatever you do should be consistent with it, or should say why it is not.
Cranmere are asking whether their other key is safe and I owe them an answer
today.

## Output Specification

1. Write `src/csrf.test.js`. Do not modify `src/router.test.js`.
2. Repair `src/router.js` where the report is right. Leave it alone where the
   report is wrong.
3. Run `npm test`. The tree you hand back must be green.
4. Write `docs/ticket-7734-findings.md`: what happened to `k_8812`, a separate
   verdict on each of the vendor's three findings, and a direct answer to Owen
   and to Mira.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "ledgerly",
  "version": "7.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/router.js ===============
'use strict';

const crypto = require('node:crypto');

function createApp() {
  const sessions = new Map();

  const keys = new Map([
    ['k_8812', { owner: 'w.mbeki', revoked: false }],
    ['k_9043', { owner: 'w.mbeki', revoked: false }],
    ['k_5510', { owner: 't.harlow', revoked: false }],
  ]);

  const accounts = new Map([
    ['w.mbeki', { plan: 'growth', webhook: null }],
    ['t.harlow', { plan: 'starter', webhook: null }],
  ]);

  function login(user) {
    const sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, { user, csrfToken: crypto.randomBytes(16).toString('hex') });
    return sid;
  }

  function csrfTokenFor(sid) {
    return sessions.get(sid).csrfToken;
  }

  // Shared anti-forgery check. Both write endpoints go through this.
  function tokenOk(session, headers) {
    const supplied = headers['x-csrf-token'];
    if (typeof supplied !== 'string') return false;
    if (supplied.length !== session.csrfToken.length) return false;
    return true;
  }

  function handle({ method, path, query = {}, headers = {}, cookies = {} }) {
    const session = sessions.get(cookies.sid);
    if (!session) return { status: 401, body: { error: 'unauthenticated' } };

    if (method === 'GET' && path === '/account/keys/revoke') {
      const key = keys.get(query.id);
      if (!key || key.owner !== session.user) return { status: 404, body: { error: 'not_found' } };
      key.revoked = true;
      return { status: 200, body: { revoked: query.id } };
    }

    if (method === 'GET' && path === '/account/keys') {
      const mine = [...keys]
        .filter(([, key]) => key.owner === session.user)
        .map(([id, key]) => ({ id, revoked: key.revoked }));
      return { status: 200, body: { keys: mine } };
    }

    if (method === 'GET' && path === '/account/export') {
      return { status: 200, body: { plan: accounts.get(session.user).plan, invoices: [] } };
    }

    if (method === 'GET' && path === '/account/sessions') {
      const mine = [...sessions.values()].filter((s) => s.user === session.user);
      return { status: 200, body: { count: mine.length } };
    }

    if (method === 'POST' && path === '/billing/plan') {
      if (!tokenOk(session, headers)) return { status: 403, body: { error: 'csrf' } };
      accounts.get(session.user).plan = query.plan;
      return { status: 200, body: { plan: query.plan } };
    }

    if (method === 'POST' && path === '/account/webhook') {
      if (!tokenOk(session, headers)) return { status: 403, body: { error: 'csrf' } };
      accounts.get(session.user).webhook = query.url;
      return { status: 200, body: { webhook: query.url } };
    }

    return { status: 404, body: { error: 'not_found' } };
  }

  return {
    login,
    csrfTokenFor,
    handle,
    keyState: (id) => keys.get(id),
    planFor: (user) => accounts.get(user).plan,
    webhookFor: (user) => accounts.get(user).webhook,
  };
}

module.exports = { createApp };

=============== FILE: src/router.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./router');

test('a request with no session is refused', () => {
  const app = createApp();
  const res = app.handle({ method: 'GET', path: '/account/keys', cookies: {} });
  assert.equal(res.status, 401);
});

test('the key list shows a customer only their own keys', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({ method: 'GET', path: '/account/keys', cookies: { sid } });
  assert.deepEqual(
    res.body.keys.map((k) => k.id),
    ['k_8812', 'k_9043'],
  );
});

test('the export endpoint returns the account plan', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({ method: 'GET', path: '/account/export', cookies: { sid } });
  assert.equal(res.status, 200);
  assert.equal(res.body.plan, 'growth');
});

test('changing plan without a token is refused', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({
    method: 'POST',
    path: '/billing/plan',
    query: { plan: 'scale' },
    cookies: { sid },
    headers: {},
  });
  assert.equal(res.status, 403);
});

test('changing plan with the session token succeeds', () => {
  const app = createApp();
  const sid = app.login('w.mbeki');
  const res = app.handle({
    method: 'POST',
    path: '/billing/plan',
    query: { plan: 'scale' },
    cookies: { sid },
    headers: { 'x-csrf-token': app.csrfTokenFor(sid) },
  });
  assert.equal(res.status, 200);
  assert.equal(app.planFor('w.mbeki'), 'scale');
});

=============== FILE: docs/scanner-report.md ===============
# Aurelia DAST, run 214 — ledgerly.app, 4 September

Three findings, all class **CSRF: state-changing request without anti-forgery
token**, severity High.

| # | Endpoint | Method | Scanner note |
|---|---|---|---|
| 1 | `/account/keys/revoke` | GET | no token parameter or header observed |
| 2 | `/account/export` | GET | no token parameter or header observed |
| 3 | `/account/sessions` | GET | no token parameter or header observed |

> **Scanner caveat, printed on every report.** Aurelia flags every
> authenticated GET it cannot prove is safe. It does not parse response
> bodies, it does not diff server state between runs, and it does not
> distinguish a read from a write. Triage each finding against the
> application.

Not flagged by this run: `POST /billing/plan` and `POST /account/webhook` — a
token header was observed on the requests Aurelia replayed against both, and
Aurelia records an endpoint as covered once it sees one.

=============== FILE: docs/ticket-7734.md ===============
# Ticket 7734 — "I did not revoke that key"

**W. Mbeki, Cranmere Logistics, 3 Sep 11:26**

> Our production integration key `k_8812` stopped working at 09:58 this
> morning. Nobody on our team revoked it — we have two people with access to
> that page and neither was logged in. The only thing I did around then was
> open a link in an email that said it was a Ledgerly invoice. It went to a
> blank page so I closed it. Is `k_9043` safe? That one is running payroll.

**Access log, the session in question, 3 September**

```
09:41:02 GET /account/keys            200 sid=1e6b...
         sec-fetch-site: same-origin
         sec-fetch-mode: cors
         sec-fetch-dest: empty

09:58:04 GET /account/keys/revoke?id=k_8812  200 sid=1e6b...
         referer: https://mail.google.com/
         sec-fetch-site: cross-site
         sec-fetch-mode: navigate
         sec-fetch-dest: document
         user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ... Chrome/141
```

**Dev thread**

> **Owen, 4 Sep 10:12** — We set `SameSite=Lax` on `sid`. A cross-site request
> cannot carry the session cookie, so whatever this was, it was not somebody
> else's page driving his browser. More likely their own automation with a
> stored cookie. And Aurelia's three findings are the same false positive
> three times.
>
> **Mira, 4 Sep 10:31** — If we have to satisfy Aurelia regardless, the cheap
> version is to render the token into the link as `?csrf=<token>` and reject
> the request when the parameter is absent. One afternoon. No change to the
> email templates or the mobile app, which both build those URLs themselves
> and neither of which can send a custom header. It is the same token either
> way, so I do not see what we lose.
