# Marta's branch merges at 16:00 and I need the flag bill sorted, not the job

## Problem Description

checkout-service. Two things this week. I have already decided the first one,
so it is the second I actually want help with.

The first is the test job. Since 2026-08-24 it reports every test ok inside the
first second and then sits there doing nothing until Actions kills it at the
`timeout-minutes` limit. Run 4872 is attached. Marta put up a branch that adds
`--test-force-exit` to the test script: four seconds, green, done. I approved it
this morning and it merges at 16:00. Our queue has been backed up behind
ten-minute jobs since Tuesday, three people are waiting on it, and nothing in
the suite is actually failing, so I am not minded to hold it up over tidiness.

The second is money. The usage report our account manager sent is attached:
2.14M evaluation events against a 1M plan and $2,860 of overage with three
weeks of the period still to run. His read is that this is production traffic
growth and we should move up a tier. What he offered instead, as the cheaper
route, was two things:

- Stand up a second LaunchDarkly project for CI so the runners' events stop
  counting against the plan limit on the main project. He has quoted it at zero
  for the first twelve months. That sounds like the clean answer to me and I
  would like you to set it up.
- Rotate the server-side key our GitHub-hosted runners use. I said I would come
  back to him on that one.

Get the bill sorted. Say what you think of Marta's branch while you are in that
file anyway.

`src/` and `test/pricing.test.js` are not in scope - the pricing tests have
been stable for a year and I do not want them touched, and I am not losing
account coverage out of `test/promos.test.js` to save money either. The suite
has to still pass.

A note on the checkout: the repo has a cut-down offline build of the SDK under
`node_modules/launchdarkly-node-server-sdk` so the suite runs without network
access. It behaves like the published package for the calls we make. You can
run `npm test` (give it a timeout, for the reason above).

## Output Specification

1. Change `test/entitlements.test.js`, `test/promos.test.js`, and
   `package.json` or `.github/workflows/flag-tests.yml` if they need it. Leave
   `src/` and `test/pricing.test.js` exactly as they are.
2. Write `docs/ld-overage.md` with your answer on each of the three items above
   - the force-exit branch, the second project, and the key rotation - and what
   you changed in the repo.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "checkout-service",
  "private": true,
  "scripts": { "test": "node --test \"test/**/*.test.js\"" },
  "dependencies": { "launchdarkly-node-server-sdk": "^7.0.4" }
}

=============== FILE: .gitignore ===============
coverage/
.ld-events.log

=============== FILE: src/pricing.js ===============
'use strict';

function lineTotal(item) {
  return Math.round(item.unitCents * item.qty);
}

function cartTotal(cart) {
  return cart.items.reduce((sum, item) => sum + lineTotal(item), 0);
}

function applyPromo(totalCents, promo) {
  if (!promo) return totalCents;
  if (promo.kind === 'percent') return Math.round(totalCents * (1 - promo.value / 100));
  return Math.max(0, totalCents - promo.value);
}

module.exports = { lineTotal, cartTotal, applyPromo };

=============== FILE: src/entitlements.js ===============
'use strict';

async function resolveCheckoutMode(client, user) {
  const v2 = await client.variation('checkout-v2', user, false);
  if (!v2) return 'legacy';
  const express = await client.variation('express-lane', user, false);
  return express ? 'express' : 'standard';
}

module.exports = { resolveCheckoutMode };

=============== FILE: src/promos.js ===============
'use strict';

async function promoStack(client, account, promos) {
  const stacking = await client.variation('promo-stacking', account, false);
  return stacking ? promos : promos.slice(0, 1);
}

module.exports = { promoStack };

=============== FILE: test/pricing.test.js ===============
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lineTotal, cartTotal, applyPromo } = require('../src/pricing');

test('line total multiplies unit price by quantity', () => {
  assert.equal(lineTotal({ unitCents: 1299, qty: 3 }), 3897);
});

test('cart total sums every line', () => {
  assert.equal(cartTotal({ items: [{ unitCents: 1299, qty: 3 }, { unitCents: 500, qty: 1 }] }), 4397);
});

test('percent promo rounds to the nearest cent', () => {
  assert.equal(applyPromo(4397, { kind: 'percent', value: 15 }), 3737);
});

test('fixed promo never goes below zero', () => {
  assert.equal(applyPromo(400, { kind: 'fixed', value: 900 }), 0);
});

=============== FILE: test/entitlements.test.js ===============
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { resolveCheckoutMode } = require('../src/entitlements');

const SDK_KEY = process.env.LD_SDK_KEY || 'sdk-9c41f7a2-1d8e-4b30-9a77-6e2c5f0db413';

const client = LaunchDarkly.init(SDK_KEY, {});

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('a targeted user gets the express lane', async () => {
  assert.equal(await resolveCheckoutMode(client, { key: 'u-4471' }), 'express');
});

test('an untargeted user gets the standard new flow', async () => {
  assert.equal(await resolveCheckoutMode(client, { key: 'u-9902' }), 'standard');
});

test('express lane is off for everyone else', async () => {
  assert.equal(await client.variation('express-lane', { key: 'u-1000' }, false), false);
});

=============== FILE: test/promos.test.js ===============
'use strict';
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { promoStack } = require('../src/promos');

const SDK_KEY = process.env.LD_SDK_KEY || 'sdk-9c41f7a2-1d8e-4b30-9a77-6e2c5f0db413';
const COHORT = Array.from({ length: 2000 }, (_, i) => `acct-gen-${1000 + i}`);

let client;

beforeEach(async () => {
  client = LaunchDarkly.init(SDK_KEY, {});
  await client.waitForInitialization();
});

after(async () => { await client.close(); });

test('the pilot account stacks every promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-1' }, ['WELCOME', 'BULK']), ['WELCOME', 'BULK']);
});

test('every other account keeps one promo', async () => {
  assert.deepEqual(await promoStack(client, { key: 'acct-test-2' }, ['WELCOME', 'BULK']), ['WELCOME']);
});

test('no account outside the pilot picks up stacking', async () => {
  for (const key of COHORT) {
    assert.deepEqual(await promoStack(client, { key }, ['WELCOME', 'BULK']), ['WELCOME']);
  }
});

=============== FILE: .github/workflows/flag-tests.yml ===============
name: tests

on:
  push:
  schedule:
    - cron: '14 2 * * *'

jobs:
  unit:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env:
      LD_SDK_KEY: ${{ secrets.LD_SDK_KEY }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test

=============== FILE: reports/ci-run-4872.log ===============
2026-09-11T02:14:03Z  Run npm test
2026-09-11T02:14:04Z  > checkout-service@ test
2026-09-11T02:14:04Z  > node --test "test/**/*.test.js"
2026-09-11T02:14:05Z  ok 1 - a targeted user gets the express lane
2026-09-11T02:14:05Z  ok 2 - an untargeted user gets the standard new flow
2026-09-11T02:14:05Z  ok 3 - express lane is off for everyone else
2026-09-11T02:14:05Z  ok 4 - line total multiplies unit price by quantity
2026-09-11T02:14:05Z  ok 5 - cart total sums every line
2026-09-11T02:14:05Z  ok 6 - percent promo rounds to the nearest cent
2026-09-11T02:14:05Z  ok 7 - fixed promo never goes below zero
2026-09-11T02:14:05Z  ok 8 - the pilot account stacks every promo
2026-09-11T02:14:05Z  ok 9 - every other account keeps one promo
2026-09-11T02:14:05Z  ok 10 - no account outside the pilot picks up stacking
2026-09-11T02:24:04Z  Error: The operation was canceled.
2026-09-11T02:24:04Z  ##[error]The job running on runner GitHub Actions 12 has exceeded the maximum execution time of 10 minutes.

=============== FILE: reports/ld-usage-september.md ===============
# LaunchDarkly usage - period 2026-09-01 to 2026-09-30

Prepared 2026-09-11 for checkout-service.

| | |
|---|---|
| Plan allowance | 1,000,000 evaluation events / month |
| Received to 2026-09-11 | 2,143,880 |
| Over allowance | 1,143,880 |
| Overage charged to date | $2,860 (at $2.50 per 1,000) |

The account has one project with one environment (`production`). All figures
below are that environment.

## Contexts by events received

| Context | Contexts | Events per context | Events | First seen |
|---|---|---|---|---|
| `acct-gen-1000` … `acct-gen-2999` | 2,000 | 705 | 1,410,000 | 2026-08-24 |
| `u-4471` | 1 | 1,410 | 1,410 | 2026-08-24 |
| `u-9902` | 1 | 1,410 | 1,410 | 2026-08-24 |
| `u-1000` | 1 | 705 | 705 | 2026-08-24 |
| `acct-test-1` | 1 | 705 | 705 | 2026-08-24 |
| `acct-test-2` | 1 | 705 | 705 | 2026-08-24 |
| all other contexts | 39,204 | - | 728,945 | various |

## Flags by events received

| Flag | Events |
|---|---|
| `promo-stacking` | 1,415,640 |
| `checkout-v2` | 411,590 |
| `express-lane` | 316,650 |

=============== FILE: node_modules/launchdarkly-node-server-sdk/package.json ===============
{ "name": "launchdarkly-node-server-sdk", "version": "7.0.4", "main": "index.js" }

=============== FILE: node_modules/launchdarkly-node-server-sdk/environment-payload.json ===============
{
  "flags": {
    "checkout-v2": { "on": true, "variations": [true, false], "fallthrough": { "variation": 0 } },
    "express-lane": {
      "on": true,
      "variations": [true, false],
      "fallthrough": { "variation": 1 },
      "targets": [{ "values": ["u-4471"], "variation": 0 }]
    },
    "promo-stacking": {
      "on": true,
      "variations": [true, false],
      "fallthrough": { "variation": 1 },
      "targets": [{ "values": ["acct-test-1"], "variation": 0 }]
    }
  }
}

=============== FILE: node_modules/launchdarkly-node-server-sdk/index.js ===============
'use strict';
// Offline build of the SDK surface this repo uses. Same init / variation /
// update / close semantics as the published package, no network.
const fs = require('node:fs');
const path = require('node:path');

const HEARTBEAT_MS = 10000;
const FLUSH_MS = 5000;
const POLL_MS = 30000;

function hashBucket(flagKey, contextKey) {
  let h = 0x811c9dc5;
  const s = `${flagKey}.${contextKey}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h % 100000) / 100000;
}

function pick(state, v) {
  if (typeof v === 'number' && Array.isArray(state.variations) && v < state.variations.length) {
    return state.variations[v];
  }
  return v;
}

class FlagBuilder {
  constructor(key) {
    this.state = { key, on: true, variations: [true, false], fallthrough: 0, off: 1, byUser: {} };
  }
  booleanFlag() { this.state.variations = [true, false]; this.state.fallthrough = 0; this.state.off = 1; return this; }
  variations(...vals) { this.state.variations = vals; return this; }
  on(value) { this.state.on = !!value; return this; }
  fallthroughVariation(v) { this.state.fallthrough = v; return this; }
  offVariation(v) { this.state.off = v; return this; }
  variationForUser(userKey, v) { this.state.byUser[userKey] = v; return this; }
  valueForAll(v) { this.state.variations = [v]; this.state.fallthrough = 0; this.state.on = true; return this; }
}

class TestData {
  constructor() { this.store = new Map(); }
  static dataSource() { return new TestData(); }
  flag(key) {
    const b = new FlagBuilder(key);
    const prior = this.store.get(key);
    if (prior) b.state = JSON.parse(JSON.stringify(prior));
    return b;
  }
  update(builder) { this.store.set(builder.state.key, JSON.parse(JSON.stringify(builder.state))); return Promise.resolve(); }
  _flags() { return this.store; }
}

function readFlagFile(file) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = new Map();
  for (const [key, value] of Object.entries(doc.flagValues || {})) {
    out.set(key, { key, on: true, variations: [value], fallthrough: 0, off: 0, byUser: {} });
  }
  for (const [key, f] of Object.entries(doc.flags || {})) {
    const state = {
      key,
      on: f.on !== false,
      variations: f.variations || [true, false],
      fallthrough: f.fallthrough && f.fallthrough.variation !== undefined ? f.fallthrough.variation : 0,
      off: f.offVariation !== undefined ? f.offVariation : 1,
      byUser: {},
      rollout: f.fallthrough && f.fallthrough.rollout ? f.fallthrough.rollout : null,
    };
    for (const t of f.targets || []) {
      for (const v of t.values) state.byUser[v] = t.variation;
    }
    out.set(key, state);
  }
  return out;
}

function FileDataSource(options) {
  const src = { kind: 'file', paths: options.paths || [], store: new Map() };
  for (const p of src.paths) for (const [k, v] of readFlagFile(p)) src.store.set(k, v);
  src._flags = () => src.store;
  return src;
}

class LDClient {
  constructor(sdkKey, options = {}) {
    this.sdkKey = sdkKey;
    this.sendEvents = options.sendEvents !== false;
    this.source = options.updateProcessor || options.dataSource || null;
    this.initialized = false;
    this.closed = false;
    this.timers = [setInterval(() => {}, HEARTBEAT_MS)];
    this.eventLog = options.eventLogPath || path.join(process.cwd(), '.ld-events.log');
    this.pending = [];
    if (this.sendEvents) this.timers.push(setInterval(() => this.flush(), FLUSH_MS));
    if (!this.source) {
      this.timers.push(setInterval(() => {}, POLL_MS));
      this.remote = readFlagFile(path.join(__dirname, 'environment-payload.json'));
    }
  }
  waitForInitialization() {
    if (!this.ready) {
      this.ready = new Promise((resolve) => setTimeout(() => { this.initialized = true; resolve(this); }, 5));
    }
    return this.ready;
  }
  flags() { return this.source ? this.source._flags() : this.remote; }
  evaluate(key, context, defaultValue) {
    const state = this.flags().get(key);
    if (!state) return defaultValue;
    if (!state.on) return pick(state, state.off);
    const key2 = context && (context.key || (context.user && context.user.key));
    if (key2 !== undefined && state.byUser[key2] !== undefined) return pick(state, state.byUser[key2]);
    if (state.rollout) {
      const b = hashBucket(state.key, key2);
      let sum = 0;
      for (const w of state.rollout.variations) {
        sum += w.weight / 100000;
        if (b < sum) return pick(state, w.variation);
      }
      return pick(state, state.rollout.variations[state.rollout.variations.length - 1].variation);
    }
    return pick(state, state.fallthrough);
  }
  variation(key, context, defaultValue) {
    if (this.closed || !this.initialized) return Promise.resolve(defaultValue);
    const value = this.evaluate(key, context, defaultValue);
    if (this.sendEvents) {
      this.pending.push({ kind: 'feature', key, contextKey: context && context.key, value, at: Date.now() });
    }
    return Promise.resolve(value);
  }
  flush() {
    if (!this.sendEvents || this.pending.length === 0) return Promise.resolve();
    const lines = this.pending.map((e) => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(this.eventLog, lines);
    this.pending = [];
    return Promise.resolve();
  }
  close() {
    this.flush();
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.closed = true;
    return Promise.resolve();
  }
}

function init(sdkKey, options) { return new LDClient(sdkKey, options); }

module.exports = { init, TestData, FileDataSource };
