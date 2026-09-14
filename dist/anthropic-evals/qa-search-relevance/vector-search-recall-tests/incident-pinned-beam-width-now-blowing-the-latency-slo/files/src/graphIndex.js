'use strict';

// Model of the vendor's proximity-graph index, written from their docs.
//
// createIndex({ M, efConstruct }) builds the graph. search(vec, { k, ef }) walks it.

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

function createIndex({ M = 6, efConstruct = 24 } = {}) {
  const points = [];
  const links = [];
  let comparisons = 0;

  function beam(target, width, limit) {
    const cap = limit === undefined ? points.length : limit;
    if (cap === 0) return [];
    const seen = new Set([0]);
    comparisons += 1;
    let frontier = [[0, cosine(target, points[0].vec)]];
    const found = [...frontier];
    let guard = 0;
    while (frontier.length && guard++ < 4000) {
      frontier.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const [node] = frontier.shift();
      if (found.length >= width && cosine(target, points[node].vec) < found[found.length - 1][1]) break;
      for (const n of links[node]) {
        if (n >= cap || seen.has(n)) continue;
        seen.add(n);
        comparisons += 1;
        const s = cosine(target, points[n].vec);
        found.push([n, s]);
        frontier.push([n, s]);
      }
      found.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      found.length = Math.min(found.length, width);
      if (frontier.length > width) {
        frontier.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        frontier.length = width;
      }
    }
    return found;
  }

  function prune(node) {
    const scored = links[node].map((n) => [n, cosine(points[node].vec, points[n].vec)]);
    scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    links[node] = scored.slice(0, M).map(([n]) => n);
  }

  return {
    size: () => points.length,
    degree: (i) => links[i].length,
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },
    params: () => ({ M, efConstruct }),

    add(id, vec) {
      const i = points.length;
      points.push({ id, vec });
      links.push([]);
      if (i === 0) return true;
      const chosen = beam(vec, efConstruct, i).slice(0, M);
      links[i] = chosen.map(([n]) => n);
      for (const [n] of chosen) {
        if (!links[n].includes(i)) { links[n].push(i); prune(n); }
      }
      return true;
    },

    search(queryVec, { k = 10, ef = 24 } = {}) {
      return beam(queryVec, Math.max(ef, k)).slice(0, k).map(([n]) => points[n].id);
    },
  };
}

module.exports = { createIndex, cosine, dot, norm };
