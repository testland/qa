# The per-deploy check has been green for 47 deploys and missed two incidents

## Problem Description

Auben's deploy pipeline runs a short set of critical-path checks before it
promotes a build. It has been green on every one of the last 47 deploys, which
sounds good until you read `reports/incidents.md`. Two incidents in that window
were both on paths those checks supposedly cover, and neither of them turned the
pipeline red. One of them is still live and costing us money every hour.

The board asked me on Wednesday how a gate that has never once objected is
worth keeping. I do not have an answer yet and I would like one that is not "we
will write more tests", because I do not believe the problem is the number of
tests.

What I want from you is the mechanical explanation. Go through the gate — the
npm script, the workflow step, and the check files themselves — and find every
place where a failure can happen and not reach the pipeline's exit status. Then
fix them, so that running the gate on the code exactly as it stands today comes
back red.

Two constraints. The pricing bug in `src/app.js` is the billing team's, their
fix is in review as #4412, and if you change that file I cannot tell whether the
gate is working or whether you just made the symptom go away — so leave it
alone. And `npm test` is the unit suite; it is green and it has to stay green.

## Output Specification

1. Fix the gate. When you are done, `npm run smoke` must exit non-zero on the
   current `src/app.js`, and `npm test` must still exit zero.
2. Write `docs/gate-audit.md`: one line per mechanism you found that was
   letting a failure through, and one line per fix.
3. Do not modify `src/app.js` or `test/app.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "auben",
  "private": true,
  "scripts": {
    "test": "cd test && node --test",
    "smoke": "cd smoke && node --test || exit 0"
  }
}

=============== FILE: src/app.js ===============
'use strict';

const USERS = { 'verify@auben.test': { id: 'u-1', password: 'seeded-pw' } };
const SESSIONS = new Set();

async function signIn(email, password) {
  const user = USERS[email];
  if (!user || user.password !== password) return { status: 401, body: { error: 'bad_credentials' } };
  const token = `t-${user.id}`;
  SESSIONS.add(token);
  return { status: 200, body: { token } };
}

async function getDashboard(token) {
  if (!SESSIONS.has(token)) return { status: 401, body: { error: 'no_session' } };
  return { status: 200, body: { heading: 'Your week', cards: ['orders', 'usage', 'invoices'] } };
}

async function priceCart(items, promo) {
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const tenth = Math.round(subtotal / 10);
  return { status: 200, body: { subtotal, total: promo === 'SAVE10' ? tenth : subtotal, currency: 'GBP' } };
}

async function placeOrder(token, cart) {
  if (!SESSIONS.has(token)) return { status: 401, body: { error: 'no_session' } };
  const priced = await priceCart(cart.items, cart.promo);
  return { status: 200, body: { state: 'confirmed', reference: 'AUB-77120', charged: priced.body.total } };
}

module.exports = { signIn, getDashboard, priceCart, placeOrder };

=============== FILE: test/app.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { signIn, getDashboard } = require('../src/app');

test('sign-in rejects a wrong password', async () => {
  const res = await signIn('verify@auben.test', 'nope');
  assert.equal(res.status, 401);
});

test('the dashboard refuses an unknown session', async () => {
  const res = await getDashboard('t-nobody');
  assert.equal(res.status, 401);
});

=============== FILE: smoke/auth.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: sign in', () => {
  app.signIn('verify@auben.test', process.env.VERIFY_PASSWORD || 'seeded-pw').then((res) => {
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
  });
});

=============== FILE: smoke/dashboard.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: dashboard loads', async () => {
  const res = await app.getDashboard('t-smoke-session');
  assert.ok(res.status !== 500, 'dashboard should not blow up');
});

=============== FILE: smoke/cart.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: promo pricing', async () => {
  try {
    const res = await app.priceCart([{ sku: 'AUB-SEED-1', price: 2000, qty: 1 }], 'SAVE10');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1800);
  } catch (err) {
    console.log('promo check skipped:', err.message);
  }
});

=============== FILE: smoke/order.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('smoke: place an order', { skip: 'unstable against the seeded cart, revisit after 2026-04-02' }, async () => {
  const signed = await app.signIn('verify@auben.test', 'seeded-pw');
  const res = await app.placeOrder(signed.body.token, {
    items: [{ sku: 'AUB-SEED-1', price: 2000, qty: 1 }],
    promo: 'SAVE10',
  });
  assert.equal(res.body.state, 'confirmed');
});

=============== FILE: .github/workflows/deploy-gate.yml ===============
name: deploy-gate

on:
  push:
    branches: [main]

jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - name: Gate
        continue-on-error: true
        run: npm run smoke
      - name: Promote
        run: ./scripts/promote.sh ${{ github.sha }}

=============== FILE: reports/incidents.md ===============
# Two incidents inside the window the gate was green

## INC-3401 — promo SAVE10 billed at 10% OF list, not 10% OFF (2026-09-02, open)

A £20.00 item with SAVE10 applied should be charged £18.00. It was charged
£2.00. 1,140 orders across six hours before someone in finance noticed the
daily reconciliation. Still live; billing team's fix is #4412, in review.

Detected by: finance reconciliation. Not by the gate.

## INC-3388 — dashboard returned 401 to signed-in users for 22 minutes (2026-08-21)

A session-store rollout invalidated every live token. The gate ran three times
during the window and was green each time.

Detected by: support volume. Not by the gate.

## Gate record

47 consecutive green runs, 2026-07-19 to 2026-09-11. No red run in the window.
The unit suite has two tests, both on the auth path. Nothing anywhere covers
`priceCart`.
