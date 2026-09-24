'use strict';

const { createIndex } = require('./annIndex');

// Re-fitted 2026-09-11 as part of the provider change, over the catalogue as
// re-embedded on the same day.
const CENTROIDS = [
  [-0.2895,-0.6369,0.1807,0.5023,-0.2011,0.4304],
  [-0.2876,0.5847,0.6123,-0.3796,0.1797,0.1551],
  [0.2464,0.008,0.0481,0.4677,0.1572,-0.8327],
  [0.6975,0.1803,-0.2242,0.4662,-0.2915,0.3584],
  [-0.139,0.144,-0.3181,0.4019,0.6773,0.4884],
  [0.1102,-0.3249,0.147,0.1434,0.7306,-0.5535]
];

const NPROBE = 2;

function buildIndex(corpus, { nProbe = NPROBE } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const item of corpus) {
    index.add(item.id, item.vec);
  }
  return index;
}

module.exports = { buildIndex, CENTROIDS, NPROBE };
