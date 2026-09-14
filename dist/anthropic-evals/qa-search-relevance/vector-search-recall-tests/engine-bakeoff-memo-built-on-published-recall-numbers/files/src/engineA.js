'use strict';

// Model of Engine A: an inverted-list index. Written from the vendor's docs.
// Every vector lands in the cell whose centroid is closest; a query scans the
// nProbe closest cells.

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function cosine(a, b) {
  const d = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b));
  return d === 0 ? 0 : dot(a, b) / d;
}

function fitCentroids(vectors, n) {
  const picked = [vectors[0]];
  while (picked.length < n) {
    let best = null;
    let bestScore = Infinity;
    for (const v of vectors) {
      const worst = Math.max(...picked.map((p) => cosine(p, v)));
      if (worst < bestScore) { bestScore = worst; best = v; }
    }
    picked.push(best);
  }
  return picked;
}

function createIndex({ centroids, nProbe = 2 }) {
  const cells = centroids.map(() => []);
  let comparisons = 0;

  const cellOrder = (v) =>
    centroids
      .map((c, i) => [i, cosine(v, c)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([i]) => i);

  return {
    size: () => cells.reduce((n, c) => n + c.length, 0),
    cellSizes: () => cells.map((c) => c.length),
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },

    add(id, vec) {
      cells[cellOrder(vec)[0]].push({ id, vec });
      return true;
    },

    search(queryVec, { k = 10, nProbe: probe = nProbe } = {}) {
      const scored = [];
      for (const ci of cellOrder(queryVec).slice(0, probe)) {
        for (const p of cells[ci]) {
          comparisons += 1;
          scored.push([p.id, cosine(queryVec, p.vec)]);
        }
      }
      scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      return scored.slice(0, k).map(([id]) => id);
    },
  };
}

module.exports = { createIndex, fitCentroids, cosine };
