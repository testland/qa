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
