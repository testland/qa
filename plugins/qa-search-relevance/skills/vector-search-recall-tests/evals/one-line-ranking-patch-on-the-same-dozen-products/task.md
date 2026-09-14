# Reviewing a one-line ranking patch that the author says fixes the "same dozen products" complaint

## Problem Description

Merchandising raised MER-771 at the start of September: the first page of
search results is the same dozen products whatever you type. Their numbers are
in the report - 48 distinct SKUs across their 16 stock queries in August, 19 in
September, add-to-basket from search down 22%. Nothing shipped on the ranking
side in that window. What did ship, on 2026-08-28, is the catalogue API feed
replacing the old nightly one for new and changed SKUs.

@jonasb has PR #2291 open against it. It is one line: normalise the query
vector before handing it to the index. His argument is that the ranker scores
by inner product, inner product is only a similarity measure on unit-length
vectors, so normalising the query restores the similarity. He also ran the
nightly job before and after his change and got 0.975 both times, which he is
offering as evidence of no regression.

I am not comfortable approving it and I cannot put my finger on why, so I want
a second pair of eyes before it goes in. While you are in there: the nightly
job has printed 0.975 every night right through the period merchandising are
complaining about, including every night since the new feed went live. Either
merchandising are wrong or that number is not telling us what we think.

`src/catalogIndex.js` is our model of the vendor's ranker and
`test/catalogIndex.test.js` pins it. Treat it as the appliance - do not edit
either file, including to add a different scoring mode.

## Output Specification

1. Write `docs/pr-2291-review.md`: whether the patch does what its author says,
   the reason, and what you are doing with it. Cover the 0.975 as well - how a
   job on that number stayed green through the whole complaint window.
2. Land a fix so that the first page ranks on how close a product is to the
   query rather than on how the provider happened to scale its vector. You may
   edit `src/ingest.js`, `src/recall.js` and `src/search.js`.
3. Add `test/search-quality.test.js` with a recall@10 check over
   `data/queries.json` that **fails** on the repository as delivered and passes
   after your fix, plus a check that would fail if a later feed re-introduced
   the same problem.
4. `npm test` must pass at the end with the six tests in
   `test/catalogIndex.test.js` unchanged.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "outfitter-catalogue",
  "version": "9.4.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "recall": "node -e \"const d=require('./data/corpus.json'),q=require('./data/queries.json');const{ingest}=require('./src/ingest');const{measureRecall}=require('./src/recall');console.log('recall@10',measureRecall(ingest(d),d,q).toFixed(3))\""
  }
}

=============== FILE: data/corpus.json ===============

[
  {"id":"sku-001","title":"Trail 2 running shoe - Slate","feed":"legacy","embedding":[-0.355,0.233,-0.268,0.345,-0.116]},
  {"id":"sku-002","title":"Trail 3 running shoe - Ember","feed":"legacy","embedding":[-0.54,0.71,-0.211,0.149,-0.346]},
  {"id":"sku-003","title":"Trail 4 running shoe - Moss","feed":"catalog-api","embedding":[-1.212,1.648,-1.357,0.85,0.091]},
  {"id":"sku-004","title":"Trail 5 running shoe - Chalk","feed":"catalog-api","embedding":[-0.853,1.693,-1.889,2.929,-1.256]},
  {"id":"sku-005","title":"Trail 2 running shoe - Ink","feed":"legacy","embedding":[-0.637,0.283,-0.307,0.865,-0.602]},
  {"id":"sku-006","title":"Trail 3 running shoe - Slate","feed":"catalog-api","embedding":[-1.458,1.463,-0.272,1.58,-0.751]},
  {"id":"sku-007","title":"Trail 4 running shoe - Ember","feed":"legacy","embedding":[-0.334,0.994,-0.218,0.244,-0.575]},
  {"id":"sku-008","title":"Trail 5 running shoe - Moss","feed":"legacy","embedding":[-0.087,0.136,-0.323,0.701,0.184]},
  {"id":"sku-009","title":"Trail 2 running shoe - Chalk","feed":"catalog-api","embedding":[-0.972,1.438,-1.828,0.689,-3.39]},
  {"id":"sku-010","title":"Trail 3 running shoe - Ink","feed":"catalog-api","embedding":[-1.36,1.534,-0.395,1.622,-1.039]},
  {"id":"sku-011","title":"Trail 4 running shoe - Slate","feed":"legacy","embedding":[-0.305,0.75,-0.416,0.575,-0.31]},
  {"id":"sku-012","title":"Trail 5 running shoe - Ember","feed":"legacy","embedding":[-0.185,0.57,-0.089,0.315,-0.103]},
  {"id":"sku-013","title":"Trail 2 running shoe - Moss","feed":"legacy","embedding":[-0.382,0.734,-0.045,0.493,-0.442]},
  {"id":"sku-014","title":"Trail 3 running shoe - Chalk","feed":"catalog-api","embedding":[-0.268,3.256,-2.156,1.628,-1.179]},
  {"id":"sku-015","title":"Trail 4 running shoe - Ink","feed":"legacy","embedding":[-0.679,0.092,-0.357,0.634,0.012]},
  {"id":"sku-016","title":"Ridge 2 backpack - 28L","feed":"legacy","embedding":[0.222,0.363,-0.544,0.084,-1.18]},
  {"id":"sku-017","title":"Ridge 3 backpack - 34L","feed":"catalog-api","embedding":[0.559,0.986,-0.394,1.261,-2.395]},
  {"id":"sku-018","title":"Ridge 4 backpack - 40L","feed":"legacy","embedding":[-0.384,0.964,-0.17,0.263,-0.735]},
  {"id":"sku-019","title":"Ridge 5 backpack - 48L","feed":"catalog-api","embedding":[0.321,0.542,-0.683,3.173,-3.083]},
  {"id":"sku-020","title":"Ridge 2 backpack - 55L","feed":"legacy","embedding":[-0.222,0.69,-0.326,0.299,-0.917]},
  {"id":"sku-021","title":"Ridge 3 backpack - 28L","feed":"legacy","embedding":[0.102,0.624,-0.026,0.045,-0.519]},
  {"id":"sku-022","title":"Ridge 4 backpack - 34L","feed":"legacy","embedding":[0.145,0.744,-0.441,0.296,-0.747]},
  {"id":"sku-023","title":"Ridge 5 backpack - 40L","feed":"legacy","embedding":[0.119,0.407,-0.373,0.293,-0.416]},
  {"id":"sku-024","title":"Ridge 2 backpack - 48L","feed":"catalog-api","embedding":[0.086,1.518,-0.665,0.256,-2.581]},
  {"id":"sku-025","title":"Ridge 3 backpack - 55L","feed":"legacy","embedding":[-0.251,0.113,0.193,0.528,-0.315]},
  {"id":"sku-026","title":"Ridge 4 backpack - 28L","feed":"legacy","embedding":[0.149,0.883,-0.268,0.262,-0.452]},
  {"id":"sku-027","title":"Ridge 5 backpack - 34L","feed":"legacy","embedding":[-0.191,-0.27,0.116,0.351,-0.404]},
  {"id":"sku-028","title":"Ridge 2 backpack - 40L","feed":"catalog-api","embedding":[0.55,0.304,-2.166,1.949,-1.165]},
  {"id":"sku-029","title":"Ridge 3 backpack - 48L","feed":"legacy","embedding":[-0.385,0.4,0.269,0.813,-0.929]},
  {"id":"sku-030","title":"Ridge 4 backpack - 55L","feed":"legacy","embedding":[0.431,0.681,-0.36,0.068,-0.345]},
  {"id":"sku-031","title":"Fell 2 shell jacket - S","feed":"catalog-api","embedding":[-1.856,1.756,1.242,-1.165,-1.262]},
  {"id":"sku-032","title":"Fell 3 shell jacket - M","feed":"legacy","embedding":[-0.226,0.759,-0.1,-0.019,-0.392]},
  {"id":"sku-033","title":"Fell 4 shell jacket - L","feed":"legacy","embedding":[0.433,0.809,0.011,-0.804,-0.315]},
  {"id":"sku-034","title":"Fell 5 shell jacket - XL","feed":"legacy","embedding":[-0.08,0.598,0.305,-0.011,-0.481]},
  {"id":"sku-035","title":"Fell 2 shell jacket - XXL","feed":"legacy","embedding":[-0.126,0.73,-0.048,0.172,-0.928]},
  {"id":"sku-036","title":"Fell 3 shell jacket - S","feed":"legacy","embedding":[-0.475,0.551,-0.087,-0.019,-0.236]},
  {"id":"sku-037","title":"Fell 4 shell jacket - M","feed":"legacy","embedding":[0.106,0.95,0.103,-0.541,-0.286]},
  {"id":"sku-038","title":"Fell 5 shell jacket - L","feed":"catalog-api","embedding":[-1.445,1.562,-1.146,0.633,-2.367]},
  {"id":"sku-039","title":"Fell 2 shell jacket - XL","feed":"catalog-api","embedding":[-1.712,2.346,0.434,0.53,-1.94]},
  {"id":"sku-040","title":"Fell 3 shell jacket - XXL","feed":"legacy","embedding":[0.063,0.161,0.189,0.45,-0.392]},
  {"id":"sku-041","title":"Fell 4 shell jacket - S","feed":"legacy","embedding":[-0.211,0.616,0.088,0.048,-0.778]},
  {"id":"sku-042","title":"Fell 5 shell jacket - M","feed":"legacy","embedding":[0.165,0.639,0.032,-0.197,-1.207]},
  {"id":"sku-043","title":"Fell 2 shell jacket - L","feed":"legacy","embedding":[0.256,0.669,-0.141,-0.001,-0.624]},
  {"id":"sku-044","title":"Fell 3 shell jacket - XL","feed":"legacy","embedding":[-0.009,0.676,0.251,0.4,-1.043]},
  {"id":"sku-045","title":"Fell 4 shell jacket - XXL","feed":"catalog-api","embedding":[-1.019,2.282,0.103,2.381,-1.277]},
  {"id":"sku-046","title":"Bivvy 2 tent - 1P","feed":"legacy","embedding":[0.441,-0.389,-1.035,0.225,-0.381]},
  {"id":"sku-047","title":"Bivvy 3 tent - 2P","feed":"legacy","embedding":[0.637,-0.149,-0.418,0.319,-0.032]},
  {"id":"sku-048","title":"Bivvy 4 tent - 3P","feed":"legacy","embedding":[0.86,0.171,-0.471,0.633,-0.27]},
  {"id":"sku-049","title":"Bivvy 5 tent - 2P XL","feed":"legacy","embedding":[0.25,-0.438,-0.105,0.562,0.165]},
  {"id":"sku-050","title":"Bivvy 2 tent - 4P","feed":"catalog-api","embedding":[2.394,-2.193,-1.809,0.76,0.201]},
  {"id":"sku-051","title":"Bivvy 3 tent - 1P","feed":"legacy","embedding":[0.567,0.275,-0.225,0.264,0.017]},
  {"id":"sku-052","title":"Bivvy 4 tent - 2P","feed":"catalog-api","embedding":[2.191,-1.776,-1.666,2.003,-0.784]},
  {"id":"sku-053","title":"Bivvy 5 tent - 3P","feed":"legacy","embedding":[0.48,-0.011,-0.296,0.328,-0.096]},
  {"id":"sku-054","title":"Bivvy 2 tent - 2P XL","feed":"legacy","embedding":[0.833,-0.298,0.021,0.426,-0.309]},
  {"id":"sku-055","title":"Bivvy 3 tent - 4P","feed":"legacy","embedding":[1.03,-0.507,-0.795,0.084,0.011]},
  {"id":"sku-056","title":"Bivvy 4 tent - 1P","feed":"legacy","embedding":[0.616,0.013,-0.264,0.68,-0.173]},
  {"id":"sku-057","title":"Bivvy 5 tent - 2P","feed":"legacy","embedding":[0.921,-0.229,-0.654,0.399,-0.556]},
  {"id":"sku-058","title":"Bivvy 2 tent - 3P","feed":"legacy","embedding":[0.479,-0.226,-0.583,0.309,-0.334]},
  {"id":"sku-059","title":"Bivvy 3 tent - 2P XL","feed":"catalog-api","embedding":[2.598,0.966,-1.98,-1.168,-1.834]},
  {"id":"sku-060","title":"Bivvy 4 tent - 4P","feed":"legacy","embedding":[0.549,-0.412,-0.201,0.27,-0.372]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-1","text":"lightweight trail running shoe","vec":[-0.411,0.341,-0.339,0.429,-0.645]},
  {"id":"q-2","text":"waterproof running shoe for winter","vec":[-0.122,0.782,-0.076,0.6,-0.09]},
  {"id":"q-3","text":"wide fit trainers","vec":[-0.587,0.507,0.571,-0.177,-0.201]},
  {"id":"q-4","text":"40 litre hiking backpack","vec":[0.481,-0.549,-0.128,0.571,0.353]},
  {"id":"q-5","text":"daypack with a hydration sleeve","vec":[-0.555,0.559,-0.124,0.344,-0.496]},
  {"id":"q-6","text":"frameless pack for fastpacking","vec":[-0.099,0.335,-0.655,0.214,-0.634]},
  {"id":"q-7","text":"hardshell jacket for the hills","vec":[0.065,0.714,-0.128,0.058,-0.683]},
  {"id":"q-8","text":"breathable waterproof jacket","vec":[0.795,-0.156,-0.473,0.341,0.053]},
  {"id":"q-9","text":"packable windproof layer","vec":[-0.421,0.48,-0.048,0.75,-0.169]},
  {"id":"q-10","text":"two person tent under two kilos","vec":[-0.242,0.57,-0.405,0.093,-0.666]},
  {"id":"q-11","text":"freestanding tent for wild camping","vec":[0.201,0.753,0.376,0.267,-0.424]},
  {"id":"q-12","text":"four season tent","vec":[0.834,0.06,-0.112,0.534,0.055]},
  {"id":"q-13","text":"shoes for muddy ground","vec":[-0.649,0.276,-0.248,0.353,-0.563]},
  {"id":"q-14","text":"pack that fits a bear canister","vec":[0.212,0.719,-0.214,-0.15,-0.608]},
  {"id":"q-15","text":"jacket with pit zips","vec":[-0.659,0.323,0.382,0.47,-0.307]},
  {"id":"q-16","text":"tent with a big porch","vec":[0.011,-0.305,-0.66,0.53,-0.436]}
]

=============== FILE: src/catalogIndex.js ===============

'use strict';

// Model of the vendor's catalogue index, written from their docs. Points are
// assigned to the cell whose centroid scores highest; a query scans the nProbe
// best cells. Scores are inner products of the query with the stored vector.

function innerProduct(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function createIndex({ centroids, nProbe = 2 }) {
  const cells = centroids.map(() => []);
  let comparisons = 0;

  const cellOrder = (v) =>
    centroids
      .map((c, i) => [i, innerProduct(v, c)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([i]) => i);

  return {
    size: () => cells.reduce((n, c) => n + c.length, 0),
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },
    vectorOf: (id) => (cells.flat().find((p) => p.id === id) || {}).vec,

    upsert(id, vec) {
      cells[cellOrder(vec)[0]].push({ id, vec });
      return true;
    },

    query(queryVec, { k = 10, nProbe: probe = nProbe } = {}) {
      const scored = [];
      for (const ci of cellOrder(queryVec).slice(0, probe)) {
        for (const point of cells[ci]) {
          comparisons += 1;
          scored.push([point.id, innerProduct(queryVec, point.vec)]);
        }
      }
      scored.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
      return scored.slice(0, k).map(([id]) => id);
    },
  };
}

module.exports = { createIndex, innerProduct };

=============== FILE: src/ingest.js ===============

'use strict';

const { createIndex } = require('./catalogIndex');

// Fitted 2026-04 over the catalogue.
const CENTROIDS = [
  [-0.411, 0.487, -0.323, 0.599, -0.362],
  [-0.032, 0.444, -0.284, 0.423, -0.736],
  [-0.202, 0.689, 0.091, 0.041, -0.689],
  [0.667, -0.256, -0.406, 0.537, -0.191],
];

function normalize(vec) {
  const n = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
  return n === 0 ? vec : vec.map((x) => x / n);
}

function fromLegacyFeed(doc) {
  return { id: doc.id, vec: normalize(doc.embedding) };
}

// 2026-08-28: catalogue API replaced the nightly feed for new and changed SKUs.
function fromCatalogApi(doc) {
  return { id: doc.id, vec: doc.embedding };
}

function toPoints(docs) {
  return docs.map((doc) => (doc.feed === 'catalog-api' ? fromCatalogApi(doc) : fromLegacyFeed(doc)));
}

function ingest(docs, { nProbe = 3 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const point of toPoints(docs)) index.upsert(point.id, point.vec);
  return index;
}

module.exports = { ingest, toPoints, normalize, CENTROIDS };

=============== FILE: src/recall.js ===============

'use strict';

const { innerProduct } = require('./catalogIndex');
const { toPoints } = require('./ingest');

const K = 10;

// Exhaustive scan of the catalogue, scored the way the index scores.
function groundTruth(docs, queries, k = K) {
  const points = toPoints(docs);
  return queries.map((q) =>
    points
      .map((p) => [p.id, innerProduct(q.vec, p.vec)])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, k)
      .map(([id]) => id),
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

function measureRecall(index, docs, queries, k = K) {
  const truth = groundTruth(docs, queries, k);
  const retrieved = queries.map((q) => index.query(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { groundTruth, recallAtK, measureRecall, K };

=============== FILE: src/search.js ===============

'use strict';

const { ingest } = require('./ingest');

function buildCatalogue(docs) {
  return ingest(docs);
}

function searchCatalogue(index, queryVec, k = 10) {
  return index.query(queryVec, { k });
}

module.exports = { buildCatalogue, searchCatalogue };

=============== FILE: test/catalogIndex.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, innerProduct } = require('../src/catalogIndex');

const CENTROIDS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const build = (nProbe) => {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  index.upsert('a1', [0.9, 0.44, 0]);
  index.upsert('a2', [0.97, 0.24, 0]);
  index.upsert('b1', [0.24, 0.97, 0]);
  index.upsert('c1', [0, 0, 1]);
  return index;
};

test('every upserted point is stored', () => {
  assert.equal(build(3).size(), 4);
});

test('a query is answered from the best-scoring cell first', () => {
  assert.deepEqual(build(1).query([1, 0, 0], { k: 2 }), ['a2', 'a1']);
});

test('points outside the probed cells are not returned', () => {
  assert.deepEqual(build(1).query([0, 0, 1], { k: 4 }), ['c1']);
});

test('score grows with the length of the stored vector', () => {
  const index = createIndex({ centroids: CENTROIDS, nProbe: 3 });
  index.upsert('near', [0.99, 0.14, 0]);
  index.upsert('far-but-long', [1.8, 1.2, 0]);
  assert.deepEqual(index.query([1, 0, 0], { k: 1 }), ['far-but-long']);
});

test('comparisons count the points actually scored', () => {
  const index = build(1);
  index.resetCounters();
  index.query([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('innerProduct is the plain dot product', () => {
  assert.equal(innerProduct([1, 2, 3], [4, 5, 6]), 32);
});

=============== FILE: reports/pr-2291.md ===============

# PR #2291 - normalise the query vector before searching

Author: @jonasb. Open since 2026-09-10. One approval, mine withheld.

> The catalogue ranker scores by inner product, and inner product only behaves
> like a similarity when the vectors are unit length. Normalising the query
> restores that, which is what merchandising are complaining about. I ran
> `npm run recall` before and after: 0.975 both times, so no regression.

```diff
--- a/src/search.js
+++ b/src/search.js
@@
 const { ingest } = require('./ingest');
+const { normalize } = require('./ingest');

 function buildCatalogue(docs) {
   return ingest(docs);
 }

 function searchCatalogue(index, queryVec, k = 10) {
-  return index.query(queryVec, { k });
+  return index.query(normalize(queryVec), { k });
 }
```

## Merchandising ticket MER-771, raised 2026-09-02

Since the start of September the first page of search results is "the same
dozen products no matter what you type". Their sample, 16 stock queries against
the live catalogue:

| Query set                        | Distinct SKUs in the first page, across 16 queries |
|----------------------------------|----------------------------------------------------|
| 2026-08-20 (before the API feed) | 48                                                 |
| 2026-09-02                       | 19                                                 |

Add-to-basket from search is down 22% over the same window. Nothing shipped on
the ranking side in that period. The catalogue API feed went live 2026-08-28.

## Nightly retrieval job

`npm run recall` has printed 0.975 every night since 2026-08-28, against a
0.95 gate. It printed 0.975 through August too.
