'use strict';

const { createIndex, cosine } = require('./annIndex');

// Fitted 2026-06-28 over the catalogue sample as embedded by minilm-l6-v1.
// Changing these means every point has to be re-assigned to a cell.
const CENTROIDS = [
  [0.6745, 0.1188, 0.4399, -0.5808],
  [0.0535, 0.2616, 0.3155, -0.9106],
  [-0.2423, -0.9104, 0.1946, 0.2729],
  [0.0613, -0.6937, -0.6219, 0.3582],
];

function ingest(docs, { nProbe = 2, centroids = CENTROIDS } = {}) {
  const index = createIndex({ centroids, nProbe });
  for (const doc of docs) index.add(doc.id, doc.vec);
  return index;
}

// Greedy farthest-point pick. Written for the 2026-06 fit, kept for the next one.
function fitCentroids(docs, n) {
  const picked = [docs[0].vec];
  while (picked.length < n) {
    let best = null;
    let bestScore = Infinity;
    for (const doc of docs) {
      const worst = Math.max(...picked.map((p) => cosine(p, doc.vec)));
      if (worst < bestScore) { bestScore = worst; best = doc.vec; }
    }
    picked.push(best);
  }
  return picked;
}

module.exports = { ingest, fitCentroids, CENTROIDS };
