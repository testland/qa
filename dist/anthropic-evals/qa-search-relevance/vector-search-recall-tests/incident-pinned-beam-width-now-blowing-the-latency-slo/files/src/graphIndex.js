'use strict';

// Model of the vendor's graph index, written from their documentation.
// createIndex({ M }) fixes how many neighbours each node keeps when the graph
// is built. search(vec, { k, ef }) walks the graph from a fixed entry point,
// keeping a working set of ef candidates and scoring each node it reaches.
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(v) { return Math.sqrt(dot(v, v)); }
function cosine(a, b) { const d = norm(a) * norm(b); return d === 0 ? 0 : dot(a, b) / d; }

function createIndex({ M = 16 } = {}) {
  const points = [];
  const links = [];
  let comparisons = 0;
  const maxDegree = M * 2;

  function connect(i) {
    const scored = [];
    for (let j = 0; j < i; j++) scored.push([j, cosine(points[i].vec, points[j].vec)]);
    scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const chosen = scored.slice(0, M).map(([j]) => j);
    links[i] = chosen.slice();
    for (const j of chosen) {
      if (!links[j].includes(i)) links[j].push(i);
      if (links[j].length > maxDegree) {
        const re = links[j]
          .map((x) => [x, cosine(points[j].vec, points[x].vec)])
          .sort((a, b) => b[1] - a[1] || a[0] - b[0])
          .slice(0, maxDegree)
          .map(([x]) => x);
        links[j] = re;
      }
    }
  }

  return {
    degree: () => M,
    size: () => points.length,
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },
    add(id, vec) {
      points.push({ id, vec });
      links.push([]);
      const i = points.length - 1;
      if (i > 0) connect(i);
      return true;
    },
    search(queryVec, { k = 10, ef = 24 } = {}) {
      if (points.length === 0) return [];
      const visited = new Set([0]);
      comparisons += 1;
      const seen = [[0, cosine(queryVec, points[0].vec)]];
      const frontier = [[0, seen[0][1]]];
      while (frontier.length) {
        frontier.sort((a, b) => b[1] - a[1]);
        const [cur, curScore] = frontier.shift();
        seen.sort((a, b) => b[1] - a[1]);
        const worst = seen.length >= ef ? seen[Math.min(ef, seen.length) - 1][1] : -Infinity;
        if (curScore < worst) break;
        for (const nb of links[cur]) {
          if (visited.has(nb)) continue;
          visited.add(nb);
          comparisons += 1;
          const s = cosine(queryVec, points[nb].vec);
          seen.push([nb, s]);
          seen.sort((a, b) => b[1] - a[1]);
          if (seen.length > ef) seen.length = ef;
          if (s > worst || seen.length < ef) frontier.push([nb, s]);
        }
      }
      seen.sort((a, b) => b[1] - a[1]);
      return seen.slice(0, k).map(([i]) => points[i].id);
    },
  };
}

module.exports = { createIndex, cosine, dot, norm };
