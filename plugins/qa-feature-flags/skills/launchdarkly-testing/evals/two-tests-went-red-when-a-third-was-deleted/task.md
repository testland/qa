# Ivan's retry patch goes in Monday unless somebody comes back by Friday

## Problem Description

notifications-service.

On Thursday Priya deleted the first test in `test/digest.test.js` - the one
called "digest goes out when the flag is on, except for users who muted it" -
because it read to her like a weaker version of the morning test below it. Two
other tests in the same file went red the moment it went. She put it back and
everything is green again, and now nobody wants to touch the file.

Separately we are cutting the wall-clock time of the suite by sharding CI one
test per runner: each shard runs `node --test --test-name-pattern="<name>"`.
I ran that configuration on Wednesday and the log is attached. The full run is
`tests 9 / pass 9 / fail 0`. The sharded run has the same two failures Priya
saw, both in `digest.test.js`, both `false !== true`.

The plan for Monday is Ivan's: keep the shards and give that job
`--test-retries=2`. His argument is that the tests demonstrably pass in a
normal run, so the failures are an artefact of running them one per process
rather than anything about the tests themselves, and the board has to be green
for the quarter review on the 22nd. I have told him yes unless somebody comes
back with something better by Friday.

Have a look at `test/digest.test.js` and tell me whether the shard plan is safe
to keep. `src/`, `test/channel.test.js` and `test/hours.test.js` are not in
scope.

The repo has a cut-down offline build of the SDK checked in under
`node_modules/launchdarkly-node-server-sdk` so the suite runs with no network.
`npm test` runs the whole suite; a single test can be run the way the shard log
shows.

## Output Specification

1. Edit `test/digest.test.js`, and `test/support/flags.js` if it needs it, for
   whatever your answer calls for. Leave `src/`, `test/channel.test.js` and
   `test/hours.test.js` as they are.
2. Write `docs/shard-failures.md`: whether the shard plan is safe to keep, what
   you changed, and your answer to Ivan.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "notifications-service",
  "private": true,
  "scripts": { "test": "node --test \"test/**/*.test.js\"" },
  "dependencies": { "launchdarkly-node-server-sdk": "^7.0.4" }
}

=============== FILE: src/digest.js ===============
'use strict';

function isNight(hour) {
  return hour >= 22 || hour < 7;
}

async function shouldSendDigest(client, user, hour) {
  const enabled = await client.variation('digest-email', user, false);
  if (!enabled) return false;
  const quiet = await client.variation('quiet-hours', user, false);
  if (quiet && isNight(hour)) return false;
  return true;
}

async function digestChannel(client, user) {
  const push = await client.variation('digest-push-channel', user, false);
  return push ? 'push' : 'email';
}

module.exports = { isNight, shouldSendDigest, digestChannel };

=============== FILE: test/support/flags.js ===============
'use strict';
const LaunchDarkly = require('launchdarkly-node-server-sdk');

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });

let initialized;
function ready() {
  if (!initialized) initialized = client.waitForInitialization();
  return initialized;
}

module.exports = { td, client, ready };

=============== FILE: test/digest.test.js ===============
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { td, client, ready } = require('./support/flags');
const { shouldSendDigest } = require('../src/digest');

const MORNING = 9;
const LATE_NIGHT = 23;

before(async () => { await ready(); });
after(async () => { await client.close(); });

test('digest goes out when the flag is on, except for users who muted it', async () => {
  await td.update(
    td.flag('digest-email').booleanFlag().on(true).fallthroughVariation(0).variationForUser('u-7', 1)
  );
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, MORNING), true);
});

test('quiet hours suppress the late-night digest', async () => {
  await td.update(td.flag('quiet-hours').booleanFlag().on(true));
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, LATE_NIGHT), false);
});

test('a morning digest still goes out with quiet hours on', async () => {
  assert.equal(await shouldSendDigest(client, { key: 'u-1' }, MORNING), true);
});

test('quiet hours do not apply to the ops mailing list', async () => {
  await td.update(
    td.flag('quiet-hours').booleanFlag().variationForUser('ops-list', 1).fallthroughVariation(0)
  );
  assert.equal(await shouldSendDigest(client, { key: 'ops-list' }, LATE_NIGHT), true);
});

test('a user who muted the digest gets nothing', async () => {
  assert.equal(await shouldSendDigest(client, { key: 'u-7' }, MORNING), false);
});

=============== FILE: test/channel.test.js ===============
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { td, client, ready } = require('./support/flags');
const { digestChannel } = require('../src/digest');

before(async () => { await ready(); });
after(async () => { await client.close(); });

test('push channel wins when the flag is on', async () => {
  await td.update(td.flag('digest-push-channel').booleanFlag().on(true));
  assert.equal(await digestChannel(client, { key: 'u-1' }), 'push');
});

test('email is the channel when the flag is off', async () => {
  await td.update(td.flag('digest-push-channel').booleanFlag().on(false));
  assert.equal(await digestChannel(client, { key: 'u-1' }), 'email');
});

=============== FILE: test/hours.test.js ===============
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isNight } = require('../src/digest');

test('night starts at 22:00', () => {
  assert.equal(isNight(21), false);
  assert.equal(isNight(22), true);
});

test('night ends at 07:00', () => {
  assert.equal(isNight(6), true);
  assert.equal(isNight(7), false);
});

=============== FILE: reports/shard-run.log ===============
# CI shard experiment, branch ci/per-test-shards, 2026-09-10
# each shard runs: node --test --test-name-pattern="<name>" "test/**/*.test.js"

shard 01  "digest goes out when the flag is on, except for users who muted it"   PASS
shard 02  "quiet hours suppress the late-night digest"                           PASS
shard 03  "a morning digest still goes out with quiet hours on"
          AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
          false !== true
              at test/digest.test.js:26:10                                       FAIL
shard 04  "quiet hours do not apply to the ops mailing list"
          AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
          false !== true
              at test/digest.test.js:33:10                                       FAIL
shard 05  "a user who muted the digest gets nothing"                             PASS
shard 06  "push channel wins when the flag is on"                                PASS
shard 07  "email is the channel when the flag is off"                            PASS
shard 08  "night starts at 22:00"                                                PASS
shard 09  "night ends at 07:00"                                                  PASS

# full run for comparison: node --test "test/**/*.test.js"
# tests 9 / pass 9 / fail 0

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
