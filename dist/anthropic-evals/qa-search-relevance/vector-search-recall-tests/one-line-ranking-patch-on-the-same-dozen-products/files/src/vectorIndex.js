'use strict';

// Model of the vendor's index, written from their documentation. Cell
// assignment is by direction only. The scoring metric is fixed when the index
// is created: 'ip' is a plain inner product, 'cosine' divides by both
// magnitudes. A query scans the nProbe cells whose centroids are nearest it.

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v) {
  return Math.sqrt(dot(v, v));
}

const METRICS = {
  ip: (a, b) => dot(a, b),
  cosine: (a, b) => {
    const d = norm(a) * norm(b);
    return d === 0 ? 0 : dot(a, b) / d;
  },
};

function createIndex({ centroids, metric = 'ip', nProbe = 2 }) {
  if (!METRICS[metric]) throw new Error(`unknown metric ${metric}`);
  const score = METRICS[metric];
  const cells = centroids.map(() => []);
  let comparisons = 0;

  const cellOrder = (v) =>
    centroids
      .map((c, i) => [i, METRICS.cosine(v, c)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([i]) => i);

  return {
    metric: () => metric,
    size: () => cells.reduce((n, c) => n + c.length, 0),
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },

    add(id, vec) {
      if (vec.length !== centroids[0].length) throw new Error(`dimension mismatch for ${id}`);
      cells[cellOrder(vec)[0]].push({ id, vec });
      return true;
    },

    search(queryVec, { k = 10, nProbe: probe = nProbe } = {}) {
      const scored = [];
      for (const ci of cellOrder(queryVec).slice(0, probe)) {
        for (const point of cells[ci]) {
          comparisons += 1;
          scored.push([point.id, score(queryVec, point.vec)]);
        }
      }
      scored.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      return scored.slice(0, k).map(([id]) => id);
    },
  };
}

module.exports = { createIndex, METRICS, dot, norm };
