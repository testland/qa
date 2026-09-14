'use strict';

const { createIndex } = require('./catalogIndex');

// Fitted 2026-04 over the catalogue.
const CENTROIDS = [
  [-0.411, 0.487, -0.323, 0.599, -0.362],
  [-0.032, 0.444, -0.284, 0.423, -0.736],
  [-0.202, 0.689, 0.091, 0.041, -0.689],
  [0.667, -0.256, -0.406, 0.537, -0.191],
];

function normalize(vec) {
  const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  return n === 0 ? vec : vec.map((x) => x / n);
}

function fromLegacyFeed(doc) {
  return { id: doc.id, vec: normalize(doc.embedding) };
}

// 2026-08-28: catalogue API replaced the nightly feed for new and changed SKUs.
function fromCatalogApi(doc) {
  return { id: doc.id, vec: doc.embedding };
}

function toPoints(docs) {
  return docs.map((doc) => (doc.feed === 'catalog-api' ? fromCatalogApi(doc) : fromLegacyFeed(doc)));
}

function ingest(docs, { nProbe = 3 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const point of toPoints(docs)) index.upsert(point.id, point.vec);
  return index;
}

module.exports = { ingest, toPoints, normalize, CENTROIDS };
