# Second pair of eyes on PR 2291 before Tuesday's branch cut

## Problem Description

search-service. PR 2291 is Sofia's. It adds `test/support/ld.js` and
`test/ranking-flags.test.js` - six tests over the four flags we start moving
next Tuesday. Her PR description and the review thread are attached. The suite
is green, `tests 8 / pass 8 / fail 0`.

I am ready to stamp it. Sofia has been in that code since June and she is
careful, and the release process wants a second reviewer on anything touching
the flag suite before a branch cut - so this is me doing the required thing
rather than me having a concern.

One live question in the thread. Raul wants the data source and the client
built inside a `beforeEach` rather than once at the top of `test/support/ld.js`,
the way billing-service does it, so that no test can inherit anything from the
test before it. That reads sensible to me, and Sofia says she is happy either
way, so if you agree with him then make the change here rather than in a
follow-up.

Give me a read on each of the six tests in `test/ranking-flags.test.js`, and
put whatever your review calls for into the file.

`src/ranking.js` is live in production behind these flags, is out of scope for
this PR, and must not change. The suite has to be green when you are done.

The repo carries a cut-down offline build of the SDK under
`node_modules/launchdarkly-node-server-sdk` so the suite runs without network.
`npm test` runs it.

## Output Specification

1. Write `docs/pr-2291-review.md`: your verdict on each of the six tests in
   `test/ranking-flags.test.js` with the reasoning behind each one, and your
   answer to Raul.
2. Edit `test/ranking-flags.test.js`, and `test/support/ld.js` if it needs it,
   for anything your review calls for.
3. Do not change `src/ranking.js`. `npm test` must be green when you finish.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "search-service",
  "private": true,
  "scripts": { "test": "node --test \"test/**/*.test.js\"" },
  "dependencies": { "launchdarkly-node-server-sdk": "^7.0.4" }
}

=============== FILE: docs/pr-2291.md ===============
# PR 2291 - test coverage for the ranking flags

Author: @sofia-r    Target: main
Files: test/support/ld.js (new), test/ranking-flags.test.js (new)

`ranking-v3` and `cross-encoder-rerank` were created on 2026-09-02 and are off
for everyone today. `recall-depth` and `synonym-set` went in the same week. We
turn the first two on for the enterprise segment next Tuesday and ramp to 100%
over the fortnight after.

`src/ranking.js` has been live behind these flags since June. This PR does not
touch it.

## What this adds

`test/support/ld.js` holds the data source and the client so the test file does
not have to repeat the setup.

Six tests, one per behaviour we care about at the rollout:

1. free accounts stay on the legacy ranker while enterprise is on v3
2. the expensive ranker is not used while the flag is switched off
3. the reranker is not applied to accounts outside the rerank pilot
4. accounts outside the recall pilot keep the shallow window
5. the synonym set is unchanged for accounts outside the experiment
6. recall depth stays shallow while the depth flag is switched off

Suite is green (`tests 8 / pass 8 / fail 0`). All four flag keys are covered
and both branches of each one are exercised. Please stamp so release can cut
the branch.

=============== FILE: docs/pr-2291-thread.md ===============
# PR 2291 - review thread

**@raul-m** - 2026-09-12 09:41

Good to have this in before the ramp. One thing before you stamp: everything in
`test/support/ld.js` is module level, so all six tests share one client and one
data source. In billing-service we build both inside a `beforeEach` so every
test starts from nothing. Can we do the same here? Five-line change and it
takes the whole class of cross-test bleed off the table.

**@sofia-r** - 2026-09-12 10:02

Happy either way. It is module level because that is how I found it in the
other repos, not because I had a reason. Say the word and I will move it into a
`beforeEach` in this PR, otherwise I will open a follow-up.

**@raul-m** - 2026-09-12 10:15

Leaving that to the second reviewer then. Everything else reads fine to me -
the setup line in each test matches the behaviour in the test name, and it is
green.

=============== FILE: src/ranking.js ===============
'use strict';

async function rankingStrategy(client, user) {
  const v3 = await client.variation('ranking-v3', user, false);
  if (!v3) return 'bm25';
  const rerank = await client.variation('cross-encoder-rerank', user, false);
  return rerank ? 'semantic+rerank' : 'semantic';
}

async function recallDepth(client, user) {
  return client.variation('recall-depth', user, 120);
}

async function synonymSet(client, user) {
  return client.variation('synonym-set', user, 'core');
}

function tokenize(query) {
  return query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

module.exports = { rankingStrategy, recallDepth, synonymSet, tokenize };

=============== FILE: test/tokenize.test.js ===============
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tokenize } = require('../src/ranking');

test('tokenize lowercases and splits on punctuation', () => {
  assert.deepEqual(tokenize('Red Shoes, size 10!'), ['red', 'shoes', 'size', '10']);
});

test('tokenize drops empty fragments', () => {
  assert.deepEqual(tokenize('  --  '), []);
});

=============== FILE: test/support/ld.js ===============
'use strict';
const LaunchDarkly = require('launchdarkly-node-server-sdk');

const td = LaunchDarkly.TestData.dataSource();

const client = LaunchDarkly.init('sdk-test-key', {
  updateProcessor: td,
  sendEvents: false,
});

module.exports = { td, client };

=============== FILE: test/ranking-flags.test.js ===============
'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { td, client } = require('./support/ld');
const { rankingStrategy, recallDepth, synonymSet } = require('../src/ranking');

after(async () => { await client.close(); });

test('free accounts stay on the legacy ranker while enterprise is on v3', async () => {
  await td.update(td.flag('ranking-v3').booleanFlag().on(true).variationForUser('ent-7', 0).fallthroughVariation(1));
  assert.equal(await rankingStrategy(client, { key: 'free-1' }), 'bm25');
});

test('the expensive ranker is not used while the flag is switched off', async () => {
  await td.update(td.flag('ranking-v3').booleanFlag().on(false).offVariation(1));
  assert.equal(await rankingStrategy(client, { key: 'ent-7' }), 'bm25');
});

test('the reranker is not applied to accounts outside the rerank pilot', async () => {
  await td.update(td.flag('ranking-v3').booleanFlag().on(true).fallthroughVariation(0));
  await td.update(td.flag('cross-encoder-rerank').booleanFlag().on(true).fallthroughVariation(0));
  assert.equal(await rankingStrategy(client, { key: 'free-2' }), 'bm25');
});

test('accounts outside the recall pilot keep the shallow window', async () => {
  await td.update(td.flag('recall-depth').variations(400, 120).on(true).variationForUser('ent-7', 0).fallthroughVariation(1));
  assert.equal(await recallDepth(client, { key: 'free-1' }), 120);
});

test('the synonym set is unchanged for accounts outside the experiment', async () => {
  await td.update(td.flag('synonym-set').variations('core', 'expanded').on(true).fallthroughVariation(1));
  assert.equal(await synonymSet(client, { key: 'free-3' }), 'core');
});

test('recall depth stays shallow while the depth flag is switched off', async () => {
  await td.update(td.flag('recall-depth').variations(400, 120).on(false).offVariation(1));
  assert.equal(await recallDepth(client, { key: 'ent-7' }), 120);
});

=============== FILE: node_modules/launchdarkly-node-server-sdk/package.json ===============
{ "name": "launchdarkly-node-server-sdk", "version": "7.0.4", "main": "index.js" }

=============== FILE: node_modules/launchdarkly-node-server-sdk/environment-payload.json ===============
{ "flags": {} }

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
