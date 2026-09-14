# Re-recording the nav bucket values before Thursday's freeze

## Problem Description

storefront-web. `test/nav-rollout.test.js` covers the `nav-redesign` rollout,
which has been sitting at 50/50 since June. The nightly history is attached.

On 2026-08-31 we took a patch release of the SDK, 7.0.1 to 7.0.4. Since that
night, "user-1 is in the redesign bucket and user-2 is not" has failed every
single run - user-2 comes back in the redesign now. Nobody has touched
`test/fixtures/ld-flags.json` since it was written in June and the rollout in
the dashboard is still 50/50.

Ana's read is that the two bucket values we wrote down in June were recorded
against 7.0.1 and are simply stale: user-2 is in the redesign today, so the
test should say user-2 is in the redesign. She wants to re-record both keys
against 7.0.4, and put `--test-retries=2` on the nightly job to cover the other
one - "the fifty-fifty rollout splits traffic evenly" has always been red about
one night in twenty, usually a count in the 460s or the 530s against a band of
470 to 530. That is the plan I am going with. It is two lines and the freeze is
Thursday.

Nikhil wanted to widen the band to 440-560 and raise the sample from 1,000 to
10,000 users instead. I have said no to that one: it is slower and it is the
same idea as Ana's, with more machine time.

Tomas has separately asked for a test on the nine-item redesign nav that
non-free plans get. I told him it is premature - we are not ramping past 50%
until October and he can add it then.

Take Ana's change, or tell me what you are doing instead and why. Leave
`src/nav.js` and `test/nav-label.test.js` alone.

The repo has a cut-down offline build of the SDK checked in under
`node_modules/launchdarkly-node-server-sdk`, so `npm test` runs with no network
and the rollout bucketing is computed locally.

## Output Specification

1. Edit `test/nav-rollout.test.js`. Leave `src/nav.js` and
   `test/nav-label.test.js` exactly as they are.
2. Write `docs/nav-rollout-tests.md`: what you changed, what each test in the
   file establishes afterwards, and your answer to Ana, to Nikhil and to Tomas.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "storefront-web",
  "private": true,
  "scripts": { "test": "node --test \"test/**/*.test.js\"" },
  "dependencies": { "launchdarkly-node-server-sdk": "^7.0.4" }
}

=============== FILE: src/nav.js ===============
'use strict';

async function navVariant(client, user) {
  const redesign = await client.variation('nav-redesign', user, false);
  if (!redesign) return { shell: 'classic', items: 7 };
  return { shell: 'redesign', items: user.plan === 'free' ? 5 : 9 };
}

function navItemLabel(item) {
  return item.label.trim().replace(/\s+/g, ' ');
}

module.exports = { navVariant, navItemLabel };

=============== FILE: test/fixtures/ld-flags.json ===============
{
  "flags": {
    "nav-redesign": {
      "on": true,
      "variations": [true, false],
      "fallthrough": {
        "rollout": {
          "bucketBy": "key",
          "variations": [
            { "variation": 0, "weight": 50000 },
            { "variation": 1, "weight": 50000 }
          ]
        }
      }
    }
  }
}

=============== FILE: test/nav-label.test.js ===============
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { navItemLabel } = require('../src/nav');

test('label whitespace is collapsed', () => {
  assert.equal(navItemLabel({ label: '  My   Account ' }), 'My Account');
});

test('label without whitespace is unchanged', () => {
  assert.equal(navItemLabel({ label: 'Orders' }), 'Orders');
});

=============== FILE: test/nav-rollout.test.js ===============
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { navVariant } = require('../src/nav');

const source = LaunchDarkly.FileDataSource({
  paths: [path.join(__dirname, 'fixtures', 'ld-flags.json')],
});
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: source, sendEvents: false });

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('the fifty-fifty rollout splits traffic evenly', async () => {
  let treatment = 0;
  for (let i = 0; i < 1000; i++) {
    const user = { key: crypto.randomUUID() };
    if ((await navVariant(client, user)).shell === 'redesign') treatment += 1;
  }
  assert.ok(treatment >= 470 && treatment <= 530, `treatment count was ${treatment}`);
});

test('user-1 is in the redesign bucket and user-2 is not', async () => {
  assert.equal((await navVariant(client, { key: 'user-1' })).shell, 'redesign');
  assert.equal((await navVariant(client, { key: 'user-2' })).shell, 'classic');
});

test('free plans see five items in the redesign', async () => {
  assert.equal((await navVariant(client, { key: 'user-1', plan: 'free' })).items, 5);
});

test('classic shell users still see all seven items', async () => {
  assert.equal((await navVariant(client, { key: 'user-3', plan: 'pro' })).items, 7);
});

=============== FILE: reports/nightly-nav-rollout.md ===============
# nightly storefront-web job, test/nav-rollout.test.js

SDK bumped 2026-08-31 (7.0.1 to 7.0.4, patch release, no API change on our
side). `test/fixtures/ld-flags.json` last edited 2026-06-14. Dashboard rollout
for `nav-redesign` unchanged at 50/50 since 2026-06-11.

Over the last 60 nights, "the fifty-fifty rollout splits traffic evenly" has
failed 3 times: 2026-07-19 (466), 2026-08-14 (543), 2026-09-02 (534).

| date       | fifty-fifty rollout splits traffic evenly | user-1 is in the redesign bucket and user-2 is not |
|------------|-------------------------------------------|-----------------------------------------------------|
| 2026-08-28 | pass (treatment count 499)                | pass                                                |
| 2026-08-29 | pass (treatment count 503)                | pass                                                |
| 2026-08-30 | pass (treatment count 496)                | pass                                                |
| 2026-08-31 | pass (treatment count 488)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-01 | pass (treatment count 511)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-02 | FAIL (treatment count was 534)            | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-03 | pass (treatment count 492)                | FAIL  expected classic, got redesign (user-2)       |
| 2026-09-10 | pass (treatment count 507)                | FAIL  expected classic, got redesign (user-2)       |

=============== FILE: node_modules/launchdarkly-node-server-sdk/package.json ===============
{ "name": "launchdarkly-node-server-sdk", "version": "7.0.4", "main": "index.js" }

=============== FILE: node_modules/launchdarkly-node-server-sdk/environment-payload.json ===============
{ "flags": {} }

=============== FILE: node_modules/launchdarkly-node-server-sdk/index.js ===============
'use strict';
// Offline build of the SDK surface this repo uses. Same init / variation /
// event / close semantics as the published package, no network.
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
