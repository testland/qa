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
