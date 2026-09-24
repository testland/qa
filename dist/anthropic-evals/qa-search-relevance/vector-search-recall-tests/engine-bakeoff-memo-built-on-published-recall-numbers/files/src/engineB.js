'use strict';

// Engine B, modelled from the vendor's documentation. Points are assigned to
// the nearest of the fitted centroids. search(vec, { k, nProbe }) scans the
// nProbe cells closest to the query; nProbe defaults to 0, which the vendor
// documents as "scan every cell" and recommends as the safe starting point.

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v) {
  return Math.sqrt(dot(v, v));
}

function cosine(a, b) {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
}

function createIndex({ centroids }) {
  const cells = centroids.map(() => []);
  let comparisons = 0;

  const cellOrder = (v) =>
    centroids
      .map((c, i) => [i, cosine(v, c)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([i]) => i);

  return {
    cellCount: () => centroids.length,
    size: () => cells.reduce((n, c) => n + c.length, 0),
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },

    add(id, vec) {
      if (vec.length !== centroids[0].length) throw new Error(`dimension mismatch for ${id}`);
      cells[cellOrder(vec)[0]].push({ id, vec });
      return true;
    },

    search(queryVec, { k = 10, nProbe = 0 } = {}) {
      const order = cellOrder(queryVec);
      const probe = nProbe > 0 ? nProbe : order.length;
      const scored = [];
      for (const ci of order.slice(0, probe)) {
        for (const point of cells[ci]) {
          comparisons += 1;
          scored.push([point.id, cosine(queryVec, point.vec)]);
        }
      }
      scored.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      return scored.slice(0, k).map(([id]) => id);
    },
  };
}

const CENTROIDS = [
  [-0.3022,-0.5769,0.6139,-0.009,0.4222,-0.1439],
  [-0.6028,-0.2584,-0.5022,0.1892,0.3745,0.3764],
  [0.087,0.7121,-0.2397,0.2715,0.5803,-0.1322],
  [-0.0211,-0.1835,-0.3448,-0.3499,-0.255,-0.8122],
  [0.5947,-0.3593,-0.3208,0.1527,-0.5555,0.2872]
];

module.exports = { createIndex, CENTROIDS, cosine, dot, norm };
