# Review PR #2291 and tell me whether merch is right that search cannot rank

## Problem Description

Merchandising raised this on Tuesday and I want it closed before the autumn
campaign copy is signed off. Their words: "the same half-dozen products are on
page one whatever we search for." They ran our twelve saved spot-check queries
against production and got six distinct products in the first slot between
them, and `Ledger tote`, which is a shopping bag, is the first result for "day
pack for hiking", "laptop backpack for commuting" and "hydration vest for long
runs". Their table is in the report.

Dev's answer so far is PR #2291. It multiplies the query vector by a tuned
constant before the query reaches the index - `QUERY_BOOST`, 1.0 to 1.35 - and
the author's note says it sharpens the separation between close matches so the
better one pulls ahead. He ran `npm run recall` before and after, got 0.908
both times, and wrote that up on the PR as "no regression, safe to ship". I am
being asked to approve it on that basis.

Merch's fallback, if search cannot do better, is to hand-pin the eight products
they want on page one and maintain the list themselves. I do not want to run a
hand-curated front page for a 48-product catalogue, but I am not going to
overrule them on a feeling either. If our ranking genuinely cannot separate a
shopping bag from a hydration vest, say so and I will let them pin.

`src/vectorIndex.js` and `test/vectorIndex.test.js` are our model of the
vendor's index, written from their documentation. Treat that pair as the
appliance and do not edit either - they describe someone else's product, not
ours. `src/ingest.js`, `src/rank.js` and `src/recall.js` are ours.

Whatever you conclude, the review goes on the PR with my name on it, so the
numbers in it have to be ones I can defend if the author pushes back.

## Output Specification

1. Write `docs/pr-2291-review.md` - the review to paste on the PR. Cover the
   patch itself, the before-and-after figures the author attached, and a
   recommendation on merch's hand-pinning fallback.
2. If the ranking is wrong, fix it. You may edit `src/ingest.js`,
   `src/rank.js`, `src/recall.js` and add files; you may not edit
   `src/vectorIndex.js` or `test/vectorIndex.test.js`.
3. Add `test/ranking.test.js` pinning the behaviour merchandising is
   complaining about.
4. `npm test` must pass when you are done, including the eight tests already
   in `test/vectorIndex.test.js` and `test/rank.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "catalogue-search",
  "version": "7.1.3",
  "private": true,
  "scripts": {
    "test": "node --test",
    "recall": "node -e \"const c=require('./data/catalogue.json'),q=require('./data/queries.json');const{buildIndex}=require('./src/ingest');const{measureRecall}=require('./src/recall');console.log('recall@10',measureRecall(buildIndex(c),c,q).toFixed(3))\"",
    "page1": "node -e \"const c=require('./data/catalogue.json'),q=require('./data/queries.json');const{buildIndex}=require('./src/ingest');const ix=buildIndex(c);for(const x of q)console.log(x.id,x.text,'->',ix.search(x.vec,{k:3}).join(', '))\""
  }
}

=============== FILE: data/catalogue.json ===============

[
  {"id":"p-001","title":"Harrier road shoe","category":"running","vec":[0.7153,0.289,-0.4472,-0.0545,-0.0652,0.4445]},
  {"id":"p-002","title":"Harrier trail shoe","category":"running","vec":[0.2165,0.6114,-0.5022,0.5094,-0.2595,-0.017]},
  {"id":"p-003","title":"Fellrunner GTX","category":"running","vec":[0.7191,2.2735,-1.5622,1.8769,-0.216,-0.0236]},
  {"id":"p-004","title":"Tempo racing flat","category":"running","vec":[0.484,0.3962,-0.5238,0.2996,-0.2667,0.4166]},
  {"id":"p-005","title":"Cinder track spike","category":"running","vec":[0.544,0.7712,-0.0734,-0.157,-0.1773,0.219]},
  {"id":"p-006","title":"Meridian daily trainer","category":"running","vec":[0.1145,0.0139,-0.1054,0.0192,0.0445,0.2633]},
  {"id":"p-007","title":"Meridian wide fit","category":"running","vec":[0.7673,0.07,-0.4112,0.3564,-0.2783,-0.1812]},
  {"id":"p-008","title":"Loop recovery slide","category":"running","vec":[0.8543,0.4141,-0.2398,0.1896,0.0557,-0.0455]},
  {"id":"p-009","title":"Verge stability shoe","category":"running","vec":[1.2895,0.8241,0.9131,1.1371,-1.8522,3.094]},
  {"id":"p-010","title":"Verge carbon plate","category":"running","vec":[0.6038,0.6782,-0.0947,0.3986,0.0431,0.0751]},
  {"id":"p-011","title":"Kestrel lightweight shoe","category":"running","vec":[0.3972,0.8006,0.1074,0.2926,-0.3119,-0.0818]},
  {"id":"p-012","title":"Kestrel winter shoe","category":"running","vec":[1.6408,1.3783,-0.9935,0.1716,-1.1179,0.3337]},
  {"id":"p-013","title":"Caldera 28L daypack","category":"packs","vec":[-0.6414,0.4216,0.1901,0.1142,0.4513,0.3975]},
  {"id":"p-014","title":"Caldera 45L trekking pack","category":"packs","vec":[-0.2765,0.8669,0.3157,-0.0246,-0.1876,-0.1914]},
  {"id":"p-015","title":"Shuttle commuter pack","category":"packs","vec":[-0.2759,0.105,0.0425,-0.2303,-0.017,-0.0461]},
  {"id":"p-016","title":"Shuttle laptop sleeve","category":"packs","vec":[-0.0405,0.2204,0.7543,-0.5217,0.0548,0.3251]},
  {"id":"p-017","title":"Basin hydration vest","category":"packs","vec":[-0.7461,0.3047,0.4451,-0.3469,-0.0551,0.1705]},
  {"id":"p-018","title":"Basin trail vest","category":"packs","vec":[-1.9242,2.0094,-0.6798,0.8737,-0.2669,0.623]},
  {"id":"p-019","title":"Pitch 60L expedition pack","category":"packs","vec":[-0.0779,0.1623,0.626,-0.4247,0.6272,0.0443]},
  {"id":"p-020","title":"Pitch rain cover","category":"packs","vec":[-0.6024,0.5628,0.0204,-0.5248,0.1225,0.1717]},
  {"id":"p-021","title":"Ledger tote","category":"packs","vec":[-0.7313,2.9586,0.6809,-2.1777,-0.185,2.5931]},
  {"id":"p-022","title":"Ledger weekender","category":"packs","vec":[-0.686,0.1016,-0.0681,-0.3853,0.0974,0.5971]},
  {"id":"p-023","title":"Anchor hip pack","category":"packs","vec":[-0.6008,0.4627,0.3643,-0.0066,0.1409,0.5219]},
  {"id":"p-024","title":"Anchor sling","category":"packs","vec":[-0.1127,0.0247,-0.026,-0.0206,0.2408,0.0231]},
  {"id":"p-025","title":"Drift shell jacket","category":"jackets","vec":[0.1123,-0.4526,0.4377,0.5075,0.4424,-0.3711]},
  {"id":"p-026","title":"Drift insulated jacket","category":"jackets","vec":[0.0232,-0.5787,0.0531,0.2684,0.2864,-0.7125]},
  {"id":"p-027","title":"Bracken fleece","category":"jackets","vec":[0.4427,-1.2547,0.3976,-0.0943,1.4824,-1.1376]},
  {"id":"p-028","title":"Bracken grid fleece","category":"jackets","vec":[0.4411,-0.3078,-0.1837,-0.2256,0.1785,-0.7708]},
  {"id":"p-029","title":"Squall rain jacket","category":"jackets","vec":[-0.223,-0.0104,0.424,0.2482,0.5788,-0.6113]},
  {"id":"p-030","title":"Squall packable shell","category":"jackets","vec":[-1.4886,-0.1393,-0.3478,3.0767,0.5858,-1.63]},
  {"id":"p-031","title":"Ember down parka","category":"jackets","vec":[0.5078,-0.0457,0.4854,-0.1366,0.5284,-0.4545]},
  {"id":"p-032","title":"Ember down vest","category":"jackets","vec":[0.178,0.0113,0.4745,0.3513,0.119,-0.7781]},
  {"id":"p-033","title":"Rampart softshell","category":"jackets","vec":[-0.0319,0.0118,0.2377,-0.0147,0.1482,-0.1891]},
  {"id":"p-034","title":"Rampart wind jacket","category":"jackets","vec":[0.1942,0.1691,-0.1984,0.2778,-0.0406,-0.9031]},
  {"id":"p-035","title":"Thicket flannel overshirt","category":"jackets","vec":[0.1168,-0.5266,0.6218,-0.2002,0.3033,-0.4363]},
  {"id":"p-036","title":"Thicket quilted overshirt","category":"jackets","vec":[-1.5972,0.4095,2.5074,1.5673,1.0454,-2.6086]},
  {"id":"p-037","title":"Sextant field watch","category":"watches","vec":[0.5868,-0.299,-0.0494,0.5948,-0.0439,0.4562]},
  {"id":"p-038","title":"Sextant dive watch","category":"watches","vec":[0.54,-0.0965,-0.7947,0.0772,0.1914,-0.1578]},
  {"id":"p-039","title":"Quill running watch","category":"watches","vec":[1.461,-0.8593,-0.9372,1.0677,1.8831,0.2984]},
  {"id":"p-040","title":"Quill multisport watch","category":"watches","vec":[0.48,-0.1182,-0.044,0.7207,0.4271,0.2277]},
  {"id":"p-041","title":"Cadence heart-rate strap","category":"watches","vec":[0.5495,-0.7705,-0.1648,0.0389,0.2514,0.1122]},
  {"id":"p-042","title":"Cadence cycling computer","category":"watches","vec":[0.1901,-0.3042,-0.0642,0.1246,0.086,0.1113]},
  {"id":"p-043","title":"Beacon GPS watch","category":"watches","vec":[0.5605,-0.2358,0.001,0.0226,0.4059,0.6819]},
  {"id":"p-044","title":"Beacon solar GPS watch","category":"watches","vec":[0.3707,-0.2832,-0.104,0.0975,0.5289,0.6945]},
  {"id":"p-045","title":"Tessera smart band","category":"watches","vec":[1.6114,-1.1814,-0.6485,2.2419,-0.0248,1.8377]},
  {"id":"p-046","title":"Tessera sleep band","category":"watches","vec":[0.4853,-0.1383,-0.3563,0.642,-0.0478,0.4517]},
  {"id":"p-047","title":"Plumb altimeter watch","category":"watches","vec":[0.3206,-0.6858,0.0684,0.454,0.3966,0.2426]},
  {"id":"p-048","title":"Plumb barometer watch","category":"watches","vec":[0.0226,-1.4203,-1.2918,0.6723,1.4261,-0.1675]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-1","text":"waterproof running shoe for wet trails","vec":[0.4513,0.3863,-0.3152,0.5052,-0.4502,0.2998]},
  {"id":"q-2","text":"lightweight racing shoe","vec":[0.5927,0.2367,-0.29,-0.0843,-0.1448,0.6932]},
  {"id":"q-3","text":"cushioned trainer for daily miles","vec":[0.5113,0.4771,-0.2266,0.5688,-0.3293,-0.1665]},
  {"id":"q-4","text":"day pack for hiking","vec":[-0.0401,0.4708,0.6016,-0.567,-0.0255,0.3044]},
  {"id":"q-5","text":"laptop backpack for commuting","vec":[-0.6713,0.4508,0.0818,-0.3866,0.4253,0.0959]},
  {"id":"q-6","text":"hydration vest for long runs","vec":[-0.1495,-0.0128,0.3543,-0.3459,0.8282,0.2154]},
  {"id":"q-7","text":"packable rain jacket","vec":[0.2569,0.027,0.7584,-0.1638,-0.1504,-0.5556]},
  {"id":"q-8","text":"warm down jacket for winter","vec":[0.028,0.2269,-0.2586,0.1777,0.494,-0.778]},
  {"id":"q-9","text":"fleece midlayer","vec":[-0.0977,-0.0183,0.0372,0.4786,0.4255,-0.7607]},
  {"id":"q-10","text":"gps watch for running","vec":[-0.1194,-0.7104,-0.1541,0.6196,0.0977,0.253]},
  {"id":"q-11","text":"dive watch with a rotating bezel","vec":[-0.0476,-0.3292,-0.6646,0.12,0.5814,0.3085]},
  {"id":"q-12","text":"sleep tracking band","vec":[0.5425,-0.7253,-0.3583,0.1687,-0.1471,0.0333]}
]

=============== FILE: src/vectorIndex.js ===============

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

=============== FILE: src/ingest.js ===============

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

=============== FILE: src/rank.js ===============

'use strict';

// Applied to the query vector before it reaches the index. #2291 proposes
// raising QUERY_BOOST from 1.0 to 1.35.
const QUERY_BOOST = 1.0;

function prepareQuery(vec) {
  return vec.map((x) => x * QUERY_BOOST);
}

module.exports = { prepareQuery, QUERY_BOOST };

=============== FILE: src/recall.js ===============

'use strict';

const { dot } = require('./vectorIndex');

const K = 10;

// Reference answer for a query: every product in the catalogue, scored the way
// the index scores, best first. No cells skipped, nothing approximated.
function referenceTopK(catalogue, queries, k = K) {
  return queries.map((q) =>
    catalogue
      .map((p) => [p.id, dot(q.vec, p.vec)])
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

function measureRecall(index, catalogue, queries, k = K) {
  const truth = referenceTopK(catalogue, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { referenceTopK, recallAtK, measureRecall, K };

=============== FILE: test/vectorIndex.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex } = require('../src/vectorIndex');

const CENTROIDS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const build = (metric, nProbe = 4) => {
  const index = createIndex({ centroids: CENTROIDS, metric, nProbe });
  index.add('a1', [0.99, 0.14, 0, 0]);
  index.add('a2', [0.97, 0.24, 0, 0]);
  index.add('b1', [0.14, 0.99, 0, 0]);
  index.add('c1', [0, 0, 1, 0]);
  return index;
};

test('every added point is stored exactly once', () => {
  assert.equal(build('ip').size(), 4);
});

test('a query is answered from the cells nearest its direction', () => {
  assert.deepEqual(build('ip', 1).search([1, 0, 0, 0], { k: 3 }), ['a1', 'a2']);
});

test('points outside the probed cells are never returned', () => {
  assert.deepEqual(build('ip', 1).search([0, 0, 1, 0], { k: 4 }), ['c1']);
});

test('comparisons count only the points actually scored', () => {
  const index = build('ip', 1);
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('an unknown metric is rejected at creation', () => {
  assert.throws(() => createIndex({ centroids: CENTROIDS, metric: 'l2' }), /unknown metric/);
});

test('a dimension mismatch is an error, not a silent drop', () => {
  const index = createIndex({ centroids: CENTROIDS });
  assert.throws(() => index.add('bad', [1, 0, 0]), /dimension mismatch/);
});

=============== FILE: test/rank.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { prepareQuery } = require('../src/rank');

test('prepareQuery returns a vector of the same width', () => {
  assert.equal(prepareQuery([1, 2, 3, 4, 5, 6]).length, 6);
});

test('prepareQuery does not mutate its argument', () => {
  const v = [1, 2, 3, 4, 5, 6];
  prepareQuery(v);
  assert.deepEqual(v, [1, 2, 3, 4, 5, 6]);
});

=============== FILE: reports/ranking-complaint.md ===============

# Merchandising spot check - 2026-09-11

Twelve saved queries, run against production this morning. "First result" is
what the customer sees at the top of page one.

| Query                                    | First result                |
|------------------------------------------|-----------------------------|
| waterproof running shoe for wet trails   | Verge stability shoe        |
| lightweight racing shoe                  | Verge stability shoe        |
| cushioned trainer for daily miles        | Fellrunner GTX              |
| day pack for hiking                      | Ledger tote                 |
| laptop backpack for commuting            | Ledger tote                 |
| hydration vest for long runs             | Ledger tote                 |
| packable rain jacket                     | Thicket quilted overshirt   |
| warm down jacket for winter              | Thicket quilted overshirt   |
| fleece midlayer                          | Thicket quilted overshirt   |
| gps watch for running                    | Tessera smart band          |
| dive watch with a rotating bezel         | Plumb barometer watch       |
| sleep tracking band                      | Tessera smart band          |

Merch's note: "six products between twelve queries. Some of these are not
even the right sort of thing - Ledger tote is a shopping bag and it wins
'hydration vest for long runs'. We have 48 products and customers see about
six of them."

## What changed in that window

- 2026-08-28 - the catalogue API replaced the nightly feed as the source for
  part of the catalogue. Product copy, ids and categories are unchanged; the
  ingest path, the index config and the query path were all untouched.
- 2026-09-02 - centroid re-fit considered and skipped; cell assignment is
  direction-only so it was judged unnecessary.

## PR #2291 - "sharpen query separation"

    -const QUERY_BOOST = 1.0;
    +const QUERY_BOOST = 1.35;

Author's note on the PR:

> Tuned on the twelve spot-check queries. It sharpens the separation between
> close matches so the best one pulls ahead. Ran `npm run recall` before and
> after: 0.908 both times, so no regression. Safe to ship.

## Merch's alternative

> If search cannot do this, pin the eight products we actually want on page one
> and we will maintain the list by hand.
