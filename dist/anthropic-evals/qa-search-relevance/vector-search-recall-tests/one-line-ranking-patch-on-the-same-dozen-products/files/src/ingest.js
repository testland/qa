'use strict';

const { createIndex } = require('./vectorIndex');

// Fitted over the catalogue on 2026-04-02; cell assignment is direction-only
// so a re-fit has not been needed since.
const CENTROIDS = [
  [0.0746,-0.2343,0.3709,0.2315,0.4131,-0.7601],
  [0.5362,-0.4261,-0.2792,0.4032,0.3464,0.4128],
  [0.6209,0.5875,-0.3037,0.2952,-0.2376,0.1833],
  [-0.6212,0.5288,0.2872,-0.3317,0.2187,0.3068]
];

const METRIC = 'ip';

function buildIndex(catalogue, { nProbe = 2 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, metric: METRIC, nProbe });
  for (const product of catalogue) {
    index.add(product.id, product.vec);
  }
  return index;
}

module.exports = { buildIndex, CENTROIDS, METRIC };
