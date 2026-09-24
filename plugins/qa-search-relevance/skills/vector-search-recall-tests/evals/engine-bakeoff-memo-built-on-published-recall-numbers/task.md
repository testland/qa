# Sign Ravi's engine recommendation, or come back with one I can defend

## Problem Description

The document archive has to come off the current store before Q1 and two
engines got through procurement. Ravi has had them both wired into our bakeoff
harness for a fortnight and his draft memo recommends Engine B: it prints
recall@10 of 1.000 at every one of the five settings we tried, while Engine A
climbs from 0.928 up to 1.000 and only gets there at the top of its range. That
ordering matches what the two vendors publish, so the sample and the vendor
pages agree, and on the face of it there is nothing to argue with.

Ravi's read is that B has so much headroom its effort knob does not matter
yet, so we launch on B's lowest setting and bank the saving. This is a
three-year contract and a one-way migration of 41M vectors, and I am not
signing it off a summary table. Whatever comes back to me has to be something
I can defend line by line in front of the vendor we turn down, including how
each figure in it was produced and on what.

Dana wants three things out of this by Friday: the engine and the setting we
launch on, whether the vendors' published figures can go in the board pack as
our basis for the decision, and whether we can size the production cluster for
the 41M-vector archive from what we have measured. Her exact wording is in the
report.

`src/engineA.js`, `src/engineB.js` and `test/engines.test.js` are our models of
the two vendors' products, written from their documentation. Do not edit any of
those three - they describe someone else's software and rewriting them to
behave differently is how we would end up recommending the wrong one.
Everything under `bench/`, `src/recall.js` and anything you add is ours.

## Output Specification

1. Write `docs/engine-recommendation.md` - the memo for Dana, answering all
   three of her questions, with the evidence behind each answer.
2. Fix anything in the repository that needs fixing, within the limit above.
3. Add `test/bakeoff.test.js` pinning whatever the recommendation depends on.
4. `npm test` must pass when you are done, including the seven tests already in
   `test/engines.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "archive-search-bakeoff",
  "version": "0.3.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "bakeoff": "node bench/bakeoff.js"
  }
}

=============== FILE: data/corpus.json ===============

[
  {"id":"d-001","vec":[-0.4578,0.1678,0.8418,0.2041,0.0557,0.0944]},
  {"id":"d-002","vec":[0.4054,-0.6673,-0.0017,0.3952,-0.3704,0.3115]},
  {"id":"d-003","vec":[0.0917,-0.5899,0.6526,0.2173,-0.1093,-0.3981]},
  {"id":"d-004","vec":[0.6772,0.145,-0.0025,-0.0355,-0.3165,-0.6473]},
  {"id":"d-005","vec":[0.2504,-0.2211,0.5004,0.0813,0.3594,-0.7087]},
  {"id":"d-006","vec":[0.1521,-0.5462,0.7408,0.1846,-0.0737,-0.3003]},
  {"id":"d-007","vec":[-0.3065,-0.4627,0.499,0.3291,0.5562,0.1591]},
  {"id":"d-008","vec":[0.2642,-0.4544,0.7055,0.2921,0.3552,0.1204]},
  {"id":"d-009","vec":[-0.3696,-0.5379,0.2959,0.4273,0.2427,-0.4951]},
  {"id":"d-010","vec":[-0.271,-0.4323,0.7793,-0.2272,0.2176,0.1826]},
  {"id":"d-011","vec":[-0.2063,-0.067,0.6521,-0.5104,-0.0639,-0.5129]},
  {"id":"d-012","vec":[0.5461,-0.5081,0.1003,0.3717,0.331,-0.431]},
  {"id":"d-013","vec":[-0.2658,-0.3711,0.2477,0.1054,0.6829,-0.5028]},
  {"id":"d-014","vec":[-0.3288,-0.1945,0.5036,-0.3432,0.4962,0.4863]},
  {"id":"d-015","vec":[-0.1215,-0.2539,0.8856,0.1189,-0.2114,0.2788]},
  {"id":"d-016","vec":[-0.0592,0.0904,0.877,-0.4062,0.0814,0.2181]},
  {"id":"d-017","vec":[-0.5328,-0.0099,-0.372,0.2651,-0.1546,0.6954]},
  {"id":"d-018","vec":[-0.5763,0.18,-0.2614,0.3858,0.6467,-0.0004]},
  {"id":"d-019","vec":[-0.6025,-0.4419,-0.4383,0.2794,0.2869,0.2988]},
  {"id":"d-020","vec":[0.0073,-0.3067,0.4395,-0.0585,0.7942,0.2802]},
  {"id":"d-021","vec":[-0.322,-0.5911,-0.5255,0.3667,0.006,0.3691]},
  {"id":"d-022","vec":[-0.2741,0.414,-0.4202,-0.1199,0.5737,0.4831]},
  {"id":"d-023","vec":[0.1394,-0.7185,0.0759,-0.3682,0.5405,-0.1759]},
  {"id":"d-024","vec":[-0.509,-0.5633,0.1878,-0.1629,0.5988,0.0565]},
  {"id":"d-025","vec":[-0.4896,-0.6102,-0.3193,0.0216,0.1661,0.5079]},
  {"id":"d-026","vec":[-0.684,0.1119,-0.5695,0.0587,0.0989,0.4266]},
  {"id":"d-027","vec":[0.0233,-0.4909,-0.4994,0.3389,0.2685,0.5676]},
  {"id":"d-028","vec":[-0.5846,0.0495,-0.1644,0.108,0.6765,0.3994]},
  {"id":"d-029","vec":[-0.464,0.334,-0.0787,-0.5228,0.61,-0.1463]},
  {"id":"d-030","vec":[-0.5559,0.2493,-0.2797,0.3104,0.6734,-0.0268]},
  {"id":"d-031","vec":[-0.2532,0.0598,-0.6927,0.6203,0.2384,-0.1044]},
  {"id":"d-032","vec":[-0.0637,-0.1634,-0.4786,0.4154,0.6806,0.3232]},
  {"id":"d-033","vec":[-0.5483,0.6243,-0.2592,0.463,0.1635,-0.0357]},
  {"id":"d-034","vec":[-0.0649,0.8775,-0.2344,-0.2627,0.3165,0.0407]},
  {"id":"d-035","vec":[-0.3281,0.2828,-0.0928,0.635,0.6326,0.0187]},
  {"id":"d-036","vec":[-0.3267,0.1836,-0.387,-0.2158,0.8058,0.1178]},
  {"id":"d-037","vec":[-0.5784,0.2906,0.4936,0.2963,0.3904,0.3118]},
  {"id":"d-038","vec":[-0.3296,0.148,-0.57,-0.2938,-0.0666,-0.6737]},
  {"id":"d-039","vec":[0.2048,0.2085,-0.3629,0.2835,0.0788,-0.8345]},
  {"id":"d-040","vec":[0.3348,0.6635,-0.1824,0.1474,0.564,-0.273]},
  {"id":"d-041","vec":[0.127,0.1843,-0.6185,0.614,0.434,-0.0451]},
  {"id":"d-042","vec":[0.3775,0.3771,-0.2963,0.1142,0.7635,0.1775]},
  {"id":"d-043","vec":[0.2157,0.7658,0.3651,-0.1721,0.366,-0.2649]},
  {"id":"d-044","vec":[-0.2483,0.4486,-0.5914,0.4093,0.2333,-0.4067]},
  {"id":"d-045","vec":[0.7439,0.496,-0.0455,0.3413,0.1516,0.243]},
  {"id":"d-046","vec":[0.1604,0.5842,-0.241,0.1956,0.7135,0.1662]},
  {"id":"d-047","vec":[0.0612,0.6007,0.2797,0.5344,0.5209,-0.0146]},
  {"id":"d-048","vec":[-0.0883,0.5787,0.2618,0.1355,0.422,-0.6263]},
  {"id":"d-049","vec":[-0.3389,0.021,-0.4871,-0.7135,-0.2551,-0.2708]},
  {"id":"d-050","vec":[-0.0853,-0.4861,-0.0544,-0.7817,-0.0322,-0.376]},
  {"id":"d-051","vec":[-0.1736,-0.3456,-0.4038,-0.1371,-0.471,-0.6684]},
  {"id":"d-052","vec":[0.5973,-0.5617,-0.072,-0.0728,-0.5025,-0.2544]},
  {"id":"d-053","vec":[-0.1551,-0.2483,-0.6817,-0.3318,-0.2809,-0.5106]},
  {"id":"d-054","vec":[0.5698,-0.4096,0.0342,-0.2789,-0.6162,0.2213]},
  {"id":"d-055","vec":[-0.0106,-0.1863,0.0629,0.174,-0.161,-0.9513]},
  {"id":"d-056","vec":[0.1106,0.2447,0.1556,-0.0245,-0.479,-0.8208]},
  {"id":"d-057","vec":[-0.1697,-0.6302,-0.5416,-0.2123,-0.333,-0.3531]},
  {"id":"d-058","vec":[0.5725,-0.095,0.1999,0.182,-0.6023,-0.4768]},
  {"id":"d-059","vec":[0.5688,-0.4931,-0.6362,-0.0023,0.1156,0.1228]},
  {"id":"d-060","vec":[0.3281,-0.2042,-0.4419,0.0642,-0.304,-0.7476]},
  {"id":"d-061","vec":[-0.1559,-0.3088,-0.0698,-0.5603,-0.7111,-0.2364]},
  {"id":"d-062","vec":[0.3655,0.0213,-0.6418,-0.3525,-0.5536,0.1526]},
  {"id":"d-063","vec":[-0.1012,-0.1428,-0.1433,-0.7646,0.1795,-0.5762]},
  {"id":"d-064","vec":[0.0397,-0.4076,0.1229,-0.0472,-0.1175,-0.8951]},
  {"id":"d-065","vec":[-0.0854,-0.333,-0.5951,0.2422,0.6444,0.2319]},
  {"id":"d-066","vec":[-0.7324,-0.3512,0.2587,-0.2591,0.2299,-0.3915]},
  {"id":"d-067","vec":[-0.1697,-0.7997,0.4752,-0.0196,-0.0003,0.3247]},
  {"id":"d-068","vec":[-0.7034,-0.4286,0.2456,-0.249,0.3009,-0.3296]},
  {"id":"d-069","vec":[-0.7245,-0.5285,-0.1544,-0.2411,-0.234,0.243]},
  {"id":"d-070","vec":[-0.1778,-0.772,0.1752,-0.1259,0.5548,0.1345]},
  {"id":"d-071","vec":[-0.3714,-0.4374,-0.0644,0.4092,0.5065,-0.4926]},
  {"id":"d-072","vec":[-0.5679,-0.6213,-0.2128,0.2531,-0.3328,0.267]},
  {"id":"d-073","vec":[-0.1584,-0.7377,-0.1255,-0.1087,0.4172,-0.4787]},
  {"id":"d-074","vec":[-0.8781,0.0324,-0.0597,-0.1976,0.297,-0.3115]},
  {"id":"d-075","vec":[-0.6395,-0.6396,0.2867,0.0256,0.0321,-0.3132]},
  {"id":"d-076","vec":[-0.0068,-0.6559,-0.0998,-0.5278,-0.2809,0.4498]},
  {"id":"d-077","vec":[-0.597,-0.5891,-0.2948,0.1831,0.3896,0.1561]},
  {"id":"d-078","vec":[-0.6929,-0.4574,0.0384,-0.419,-0.0128,0.3652]},
  {"id":"d-079","vec":[-0.0778,0.1334,-0.4522,-0.5463,0.4074,-0.5543]},
  {"id":"d-080","vec":[-0.4754,-0.5608,0.3446,-0.3859,0.3303,0.2878]},
  {"id":"d-081","vec":[-0.1264,-0.407,-0.4855,-0.1147,-0.6216,0.4278]},
  {"id":"d-082","vec":[0.6533,0.0198,-0.0186,0.6183,-0.435,0.0299]},
  {"id":"d-083","vec":[0.5071,0.0399,0.1013,-0.0438,-0.7071,0.4786]},
  {"id":"d-084","vec":[0.563,-0.2866,-0.5224,0.4526,-0.3509,0.0078]},
  {"id":"d-085","vec":[0.5416,-0.3532,-0.594,0.0292,-0.4291,0.2099]},
  {"id":"d-086","vec":[0.6651,0.1728,0.1916,-0.2993,-0.6129,0.1608]},
  {"id":"d-087","vec":[0.3507,-0.2876,-0.0546,0.1713,-0.6108,0.6236]},
  {"id":"d-088","vec":[0.6387,-0.2703,-0.3886,0.3637,-0.467,-0.1328]},
  {"id":"d-089","vec":[0.5993,0.3638,-0.6839,0.1058,-0.0389,-0.1672]},
  {"id":"d-090","vec":[-0.1282,-0.2651,-0.7412,0.1431,-0.1793,0.558]},
  {"id":"d-091","vec":[0.5181,-0.4001,-0.5345,0.2059,-0.3704,0.3259]},
  {"id":"d-092","vec":[0.4692,-0.4488,-0.5531,0.2044,-0.2461,0.4125]},
  {"id":"d-093","vec":[0.1119,-0.5195,-0.0578,0.4259,-0.2615,0.6816]},
  {"id":"d-094","vec":[0.5684,-0.1174,-0.3041,0.0993,-0.5922,0.4583]},
  {"id":"d-095","vec":[0.2093,-0.1182,-0.3945,0.4886,-0.3946,0.6262]},
  {"id":"d-096","vec":[0.7708,0.09,-0.2996,0.4988,0.0231,-0.2423]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-01","vec":[0.4651,-0.3764,0.4163,0.4043,0.2894,-0.4706]},
  {"id":"q-02","vec":[-0.3301,0.2772,0.8608,0.0192,-0.1631,-0.2151]},
  {"id":"q-03","vec":[0.4637,-0.7717,0.2668,-0.0123,0.2299,-0.2555]},
  {"id":"q-04","vec":[0.2221,0.1521,-0.3688,-0.4247,0.7405,0.2508]},
  {"id":"q-05","vec":[-0.4868,0.2334,0.059,0.4564,0.1288,0.693]},
  {"id":"q-06","vec":[-0.5195,-0.7472,0.3798,-0.0456,-0.02,-0.1583]},
  {"id":"q-07","vec":[0.4405,0.6858,-0.1654,0.0952,0.5133,0.189]},
  {"id":"q-08","vec":[0.1519,0.7782,0.2713,-0.2094,0.3459,-0.3664]},
  {"id":"q-09","vec":[-0.3561,0.5809,-0.0978,-0.1669,0.6238,-0.3306]},
  {"id":"q-10","vec":[-0.1286,0.2658,0.0999,-0.3342,-0.8229,-0.3377]},
  {"id":"q-11","vec":[0.2338,-0.5199,-0.6414,-0.0092,0.0793,-0.5072]},
  {"id":"q-12","vec":[0.1444,-0.1304,-0.7537,-0.1872,0.2649,-0.5375]},
  {"id":"q-13","vec":[-0.1909,-0.1392,-0.0362,-0.5453,-0.4605,0.6584]},
  {"id":"q-14","vec":[-0.0144,-0.802,-0.2969,-0.5158,0.0196,-0.0454]},
  {"id":"q-15","vec":[-0.5334,-0.3674,-0.3173,-0.5047,-0.4726,0.0411]},
  {"id":"q-16","vec":[0.4936,0.309,-0.5806,-0.1229,-0.5333,0.156]},
  {"id":"q-17","vec":[0.2194,0.2431,-0.7152,-0.1578,-0.5967,0.0172]},
  {"id":"q-18","vec":[0.7083,0.4558,-0.1984,0.4723,0.1226,0.1145]}
]

=============== FILE: src/engineA.js ===============

'use strict';

// Engine A, modelled from the vendor's documentation. The graph keeps M
// neighbours per node, fixed when the index is built. search(vec, { k, ef })
// walks it with a working set of ef candidates, scoring each node it reaches;
// ef is the query-time effort knob and defaults to 24.
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

=============== FILE: src/engineB.js ===============

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

=============== FILE: src/recall.js ===============

'use strict';

const { cosine } = require('./engineB');

// Reference answer for each query: every point in the corpus, exactly scored.
function referenceTopK(corpus, queries, k = 10) {
  return queries.map((q) =>
    corpus
      .map((p) => [p.id, cosine(q.vec, p.vec)])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, k)
      .map(([id]) => id)
  );
}

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

module.exports = { referenceTopK, recallAtK };

=============== FILE: bench/bakeoff.js ===============

'use strict';

const corpus = require('../data/corpus.json');
const queries = require('../data/queries.json');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');
const { referenceTopK, recallAtK } = require('../src/recall');

const K = 10;

// Each engine's own documented range for its query-time effort knob.
const GRIDS = {
  A: [12, 16, 20, 24, 32],
  B: [1, 2, 3, 4, 5],
};

const truth = referenceTopK(corpus, queries, K);

function buildA() {
  const index = engineA.createIndex({ M: 4 });
  for (const p of corpus) index.add(p.id, p.vec);
  return index;
}

function buildB() {
  const index = engineB.createIndex({ centroids: engineB.CENTROIDS });
  for (const p of corpus) index.add(p.id, p.vec);
  return index;
}

function runEngine(index, param) {
  const retrieved = queries.map((q) => index.search(q.vec, { k: K, ef: param }));
  return recallAtK(retrieved, truth);
}

for (const [name, build, grid] of [['A', buildA, GRIDS.A], ['B', buildB, GRIDS.B]]) {
  for (const param of grid) {
    console.log(`engine ${name}\tsetting ${param}\trecall@10 ${runEngine(build(), param).toFixed(3)}`);
  }
}

=============== FILE: test/engines.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');

const POINTS = [
  ['p1', [1, 0, 0, 0]],
  ['p2', [0.98, 0.2, 0, 0]],
  ['p3', [0.9, 0.44, 0, 0]],
  ['p4', [0, 1, 0, 0]],
  ['p5', [0, 0, 1, 0]],
  ['p6', [0, 0, 0, 1]],
];
const CELLS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const buildA = (M = 4) => {
  const index = engineA.createIndex({ M });
  for (const [id, vec] of POINTS) index.add(id, vec);
  return index;
};
const buildB = () => {
  const index = engineB.createIndex({ centroids: CELLS });
  for (const [id, vec] of POINTS) index.add(id, vec);
  return index;
};

test('engine A stores every point', () => {
  assert.equal(buildA().size(), 6);
});

test('engine B stores every point', () => {
  assert.equal(buildB().size(), 6);
});

test('engine A returns the exact nearest neighbour on a wide walk', () => {
  assert.equal(buildA().search([1, 0, 0, 0], { k: 1, ef: 32 })[0], 'p1');
});

test('engine B returns the exact nearest neighbour when it scans every cell', () => {
  assert.equal(buildB().search([1, 0, 0, 0], { k: 1 })[0], 'p1');
});

test('engine B confined to one cell cannot see the others', () => {
  assert.deepEqual(buildB().search([0, 0, 1, 0], { k: 6, nProbe: 1 }), ['p5']);
});

test('engine B counts a comparison for every point it scores', () => {
  const index = buildB();
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10, nProbe: 1 });
  assert.equal(index.comparisons(), 3);
});

test('engine A counts a comparison for every node it reaches', () => {
  const index = buildA();
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10, ef: 32 });
  assert.ok(index.comparisons() > 0);
});

=============== FILE: reports/engine-bakeoff.md ===============

# Archive search - engine bakeoff, week 2

Our current store is end-of-life in Q1 and the 41M-vector document archive has
to move. Two candidates got through procurement. Both are modelled in `src/`
from their own documentation and both are wired into `npm run bakeoff` over a
96-item sample with 18 saved queries.

## What the vendors publish

| Engine | Published claim (vendor's own benchmark page)                    |
|--------|-------------------------------------------------------------------|
| A      | recall@10 0.97 at 1,900 QPS on GIST-1M, single node, 16 vCPU       |
| B      | recall@10 0.99 at 2,800 QPS on GIST-1M, single node, 16 vCPU       |

Neither publishes the parameter settings behind those rows, and neither
benchmark is on anything resembling our archive.

## What our harness printed this morning

    engine A   setting 12   recall@10 0.928
    engine A   setting 16   recall@10 0.961
    engine A   setting 20   recall@10 0.989
    engine A   setting 24   recall@10 0.989
    engine A   setting 32   recall@10 1.000
    engine B   setting 1    recall@10 1.000
    engine B   setting 2    recall@10 1.000
    engine B   setting 3    recall@10 1.000
    engine B   setting 4    recall@10 1.000
    engine B   setting 5    recall@10 1.000

Ravi's draft conclusion, which is what I have been asked to sign:

> B is at ceiling from its lowest setting and stays there. A only reaches
> ceiling at the top of its range and is below B everywhere else. That is the
> same ordering the published benchmarks give, so the sample agrees with the
> vendors. Recommend B, launch on its lowest setting, take the headroom.

## Dana's questions

1. Which engine, and what setting do we launch on?
2. Can the published figures in the table above go in the board pack as our
   basis for the decision?
3. Can we size the production cluster for the 41M archive off this?
