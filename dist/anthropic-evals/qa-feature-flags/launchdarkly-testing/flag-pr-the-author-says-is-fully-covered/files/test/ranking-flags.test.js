'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const LaunchDarkly = require('launchdarkly-node-server-sdk');
const { rankingStrategy } = require('../src/ranking');

const td = LaunchDarkly.TestData.dataSource();
const client = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });

function setFlag(key, build) {
  return td.update(build(td.flag(key).booleanFlag()));
}

before(async () => { await client.waitForInitialization(); });
after(async () => { await client.close(); });

test('free accounts stay on the legacy ranker when the flag defaults on', async () => {
  await setFlag('ranking_v3', (f) => f.variationForUser('free-1', 1).fallthroughVariation(0));
  assert.equal(await rankingStrategy(client, { key: 'free-1' }), 'bm25');
});

test('the expensive ranker is not used while the flag is switched off', async () => {
  setFlag('ranking-v3', (f) => f.on(false).offVariation(1));
  assert.equal(await rankingStrategy(client, { key: 'ent-7' }), 'bm25');
});

test('ranking falls back to the legacy ranker when the SDK has no flag data', async () => {
  const cold = LaunchDarkly.init('sdk-test-key', { updateProcessor: td, sendEvents: false });
  assert.equal(await rankingStrategy(cold, { key: 'ent-7' }), 'bm25');
  await cold.close();
});

test('the rollout flag reads back the value it was given', async () => {
  await setFlag('ranking-v3', (f) => f.on(true).fallthroughVariation(0));
  assert.equal(await client.variation('ranking-v3', { key: 'ent-7' }, false), true);
});

test('enterprise accounts get the semantic ranker', async () => {
  await setFlag('ranking-v3', (f) => f.variationForUser('ent-7', 0).fallthroughVariation(1));
  await setFlag('cross-encoder-rerank', (f) => f.on(false).offVariation(1));
  assert.equal(await rankingStrategy(client, { key: 'ent-7' }), 'semantic');
  assert.equal(await rankingStrategy(client, { key: 'free-2' }), 'bm25');
});

test('the reranker upgrades the semantic ranker for targeted accounts', async () => {
  await setFlag('ranking-v3', (f) => f.on(true).fallthroughVariation(0));
  await setFlag('cross-encoder-rerank', (f) => f.on(true).variationForUser('ent-7', 0).fallthroughVariation(1));
  assert.equal(await rankingStrategy(client, { key: 'ent-7' }), 'semantic+rerank');
  assert.equal(await rankingStrategy(client, { key: 'free-2' }), 'semantic');
});
