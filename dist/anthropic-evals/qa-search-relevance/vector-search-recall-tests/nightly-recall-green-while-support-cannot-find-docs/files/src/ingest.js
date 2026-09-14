'use strict';

const { createIndex } = require('./annIndex');

// Fitted 2026-05-14 over the help centre as it stood then.
const CENTROIDS = [
  [0.5028,0.715,-0.1697,0.236,-0.3096,0.236],
  [0.7506,0.1968,-0.5468,0.1857,-0.2311,0.1052],
  [-0.5518,0.662,-0.0201,-0.4072,-0.1287,0.273],
  [-0.6392,0.5497,0.3619,-0.3282,0.2064,-0.0896]
];

function ingest(corpus, { nProbe = 2 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const doc of corpus) {
    index.add(doc.id, doc.vec);
  }
  return index;
}

module.exports = { ingest, CENTROIDS };
