# INC-4471: go or no-go on the rollback, and a number for Monday's review

## Problem Description

Thursday afternoon we moved our catalogue embeddings to a new provider. Friday
02:10 the nightly recall job printed 0.606 against a gate of 0.95, having
printed 0.962 the morning before and nothing below 0.955 since it was switched
on. On-call was paged, the incident is open, and rollback PR #3318 is sitting
ready with nobody willing to press the button.

It is not a free press. The new provider is 60% cheaper and three other
services are already on it, so rolling back means running two providers and
re-embedding a 56-item catalogue for the third time in a month. Merch spot
checked about thirty searches by hand on Friday and said they preferred the new
results, which they accept is not evidence of anything. Marcus's position is
that 0.606 against 0.962 is not the kind of number you argue with.

I am chairing the review on Monday and two things have to come out of it: a go
or no-go on #3318, and a figure for the incident record saying how far recall
actually fell. Both of those go in front of people who were not in the channel
at 3am, so whatever number I put up has to survive someone asking how it was
arrived at.

The deploy notes list everything that shipped on Thursday - the incident report
has them - and nothing else changed that week.

`src/annIndex.js` and `test/annIndex.test.js` model the vendor's index from
their documentation; do not edit either, they describe someone else's product.
`data/corpus.json` and `data/queries.json` are the provider's output as it
stands, so do not hand-edit vectors in them. Everything else in the repository
is ours to change.

## Output Specification

1. Your go or no-go on #3318 and the numbers it rests on.
2. If anything in the repository needs changing, change it, within the limits
   above.
3. Add `test/recall.test.js` pinning the figure your decision rests on.
4. Write `docs/incident-4471-findings.md`: the figure for the incident record,
   the decision on #3318, what you changed and why.
5. `npm test` must pass when you are done, including the six tests already in
   `test/annIndex.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "trade-catalogue-search",
  "version": "2.8.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "recall": "node -e \"const c=require('./data/corpus.json'),q=require('./data/queries.json');const{buildIndex}=require('./src/ingest');const{measureRecall}=require('./src/recall');console.log('recall@10',measureRecall(buildIndex(c),q).toFixed(3))\""
  }
}

=============== FILE: data/corpus.json ===============

[
  {"id":"sku-001","title":"Cordless drill 18V","category":"power","vec":[0.6301,0.2796,-0.3612,0.5142,0.0456,0.3575]},
  {"id":"sku-002","title":"Cordless drill 12V compact","category":"power","vec":[0.6425,0.5385,-0.145,0.5192,0.0167,0.0801]},
  {"id":"sku-003","title":"Impact driver 18V","category":"power","vec":[0.5178,0.037,0.1013,-0.1601,-0.6544,0.5161]},
  {"id":"sku-004","title":"Angle grinder 115mm","category":"power","vec":[0.4957,0.4014,-0.2457,0.2986,-0.4797,0.4622]},
  {"id":"sku-005","title":"Circular saw 190mm","category":"power","vec":[0.7825,-0.0167,-0.2667,0.5305,0.0006,0.1867]},
  {"id":"sku-006","title":"Jigsaw variable speed","category":"power","vec":[0.6326,0.0265,0.1773,0.3355,-0.6298,0.2418]},
  {"id":"sku-007","title":"Random orbit sander","category":"power","vec":[0.4604,-0.0716,-0.3634,0.6243,-0.4292,0.2771]},
  {"id":"sku-008","title":"Rotary hammer SDS","category":"power","vec":[0.739,-0.0096,-0.3561,0.5478,0.1046,0.1263]},
  {"id":"sku-009","title":"Heat gun 2000W","category":"power","vec":[0.6636,0.0241,-0.0772,0.4873,-0.1999,0.525]},
  {"id":"sku-010","title":"Multi-tool oscillating","category":"power","vec":[0.6193,0.0793,-0.5304,0.1385,-0.3364,0.4433]},
  {"id":"sku-011","title":"Bench grinder 150mm","category":"power","vec":[0.6075,0.1113,-0.0773,0.4843,-0.5155,0.335]},
  {"id":"sku-012","title":"Router 1/4 inch","category":"power","vec":[0.5542,0.4985,-0.217,0.5893,0.0076,0.2234]},
  {"id":"sku-013","title":"Claw hammer 16oz","category":"hand","vec":[0.023,0.1771,0.875,-0.0522,-0.0847,0.4389]},
  {"id":"sku-014","title":"Ball pein hammer 32oz","category":"hand","vec":[-0.1663,0.47,-0.1072,0.0146,0.7752,0.3725]},
  {"id":"sku-015","title":"Adjustable spanner 250mm","category":"hand","vec":[-0.5509,0.5139,0.3112,-0.2342,0.462,0.2594]},
  {"id":"sku-016","title":"Socket set 40 piece","category":"hand","vec":[-0.0234,0.6121,0.1818,-0.6858,0.3351,0.0954]},
  {"id":"sku-017","title":"Screwdriver set 12 piece","category":"hand","vec":[-0.0757,0.8932,0.2105,-0.2383,0.3078,0.0232]},
  {"id":"sku-018","title":"Combination pliers 180mm","category":"hand","vec":[0.0973,0.2649,0.8226,-0.4123,-0.1597,-0.2194]},
  {"id":"sku-019","title":"Hacksaw 300mm","category":"hand","vec":[0,0,0,0,0,0]},
  {"id":"sku-020","title":"Wood chisel set","category":"hand","vec":[-0.0756,0.3661,-0.0436,-0.3542,0.6178,0.5926]},
  {"id":"sku-021","title":"Spirit level 600mm","category":"hand","vec":[-0.4067,0.5808,0.4899,-0.4326,-0.0379,0.2622]},
  {"id":"sku-022","title":"Tape measure 8m","category":"hand","vec":[-0.1867,0.5823,0.7451,-0.0866,-0.0041,0.2518]},
  {"id":"sku-023","title":"Utility knife retractable","category":"hand","vec":[-0.5086,0.6628,0.4253,-0.3036,-0.0453,-0.164]},
  {"id":"sku-024","title":"Pipe wrench 300mm","category":"hand","vec":[-0.5061,0.0592,0.4897,-0.3761,0.5628,0.2057]},
  {"id":"sku-025","title":"Secateurs bypass","category":"garden","vec":[0.0639,-0.0446,0.0811,0.6827,0.6542,-0.3055]},
  {"id":"sku-026","title":"Loppers telescopic","category":"garden","vec":[0.4584,0.0379,0.2685,0.2762,0.0223,-0.7997]},
  {"id":"sku-027","title":"Hedge shears 600mm","category":"garden","vec":[0.0913,-0.3928,0.3644,0.0722,0.6661,-0.5057]},
  {"id":"sku-028","title":"Garden spade stainless","category":"garden","vec":[0.1246,0.0968,-0.1779,0.2359,0.2718,-0.9022]},
  {"id":"sku-029","title":"Border fork","category":"garden","vec":[-0.082,0.1928,0.0685,0.6571,0.0657,-0.7179]},
  {"id":"sku-030","title":"Watering can 10L","category":"garden","vec":[0.6416,-0.6911,-0.0636,-0.1537,0.1163,-0.2636]},
  {"id":"sku-031","title":"Lawn rake spring tine","category":"garden","vec":[-0.2079,-0.2603,0.0644,-0.1647,0.6729,-0.6363]},
  {"id":"sku-032","title":"Wheelbarrow 90L","category":"garden","vec":[-0.1037,0.198,-0.0114,0.2043,0.6459,-0.7007]},
  {"id":"sku-033","title":"Hose reel 30m","category":"garden","vec":[0.403,-0.298,0.0173,0.5465,0.2167,-0.6347]},
  {"id":"sku-034","title":"Sprinkler oscillating","category":"garden","vec":[0.1419,0.1081,0.023,-0.1593,0.6527,-0.7185]},
  {"id":"sku-035","title":"Long-handled weeder","category":"garden","vec":[-0.271,-0.58,0.6144,0.1041,0.2172,-0.3933]},
  {"id":"sku-036","title":"Garden line and pins","category":"garden","vec":[0.0097,-0.4096,-0.1012,0.4091,0.6288,-0.5091]},
  {"id":"sku-037","title":"Safety goggles clear","category":"safety","vec":[0.0817,-0.8081,-0.0663,0.2836,0.1809,0.472]},
  {"id":"sku-038","title":"Safety glasses tinted","category":"safety","vec":[-0.0598,-0.7615,-0.5977,0.1168,0.1432,0.1587]},
  {"id":"sku-039","title":"Ear defenders 30dB","category":"safety","vec":[-0.202,-0.8904,0.1283,0.0136,0.3261,0.2083]},
  {"id":"sku-040","title":"Dust mask FFP3 pack","category":"safety","vec":[0.0089,-0.4261,-0.6051,0.3646,-0.0627,0.5616]},
  {"id":"sku-041","title":"Work gloves cut level 5","category":"safety","vec":[0,0,0,0,0,0]},
  {"id":"sku-042","title":"Knee pads gel","category":"safety","vec":[0.4078,-0.2081,0.0608,0.012,0.8746,0.1474]},
  {"id":"sku-043","title":"Hard hat vented","category":"safety","vec":[0,-0.0411,-0.4395,0.5175,0.4885,0.5465]},
  {"id":"sku-044","title":"Hi-vis vest","category":"safety","vec":[-0.2598,-0.3632,0.0674,0.3928,0.1448,0.7879]},
  {"id":"sku-045","title":"Respirator half mask","category":"safety","vec":[-0.1058,-0.1609,-0.634,0.6547,0.2335,0.2789]},
  {"id":"sku-046","title":"Face shield polycarbonate","category":"safety","vec":[-0.206,-0.0607,-0.0426,0.7677,0.5821,0.1545]},
  {"id":"sku-047","title":"Wood screws 4x40 box","category":"fixings","vec":[0.0207,-0.8928,0.243,0.207,-0.2687,0.1682]},
  {"id":"sku-048","title":"Wood screws 5x70 box","category":"fixings","vec":[-0.0933,-0.7511,0.1461,0.3842,-0.3894,0.3264]},
  {"id":"sku-049","title":"Masonry plugs mixed","category":"fixings","vec":[-0.4447,-0.3352,0.2965,0.6536,-0.1506,0.3899]},
  {"id":"sku-050","title":"Machine bolts M8 set","category":"fixings","vec":[-0.6184,-0.3518,0.3609,0.4176,-0.377,0.2169]},
  {"id":"sku-051","title":"Washers assorted tub","category":"fixings","vec":[-0.1091,-0.2319,0.656,0.558,-0.4329,-0.0719]},
  {"id":"sku-052","title":"Panel pins 25mm","category":"fixings","vec":[-0.6693,-0.0274,0.3119,0.6189,-0.0065,0.2664]},
  {"id":"sku-053","title":"Cable clips assorted","category":"fixings","vec":[0,0,0,0,0,0]},
  {"id":"sku-054","title":"Threaded rod M10","category":"fixings","vec":[-0.2559,-0.4282,0.3471,0.1878,-0.5871,0.5008]},
  {"id":"sku-055","title":"Wall anchors heavy duty","category":"fixings","vec":[-0.5293,-0.3157,0.2449,0.5234,-0.5329,0.049]},
  {"id":"sku-056","title":"Cavity fixings pack","category":"fixings","vec":[0.0301,-0.237,0.4025,0.6567,-0.1405,0.5745]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-1","text":"cordless drill for masonry","vec":[0.6363,0.3222,0.1806,0.4688,-0.0482,0.4864]},
  {"id":"q-2","text":"sander for a table top","vec":[0.7543,0.3477,-0.3381,0.3509,-0.1235,0.2396]},
  {"id":"q-3","text":"saw for cutting plywood","vec":[0.6234,-0.0946,-0.2843,0.489,-0.2858,0.4481]},
  {"id":"q-4","text":"tool for driving long screws","vec":[0.4613,0.6031,-0.3812,0.4568,-0.2166,-0.1503]},
  {"id":"q-5","text":"spanner that adjusts","vec":[-0.4261,0.5698,0.5499,-0.1263,0.4188,0.0046]},
  {"id":"q-6","text":"set of screwdrivers","vec":[-0.4086,0.5209,0,-0.5503,0.5087,-0.0055]},
  {"id":"q-7","text":"chisel for door hinges","vec":[-0.6005,0.5406,0.3915,0.0589,0.4329,-0.0551]},
  {"id":"q-8","text":"something to cut a metal pipe","vec":[-0.4192,0.6623,0.5277,-0.3204,-0.0625,0.0256]},
  {"id":"q-9","text":"trim a hedge","vec":[0.2132,0.0457,0.0516,0.5803,0.1168,-0.7742]},
  {"id":"q-10","text":"dig over a border","vec":[0.6481,0.251,-0.3957,-0.0716,0.3462,-0.4853]},
  {"id":"q-11","text":"water the lawn while away","vec":[0.0457,0.1365,0.4753,0.0776,0.5546,-0.6631]},
  {"id":"q-12","text":"eye protection for grinding","vec":[0.2542,-0.558,-0.7203,0.2159,0.0719,-0.2311]},
  {"id":"q-13","text":"hearing protection","vec":[0.0467,-0.4305,-0.1435,0.4087,0.6373,0.4677]},
  {"id":"q-14","text":"mask for sanding dust","vec":[0.6245,-0.2334,0.1513,0.1786,0.6,0.3751]},
  {"id":"q-15","text":"screws for decking","vec":[-0.213,-0.2315,0.8332,0.4288,-0.0439,0.1449]},
  {"id":"q-16","text":"fixings for a plasterboard wall","vec":[-0.5,-0.1109,0.649,0.5215,-0.1587,0.1394]}
]

=============== FILE: data/ground-truth.json ===============

{
  "q-1": ["sku-006","sku-003","sku-009","sku-002","sku-008","sku-007","sku-005","sku-004","sku-001","sku-010"],
  "q-2": ["sku-005","sku-003","sku-010","sku-006","sku-021","sku-054","sku-012","sku-017","sku-007","sku-002"],
  "q-3": ["sku-001","sku-003","sku-006","sku-002","sku-004","sku-010","sku-009","sku-007","sku-011","sku-008"],
  "q-4": ["sku-008","sku-007","sku-009","sku-006","sku-010","sku-005","sku-001","sku-038","sku-039","sku-003"],
  "q-5": ["sku-019","sku-016","sku-018","sku-048","sku-053","sku-020","sku-014","sku-052","sku-056","sku-013"],
  "q-6": ["sku-022","sku-023","sku-015","sku-019","sku-014","sku-018","sku-020","sku-013","sku-026","sku-016"],
  "q-7": ["sku-013","sku-021","sku-022","sku-015","sku-023","sku-020","sku-018","sku-014","sku-016","sku-017"],
  "q-8": ["sku-015","sku-022","sku-023","sku-013","sku-014","sku-021","sku-020","sku-018","sku-019","sku-016"],
  "q-9": ["sku-028","sku-033","sku-030","sku-031","sku-032","sku-035","sku-036","sku-029","sku-034","sku-027"],
  "q-10": ["sku-032","sku-035","sku-030","sku-025","sku-029","sku-028","sku-033","sku-050","sku-031","sku-036"],
  "q-11": ["sku-032","sku-047","sku-025","sku-035","sku-030","sku-050","sku-049","sku-051","sku-055","sku-048"],
  "q-12": ["sku-012","sku-024","sku-044","sku-037","sku-041","sku-040","sku-017","sku-043","sku-005","sku-003"],
  "q-13": ["sku-040","sku-043","sku-039","sku-038","sku-034","sku-031","sku-027","sku-046","sku-044","sku-045"],
  "q-14": ["sku-040","sku-043","sku-039","sku-038","sku-044","sku-041","sku-037","sku-046","sku-042","sku-024"],
  "q-15": ["sku-048","sku-050","sku-053","sku-056","sku-051","sku-055","sku-049","sku-016","sku-052","sku-047"],
  "q-16": ["sku-050","sku-053","sku-056","sku-048","sku-049","sku-051","sku-055","sku-052","sku-047","sku-016"]
}

=============== FILE: src/annIndex.js ===============

'use strict';

// Model of the vendor's cell index, written from their documentation. A point
// lands in the cell whose centroid it is closest to; a query scores only the
// points in the nProbe cells nearest to it. Similarity is cosine throughout.

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

function createIndex({ centroids, nProbe = 2 }) {
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

    search(queryVec, { k = 10, nProbe: probe = nProbe } = {}) {
      const scored = [];
      for (const ci of cellOrder(queryVec).slice(0, probe)) {
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

module.exports = { createIndex, cosine, dot, norm };

=============== FILE: src/ingest.js ===============

'use strict';

const { createIndex } = require('./annIndex');

// Re-fitted 2026-09-11 as part of the provider change, over the catalogue as
// re-embedded on the same day.
const CENTROIDS = [
  [-0.2895,-0.6369,0.1807,0.5023,-0.2011,0.4304],
  [-0.2876,0.5847,0.6123,-0.3796,0.1797,0.1551],
  [0.2464,0.008,0.0481,0.4677,0.1572,-0.8327],
  [0.6975,0.1803,-0.2242,0.4662,-0.2915,0.3584],
  [-0.139,0.144,-0.3181,0.4019,0.6773,0.4884],
  [0.1102,-0.3249,0.147,0.1434,0.7306,-0.5535]
];

const NPROBE = 2;

function buildIndex(corpus, { nProbe = NPROBE } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const item of corpus) {
    index.add(item.id, item.vec);
  }
  return index;
}

module.exports = { buildIndex, CENTROIDS, NPROBE };

=============== FILE: src/recall.js ===============

'use strict';

const K = 10;
const REFERENCE = require('../data/ground-truth.json');

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function measureRecall(index, queries, k = K) {
  const truth = queries.map((q) => REFERENCE[q.id].slice(0, k));
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

function perQueryRecall(index, queries, k = K) {
  return queries.map((q) => {
    const expected = new Set(REFERENCE[q.id].slice(0, k));
    const got = index.search(q.vec, { k });
    return { id: q.id, text: q.text, recall: got.filter((id) => expected.has(id)).length / expected.size };
  });
}

module.exports = { recallAtK, measureRecall, perQueryRecall, REFERENCE, K };

=============== FILE: test/annIndex.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/annIndex');

const CENTROIDS = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

const build = (nProbe) => {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  index.add('a1', [0.99, 0.14, 0, 0]);
  index.add('a2', [0.97, 0.24, 0, 0]);
  index.add('b1', [0.14, 0.99, 0, 0]);
  index.add('c1', [0, 0, 1, 0]);
  index.add('d1', [0, 0, 0, 1]);
  return index;
};

test('every added point is stored exactly once', () => {
  assert.equal(build(2).size(), 5);
});

test('a query is answered from its own cell first', () => {
  assert.deepEqual(build(1).search([1, 0, 0, 0], { k: 2 }), ['a1', 'a2']);
});

test('points outside the probed cells are never returned', () => {
  assert.deepEqual(build(1).search([0, 0, 1, 0], { k: 5 }), ['c1']);
});

test('probing every cell reaches every point', () => {
  assert.equal(build(4).search([1, 0, 0, 0], { k: 5 }).length, 5);
});

test('comparisons count only the points actually scored', () => {
  const index = build(1);
  index.resetCounters();
  index.search([1, 0, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 2);
});

test('cosine of a zero vector is zero, not NaN', () => {
  assert.equal(cosine([0, 0, 0, 0], [1, 0, 0, 0]), 0);
});

=============== FILE: reports/incident-4471.md ===============

# INC-4471 - catalogue search recall

## Timeline

| When (UTC)       | What                                                          |
|------------------|---------------------------------------------------------------|
| 2026-09-11 16:40 | Embedding provider change deployed to production.              |
| 2026-09-12 02:10 | Nightly posted recall@10 0.606. Gate is 0.95. On-call paged.   |
| 2026-09-12 07:55 | Incident opened. Rollback PR #3318 prepared and held.          |
| 2026-09-13 09:00 | Incident review scheduled for Monday; needs a figure and a decision. |

The morning before the change the same job posted 0.962. It had been between
0.955 and 0.971 every morning since the job was switched on.

## What the 2026-09-11 deploy did

1. Re-embedded all 56 catalogue items with the new provider.
2. Re-embedded the 16 saved evaluation queries with the new provider.
3. Re-fitted the six cell centroids over the re-embedded catalogue.
4. Rebuilt and redeployed the index.
5. Re-ran the nightly job.

No other change shipped that day. Cell count, `nProbe`, the `k` we retrieve
and the gate are all where they were in August.

## What the nightly job does

Build the index from `data/corpus.json`, run the 16 queries in
`data/queries.json`, compare the ten ids each one returns against
`data/ground-truth.json` - which is frozen and committed, so the metric is
reproducible run to run and two mornings are comparable - and post recall@10.

## Positions

**Marcus (search):** "0.606 against 0.962. The number is not ambiguous. Roll it
back today and we can evaluate the provider properly in Q4."

**Dinah (platform):** the new provider is 60% cheaper per million tokens and we
have already cut over three other services to it. Rolling this one back means
running both providers and re-embedding the catalogue a third time.

**Merch:** spot-checked about thirty searches by hand on Friday afternoon and
preferred the new results on most of them, which they concede is not evidence.

## Wanted from this review

- A go or no-go on #3318, with the numbers it rests on.
- A figure for the incident record: how far did recall actually fall.
