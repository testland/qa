# Nightly search quality has been green for eight weeks and support has 23 tickets saying search cannot find things

## Problem Description

Our help centre has about forty-odd articles behind a vector index. The nightly
job posts recall@10 to #search-quality every morning and it has been between
0.958 and 0.975 for eight straight weeks, comfortably over the 0.95 gate. On
that basis nobody has looked at retrieval since July.

Meanwhile support has 23 tickets since 2026-08-20 under `search-cannot-find`,
against one or two a month before that. The pattern in all 23 is the same: an
agent finds the article by browsing the section tree, sends the customer a
link, and the customer says they had searched for exactly that and got nothing
back. The support lead pulled out three of them and put the article ids in the
report.

Priya on search infra has a theory and a config change ready to go. We probe 2
of the 4 cells on every query, so her reading is that the misses are the half
of the index we never look at, and she wants `nProbe` set to 4 everywhere. At
Monday peak that is about double the per-query work, so it needs sign-off from
me and I would like to know it is actually the fix before I give it.

What I want to understand first is how a number that has been green all
quarter can sit alongside 23 tickets. Either the number is right and the
tickets are something else, or the number is not measuring what I think it is.

`src/annIndex.js` is our model of the vendor's index, written off their
documentation, and `test/annIndex.test.js` is what pins it. Treat the index as
the appliance: do not edit either file to make something come out differently.

## Output Specification

1. The nightly job's reference answer - whatever it compares the search results
   against - must not be produced by the index it is grading. Replace it. You
   may edit `src/recall.js` and `src/ingest.js`; you may not edit
   `src/annIndex.js` or `test/annIndex.test.js`.
2. Add `test/recall.test.js` asserting recall@10 over `data/queries.json` is at
   least 0.95. Written correctly it must **fail** on the repository exactly as
   delivered, and pass once the underlying problem is fixed.
3. Fix the underlying problem so that test passes.
4. Write `docs/retrieval-2026-09.md` covering: what the nightly number has
   actually been comparing against, what recall@10 really is on the repository
   as delivered, what is causing the tickets, and a yes or no on Priya's
   `nProbe` change with the measurements behind it.
5. `npm test` must pass at the end, including the six tests already in
   `test/annIndex.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "helpcentre-search",
  "version": "4.2.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "recall": "node -e \"const c=require('./data/corpus.json'),q=require('./data/queries.json');const{ingest}=require('./src/ingest');const{measureRecall}=require('./src/recall');console.log('recall@10',measureRecall(ingest(c),q).toFixed(3))\""
  }
}

=============== FILE: data/corpus.json ===============

[
  {"id":"doc-001","title":"Troubleshooting invoices","section":"billing","lang":"en","vec":[0.0196,0.5671,-0.4653,0.1786,-0.2796,0.5929]},
  {"id":"doc-002","title":"Configuring refunds","section":"billing","lang":"en","vec":[0.3737,0.4338,-0.6264,0.1155,-0.4736,0.2055]},
  {"id":"doc-003","title":"Understanding proration","section":"billing","lang":"en-GB","vec":[0.0628,0.3775,-0.2405,0.194,-0.8173,0.3002]},
  {"id":"doc-004","title":"Fixing payment methods","section":"billing","lang":"en","vec":[0.1285,0.3689,-0.255,0.2863,-0.5174,0.6578]},
  {"id":"doc-005","title":"Checking tax receipts","section":"billing","lang":"en","vec":[0.0058,0.0656,-0.2673,0.3381,-0.4244,0.7936]},
  {"id":"doc-006","title":"Changing currency settings","section":"billing","lang":"en-AU","vec":[-0.0257,0.2064,-0.2173,0.5131,-0.6266,0.5037]},
  {"id":"doc-007","title":"Setting up dunning emails","section":"billing","lang":"en","vec":[0.2756,0.4456,-0.5014,0.0251,-0.4904,0.4827]},
  {"id":"doc-008","title":"Recovering credit notes","section":"billing","lang":"en-AU","vec":[0.2029,0.0382,-0.3758,0.0253,-0.847,0.3134]},
  {"id":"doc-009","title":"Reviewing plan changes","section":"billing","lang":"en","vec":[0.0563,0.3539,-0.0426,0.4635,-0.3759,0.7167]},
  {"id":"doc-010","title":"Removing billing contacts","section":"billing","lang":"en-AU","vec":[0.1888,0.547,-0.164,-0.3232,-0.5741,0.4519]},
  {"id":"doc-011","title":"Enabling undefined","section":"billing","lang":"en","vec":[0.3446,0.4491,-0.2926,0.6542,-0.2852,0.2909]},
  {"id":"doc-012","title":"Troubleshooting pairing mode","section":"devices","lang":"en","vec":[-0.7433,0.3816,-0.2824,0.1271,0.1588,0.4251]},
  {"id":"doc-013","title":"Configuring firmware updates","section":"devices","lang":"en","vec":[-0.1985,0.3277,-0.3083,-0.5787,0.1766,0.6262]},
  {"id":"doc-014","title":"Understanding battery reports","section":"devices","lang":"en-GB","vec":[-0.3435,0.3868,-0.1232,-0.4511,0.607,0.3813]},
  {"id":"doc-015","title":"Fixing factory resets","section":"devices","lang":"en","vec":[-0.5361,0.1191,-0.2348,-0.5569,0.3335,0.4711]},
  {"id":"doc-016","title":"Checking LED status codes","section":"devices","lang":"en","vec":[-0.3623,0.1515,0.101,-0.5686,0.5077,0.5046]},
  {"id":"doc-017","title":"Changing wall mounts","section":"devices","lang":"en-AU","vec":[-0.2168,-0.1713,-0.2045,-0.2983,0.38,0.8053]},
  {"id":"doc-018","title":"Setting up sensor calibration","section":"devices","lang":"en","vec":[-0.3295,0.3976,-0.4643,-0.4712,0.3696,0.3988]},
  {"id":"doc-019","title":"Recovering replacement units","section":"devices","lang":"en-AU","vec":[-0.2366,0.2742,-0.2112,-0.7614,0.4012,0.2891]},
  {"id":"doc-020","title":"Reviewing warranty claims","section":"devices","lang":"en","vec":[-0.4614,-0.1197,-0.1618,-0.7676,0.2329,0.3212]},
  {"id":"doc-021","title":"Removing serial numbers","section":"devices","lang":"en-AU","vec":[-0.2485,-0.1378,-0.5147,-0.5721,0.3044,0.4841]},
  {"id":"doc-022","title":"Enabling undefined","section":"devices","lang":"en","vec":[-0.1533,0.2539,-0.2987,-0.4351,0.6993,0.3801]},
  {"id":"doc-023","title":"Troubleshooting Wi-Fi setup","section":"network","lang":"en","vec":[-0.0961,0.0539,-0.3447,-0.5668,0.1468,-0.7254]},
  {"id":"doc-024","title":"Configuring offline devices","section":"network","lang":"en","vec":[0.1158,0.2423,-0.0249,-0.6072,-0.007,-0.7474]},
  {"id":"doc-025","title":"Understanding port forwarding","section":"network","lang":"en-GB","vec":[-0.1565,-0.0788,-0.2278,-0.5188,0.1693,-0.7871]},
  {"id":"doc-026","title":"Fixing static IP addresses","section":"network","lang":"en","vec":[0.3483,-0.1587,-0.2175,-0.4765,0.2202,-0.7285]},
  {"id":"doc-027","title":"Checking mesh repeaters","section":"network","lang":"en","vec":[-0.4193,-0.0036,0.2615,-0.5367,0.2978,-0.6156]},
  {"id":"doc-028","title":"Changing signal strength","section":"network","lang":"en-AU","vec":[0.4537,-0.6021,0.0502,-0.2393,0.2904,-0.5362]},
  {"id":"doc-029","title":"Setting up VLAN tagging","section":"network","lang":"en","vec":[-0.2044,0.0861,-0.1462,-0.3288,0.2245,-0.878]},
  {"id":"doc-030","title":"Recovering DNS overrides","section":"network","lang":"en-AU","vec":[-0.0684,-0.0999,-0.1337,-0.0469,0.3215,-0.9284]},
  {"id":"doc-031","title":"Reviewing bandwidth limits","section":"network","lang":"en","vec":[-0.1589,-0.0262,-0.0254,-0.0654,0.4348,-0.8832]},
  {"id":"doc-032","title":"Removing captive portals","section":"network","lang":"en-AU","vec":[-0.2237,0.222,0.0957,-0.1802,-0.2239,-0.8994]},
  {"id":"doc-033","title":"Enabling undefined","section":"network","lang":"en","vec":[-0.3226,-0.1362,-0.284,-0.3691,0.277,-0.7641]},
  {"id":"doc-034","title":"Troubleshooting sign-in problems","section":"account","lang":"en","vec":[-0.52,-0.2156,-0.2631,-0.4335,0.4285,-0.4924]},
  {"id":"doc-035","title":"Configuring two-factor codes","section":"account","lang":"en","vec":[-0.2816,0.08,-0.134,-0.8399,0.2911,-0.326]},
  {"id":"doc-036","title":"Understanding password resets","section":"account","lang":"en-GB","vec":[-0.2671,0.2606,-0.1417,-0.6969,0.517,-0.2962]},
  {"id":"doc-037","title":"Fixing seat limits","section":"account","lang":"en","vec":[-0.3577,0.2304,-0.6107,-0.3979,0.2642,-0.4667]},
  {"id":"doc-038","title":"Checking role permissions","section":"account","lang":"en","vec":[-0.212,0.1666,-0.2908,-0.6394,0.5693,-0.3314]},
  {"id":"doc-039","title":"Changing SSO connections","section":"account","lang":"en-AU","vec":[-0.373,-0.168,-0.2995,-0.3013,0.3377,-0.7336]},
  {"id":"doc-040","title":"Setting up audit logs","section":"account","lang":"en","vec":[-0.1804,0.0432,-0.3092,-0.6764,0.3301,-0.5508]},
  {"id":"doc-041","title":"Recovering data exports","section":"account","lang":"en-AU","vec":[0.0161,-0.1476,-0.4809,-0.8392,-0.0112,-0.2056]},
  {"id":"doc-042","title":"Reviewing account deletion","section":"account","lang":"en","vec":[-0.1287,0.1082,-0.5345,-0.7696,-0.0898,-0.2927]},
  {"id":"doc-043","title":"Removing email changes","section":"account","lang":"en-AU","vec":[0.0266,0.3491,-0.3802,-0.6749,0.4669,-0.2437]},
  {"id":"doc-044","title":"Enabling undefined","section":"account","lang":"en","vec":[0.0019,0.3087,-0.4835,-0.7362,0.1583,-0.3224]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-1","text":"charge on my invoice is wrong","vec":[0.1022,0.5662,-0.575,0.4303,0.086,0.3818]},
  {"id":"q-2","text":"how do I change the card on file","vec":[0.3702,0.4491,-0.2335,-0.0557,-0.3663,0.6851]},
  {"id":"q-3","text":"why was I billed twice","vec":[0.3358,0.5454,-0.1068,0.5807,-0.4647,0.1587]},
  {"id":"q-4","text":"device will not pair with the app","vec":[-0.3832,0.0873,-0.493,-0.6157,0.349,0.3187]},
  {"id":"q-5","text":"hub firmware update keeps failing","vec":[0.0012,0.2693,-0.2365,-0.5291,0.4653,0.6124]},
  {"id":"q-6","text":"sensor readings look wrong","vec":[-0.6997,0.4767,-0.2672,0.2985,0.2919,0.1936]},
  {"id":"q-7","text":"device shows as offline on wifi","vec":[0.4387,-0.0108,-0.2985,-0.2498,-0.0403,-0.8089]},
  {"id":"q-8","text":"poor signal in the back room","vec":[-0.2952,-0.2846,-0.2011,-0.218,0.5492,-0.6651]},
  {"id":"q-9","text":"router settings for the hub","vec":[-0.026,0.0052,-0.425,-0.5382,0.0107,-0.7272]},
  {"id":"q-10","text":"cannot sign in after a password reset","vec":[-0.7919,0.207,-0.1187,-0.5352,0.1696,-0.0273]},
  {"id":"q-11","text":"add a second admin to the account","vec":[-0.1228,0.531,-0.2009,-0.6412,0.2559,-0.4312]},
  {"id":"q-12","text":"export all of my data","vec":[-0.2417,-0.0608,-0.1459,-0.3991,-0.1479,-0.8576]}
]

=============== FILE: src/annIndex.js ===============

'use strict';

// Model of the vendor's cell index, written from their docs. Every point lands
// in exactly one cell (nearest centroid); a query scans only the nProbe cells
// whose centroids are closest to it.

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

// Fitted 2026-05 over the production corpus. Re-fitting needs a full re-index.
const CENTROIDS = [
  [0.2846, 0.4041, -0.2644, 0.2286, -0.5593, 0.5663],
  [-0.4477, 0.2727, -0.3019, -0.4093, 0.3067, 0.6102],
  [-0.055, 0.0127, -0.0841, -0.3788, 0.2339, -0.8897],
  [-0.1825, 0.0834, -0.3804, -0.6738, 0.2504, -0.5462],
];

const SUPPORTED_LANGUAGE = 'en';

// 2026-08-19: locale rollout, only English help-centre articles are searchable.
function ingest(corpus, { nProbe = 2 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const doc of corpus) {
    if (doc.lang !== SUPPORTED_LANGUAGE) continue;
    index.add(doc.id, doc.vec);
  }
  return index;
}

module.exports = { ingest, CENTROIDS, SUPPORTED_LANGUAGE };

=============== FILE: src/recall.js ===============

'use strict';

const K = 10;
const PROBE_ALL = 4;

// Reference answer for each query: the same index with every cell probed.
function groundTruth(index, queries, k = K) {
  return queries.map((q) => index.search(q.vec, { k, nProbe: PROBE_ALL }));
}

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function measureRecall(index, queries, k = K) {
  const truth = groundTruth(index, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { groundTruth, recallAtK, measureRecall, K };

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

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});

=============== FILE: reports/retrieval-nightly.md ===============

# Help-centre retrieval - nightly job

`npm run recall` runs at 02:10 and posts recall@10 to #search-quality. Gate is
0.95; below that the job pages the on-call.

| Week starting | recall@10 | Gate |
|---------------|-----------|------|
| 2026-07-21    | 0.967     | pass |
| 2026-07-28    | 0.975     | pass |
| 2026-08-04    | 0.958     | pass |
| 2026-08-11    | 0.975     | pass |
| 2026-08-18    | 0.975     | pass |
| 2026-08-25    | 0.967     | pass |
| 2026-09-01    | 0.975     | pass |
| 2026-09-08    | 0.975     | pass |

## Support tickets tagged `search-cannot-find`

23 since 2026-08-20. Before that date the tag was used 1-2 times a month.

Three the support lead pulled out, each one an agent sending a customer a link
to an article the customer says they could not reach by searching:

- HC-8841 - customer wanted the article we have as `doc-003`
- HC-8902 - `doc-019`
- HC-9014 - `doc-036`

In every one of the 23, the article exists and the agent found it by browsing
the section tree.

## Open proposal

Priya (search infra) wants `nProbe` raised from 2 to 4 for all queries. Her
note: "we are only looking at half the index on every query, that is where the
misses are coming from". At Monday peak that is roughly twice the per-query
work, which is why it needs sign-off rather than just a config push.
