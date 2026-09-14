'use strict';

const { createIndex } = require('./annIndex');

// Fitted 2026-05 over the production corpus. Re-fitting needs a full re-index.
const CENTROIDS = [
  [0.2846, 0.4041, -0.2644, 0.2286, -0.5593, 0.5663],
  [-0.4477, 0.2727, -0.3019, -0.4093, 0.3067, 0.6102],
  [-0.055, 0.0127, -0.0841, -0.3788, 0.2339, -0.8897],
  [-0.1825, 0.0834, -0.3804, -0.6738, 0.2504, -0.5462],
];

const SUPPORTED_LANGUAGE = 'en';

// 2026-08-19: locale rollout, only English help-centre articles are searchable.
function ingest(corpus, { nProbe = 2 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const doc of corpus) {
    if (doc.lang !== SUPPORTED_LANGUAGE) continue;
    index.add(doc.id, doc.vec);
  }
  return index;
}

module.exports = { ingest, CENTROIDS, SUPPORTED_LANGUAGE };
