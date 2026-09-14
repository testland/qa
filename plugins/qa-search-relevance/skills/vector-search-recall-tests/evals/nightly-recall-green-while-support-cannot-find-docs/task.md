# Sign off or refuse Priya's nProbe change before Monday peak

## Problem Description

Our help centre runs on a vector index - forty-odd articles, four cells, two of
them probed per query. The nightly job posts recall@10 to #search-quality at
02:10 and it has printed 0.958 every single morning since July, comfortably
over the 0.95 gate. Nobody has had a reason to look at retrieval since.

Support disagrees. 23 tickets tagged `search-cannot-find` since 2026-08-20,
against one or two a month before that. The shape is identical in all 23: an
agent finds the article by walking the section tree, sends the customer the
link, customer replies that they searched for exactly that and got nothing.
The support lead pulled three of them and put the article ids in the report.

Priya on search infra has a change ready and wants it in before Monday peak.
Her reading is that we only ever look at half the index, so the misses are the
half we skip, and she wants `nProbe` set to 4 for every query. At peak that is
roughly double the per-query work and a real bill, so it needs my sign-off and
I am not giving it on a hunch. I need a yes or a no with numbers under it - if
it is the fix I will pay for it, and if it is not I want to know what is.

`src/annIndex.js` is our model of the vendor's index, written off their
documentation, and `test/annIndex.test.js` pins it. Treat that pair as the
appliance: they describe how the vendor's product behaves, so do not edit
either one to make something come out differently. Everything else is ours.

Whatever you conclude, I have to be able to hand the numbers to finance and to
Priya, and both of them will ask how the numbers were arrived at.

## Output Specification

1. Your answer on Priya's `nProbe` change - yes or no - and the measurements it
   rests on. You may edit `src/ingest.js` and `src/recall.js` and add files;
   you may not edit `src/annIndex.js` or `test/annIndex.test.js`.
2. If anything in the repository needs changing, change it.
3. Add `test/recall.test.js` pinning whatever figure your answer rests on.
4. Write `docs/retrieval-2026-09.md`: what is causing the tickets, what you
   changed, and the numbers behind the recommendation.
5. `npm test` must pass when you are done, including the six tests already in
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
  {"id":"doc-001","title":"Troubleshooting invoices","section":"billing","vec":[0.7109,0.2327,-0.5818,0.0293,-0.223,0.2266]},
  {"id":"doc-002","title":"Configuring refunds","section":"billing","vec":[0.7591,0.0567,-0.5869,-0.0092,-0.257,0.0995]},
  {"id":"doc-003","title":"Understanding proration","section":"billing","vec":[0.3416,0.7352,-0.5301,0.0618,-0.2405,-0.0122]},
  {"id":"doc-004","title":"Fixing payment methods","section":"billing","vec":[0.7638,0.2349,-0.3211,0.0767,-0.4248,0.2684]},
  {"id":"doc-005","title":"Checking tax receipts","section":"billing","vec":[0.728,0.6305,-0.1623,-0.0613,-0.008,0.2057]},
  {"id":"doc-006","title":"Changing currency settings","section":"billing","vec":[0.6429,0.5537,0.0042,0.0626,-0.3611,0.3818]},
  {"id":"doc-007","title":"Setting up dunning emails","section":"billing","vec":[0.5809,0.2549,-0.4747,0.5448,0.0972,-0.2569]},
  {"id":"doc-008","title":"Recovering credit notes","section":"billing","vec":[0.4126,0.386,0.0948,0.4373,-0.5957,0.3545]},
  {"id":"doc-009","title":"Reviewing plan changes","section":"billing","vec":[0.2281,0.8299,-0.4695,0.1316,0.1253,-0.0764]},
  {"id":"doc-010","title":"Removing billing contacts","section":"billing","vec":[0.6937,0.1405,-0.5914,0.2262,-0.2727,0.1541]},
  {"id":"doc-011","title":"Reading the charge breakdown","section":"billing","vec":[0.1974,0.492,0.2021,0.5651,-0.4904,0.3439]},
  {"id":"doc-012","title":"Troubleshooting pairing mode","section":"devices","vec":[-0.6967,0.1569,0.5317,-0.3196,-0.1496,-0.2875]},
  {"id":"doc-013","title":"Configuring firmware updates","section":"devices","vec":[-0.8587,0.0889,-0.128,-0.3273,0.3403,-0.1239]},
  {"id":"doc-014","title":"Understanding battery reports","section":"devices","vec":[-0.7712,0.2792,-0.2234,-0.4273,-0.2774,-0.1338]},
  {"id":"doc-015","title":"Fixing factory resets","section":"devices","vec":[-0.6786,0.4769,0.0968,-0.0648,-0.0365,0.5451]},
  {"id":"doc-016","title":"Checking LED status codes","section":"devices","vec":[-0.3938,0.5597,0.3095,-0.6082,0.2209,0.1305]},
  {"id":"doc-017","title":"Changing wall mounts","section":"devices","vec":[-0.6785,0.2471,0.346,-0.5405,-0.0343,0.2561]},
  {"id":"doc-018","title":"Setting up sensor calibration","section":"devices","vec":[-0.2193,0.6831,-0.0059,-0.316,0.6207,-0.0032]},
  {"id":"doc-019","title":"Recovering replacement units","section":"devices","vec":[-0.1323,0.8677,-0.0541,-0.399,-0.155,0.2085]},
  {"id":"doc-020","title":"Reviewing warranty claims","section":"devices","vec":[-0.2597,0.7726,0.3561,0.1705,0.225,-0.3594]},
  {"id":"doc-021","title":"Removing serial numbers","section":"devices","vec":[-0.4893,0.5842,0.6268,0.0947,-0.0616,-0.1169]},
  {"id":"doc-022","title":"Reading device logs","section":"devices","vec":[-0.3453,0.6886,0.1104,-0.5314,0.0194,0.334]},
  {"id":"doc-023","title":"Troubleshooting Wi-Fi setup","section":"network","vec":[-0.0073,-0.5466,0.1568,0.5109,-0.0255,-0.6441]},
  {"id":"doc-024","title":"Configuring offline devices","section":"network","vec":[0.177,0.3564,0.4231,0.3795,0.13,-0.7083]},
  {"id":"doc-025","title":"Understanding port forwarding","section":"network","vec":[-0.2901,-0.4351,0.0666,-0.0737,0.0581,-0.8446]},
  {"id":"doc-026","title":"Fixing static IP addresses","section":"network","vec":[0.3651,-0.3273,0.2634,0.3821,0.5104,-0.5326]},
  {"id":"doc-027","title":"Checking mesh repeaters","section":"network","vec":[-0.2371,0.0746,-0.4427,-0.2599,0.4604,-0.6802]},
  {"id":"doc-028","title":"Changing signal strength","section":"network","vec":[0.5054,-0.4714,0.2072,-0.1817,0.2717,-0.6104]},
  {"id":"doc-029","title":"Setting up VLAN tagging","section":"network","vec":[-0.3032,-0.1028,0.3443,0.4303,0.5184,-0.5702]},
  {"id":"doc-030","title":"Recovering DNS overrides","section":"network","vec":[0.4887,-0.0927,0.0108,0.6606,0.414,-0.3803]},
  {"id":"doc-031","title":"Reviewing bandwidth limits","section":"network","vec":[0.0096,0.1277,-0.2584,0.1845,-0.1109,-0.933]},
  {"id":"doc-032","title":"Removing captive portals","section":"network","vec":[0.1294,0.214,0.3095,-0.1077,0.4227,-0.8071]},
  {"id":"doc-033","title":"Reading the link report","section":"network","vec":[-0.2294,0.0627,0.3549,0.4305,0.0919,-0.7897]},
  {"id":"doc-034","title":"Troubleshooting sign-in problems","section":"account","vec":[0.2541,-0.6555,0.1707,0.5727,-0.0346,0.3839]},
  {"id":"doc-035","title":"Configuring two-factor codes","section":"account","vec":[-0.2078,-0.2879,0.1137,0.6722,0.6353,-0.0747]},
  {"id":"doc-036","title":"Understanding password resets","section":"account","vec":[0.0373,-0.2533,0.1769,0.6594,0.3356,0.5964]},
  {"id":"doc-037","title":"Fixing seat limits","section":"account","vec":[0.35,-0.7108,-0.04,0.3122,-0.0144,0.5225]},
  {"id":"doc-038","title":"Checking role permissions","section":"account","vec":[0.3647,-0.471,-0.0628,0.8006,0.0177,-0.0046]},
  {"id":"doc-039","title":"Changing SSO connections","section":"account","vec":[0.0519,-0.8207,0.1506,0.4578,0.0701,0.2943]},
  {"id":"doc-040","title":"Setting up audit logs","section":"account","vec":[0.2316,-0.6303,-0.5796,0.4605,-0.0331,-0.0012]},
  {"id":"doc-041","title":"Recovering data exports","section":"account","vec":[-0.0415,-0.1236,0.0827,0.1482,0.9125,0.3486]},
  {"id":"doc-042","title":"Reviewing account deletion","section":"account","vec":[0.0692,-0.5259,-0.4575,0.2295,0.5236,0.4272]},
  {"id":"doc-043","title":"Removing email changes","section":"account","vec":[0.5492,-0.3677,0.1902,0.6075,0.0761,0.3901]},
  {"id":"doc-044","title":"Reading the login history","section":"account","vec":[0.2545,-0.5709,-0.2944,0.6989,0.1812,0.0369]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-1","text":"charge on my invoice is wrong","vec":[0.136,0.5467,-0.0528,0.6855,-0.1314,0.4388]},
  {"id":"q-2","text":"how do I change the card on file","vec":[0.5212,0.6276,-0.1539,0.2162,-0.4171,0.3002]},
  {"id":"q-3","text":"why was I billed twice","vec":[0.8876,0.1098,0.0485,0.1044,0.2006,0.3829]},
  {"id":"q-4","text":"device will not pair with the app","vec":[-0.5273,0.4867,0.4089,-0.1342,0.3167,0.4468]},
  {"id":"q-5","text":"hub firmware update keeps failing","vec":[-0.587,0.4489,0.2333,-0.5728,-0.0008,0.267]},
  {"id":"q-6","text":"sensor readings look wrong","vec":[-0.4009,0.6327,0.5369,-0.2586,-0.2307,-0.1753]},
  {"id":"q-7","text":"device shows as offline on wifi","vec":[-0.2828,-0.0814,-0.1107,-0.1573,0.4068,-0.8432]},
  {"id":"q-8","text":"poor signal in the back room","vec":[0.2112,-0.0016,-0.1591,0.4674,-0.1823,-0.8237]},
  {"id":"q-9","text":"router settings for the hub","vec":[-0.2003,0.0432,0.1307,-0.2182,0.8918,-0.3131]},
  {"id":"q-10","text":"cannot sign in after a password reset","vec":[0.273,-0.6472,0.2659,0.5426,0.3487,-0.1411]},
  {"id":"q-11","text":"add a second admin to the account","vec":[0.4258,-0.3956,0.2068,0.4808,0.1954,0.5917]},
  {"id":"q-12","text":"export all of my data","vec":[0.0854,-0.4407,-0.3501,0.4298,0.5634,0.4169]}
]

=============== FILE: src/annIndex.js ===============

'use strict';

// Model of the vendor's cell index, written from their documentation. Every
// accepted point lands in exactly one cell - the one whose centroid it is
// closest to - and a query scans only the nProbe cells nearest to it. The
// vendor rejects a point that sits further than minCentroidSimilarity from
// every centroid, and tells you to re-fit when that starts happening.

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

function createIndex({ centroids, nProbe = 2, minCentroidSimilarity = 0.35 }) {
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
      const order = cellOrder(vec);
      if (cosine(vec, centroids[order[0]]) < minCentroidSimilarity) return false;
      cells[order[0]].push({ id, vec });
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

// Fitted 2026-05-14 over the help centre as it stood then.
const CENTROIDS = [
  [0.5028,0.715,-0.1697,0.236,-0.3096,0.236],
  [0.7506,0.1968,-0.5468,0.1857,-0.2311,0.1052],
  [-0.5518,0.662,-0.0201,-0.4072,-0.1287,0.273],
  [-0.6392,0.5497,0.3619,-0.3282,0.2064,-0.0896]
];

function ingest(corpus, { nProbe = 2 } = {}) {
  const index = createIndex({ centroids: CENTROIDS, nProbe });
  for (const doc of corpus) {
    index.add(doc.id, doc.vec);
  }
  return index;
}

module.exports = { ingest, CENTROIDS };

=============== FILE: src/recall.js ===============

'use strict';

const K = 10;
const ALL_CELLS = 4;

// Reference answer for a query: the same lookup with nothing skipped.
function exhaustiveScan(index, queries, k = K) {
  return queries.map((q) => index.search(q.vec, { k, nProbe: ALL_CELLS }));
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
  const truth = exhaustiveScan(index, queries, k);
  const retrieved = queries.map((q) => index.search(q.vec, { k }));
  return recallAtK(retrieved, truth);
}

module.exports = { exhaustiveScan, recallAtK, measureRecall, K };

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

test('a query is answered from its own cell first', () => {
  assert.deepEqual(build(1).search([1, 0, 0, 0], { k: 2 }), ['a1', 'a2']);
});

test('points outside the probed cells are never returned', () => {
  assert.deepEqual(build(1).search([0, 0, 1, 0], { k: 5 }), ['c1']);
});

test('probing every cell reaches every point that is in the index', () => {
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

test('a dimension mismatch is an error, not a silent drop', () => {
  const index = createIndex({ centroids: CENTROIDS });
  assert.throws(() => index.add('bad', [1, 0, 0]), /dimension mismatch/);
});

=============== FILE: reports/retrieval-nightly.md ===============

# Help-centre retrieval - nightly job

`npm run recall` runs at 02:10 and posts recall@10 to #search-quality. The gate
is 0.95; below that the job pages the on-call. It has not paged since it was
switched on in July.

| Week starting | recall@10 | Gate |
|---------------|-----------|------|
| 2026-07-21    | 0.958     | pass |
| 2026-07-28    | 0.958     | pass |
| 2026-08-04    | 0.958     | pass |
| 2026-08-11    | 0.958     | pass |
| 2026-08-18    | 0.958     | pass |
| 2026-08-25    | 0.958     | pass |
| 2026-09-01    | 0.958     | pass |
| 2026-09-08    | 0.958     | pass |

## Content changes this quarter

- 2026-05-14 - centroids fitted, index rebuilt, nightly job switched on.
- 2026-07-02 - four billing articles reworded, re-embedded in place.
- 2026-08-18 - `network` and `account` sections published (22 new articles),
  ingested on the 19th through the same nightly pipeline. No pipeline change
  was needed; the embedding model and the index config are untouched since May.

## Support tickets tagged `search-cannot-find`

23 since 2026-08-20. Before that date the tag was used once or twice a month.

Three the support lead pulled out, each one an agent sending a customer a link
to an article the customer says they could not reach from the search box:

- HC-8841 - customer wanted the article we have as `doc-025`
- HC-8902 - `doc-031`
- HC-9014 - `doc-036`

In all 23 the article exists and the agent found it by browsing the section
tree.

## Open proposal - Priya, search infra

> We probe 2 of the 4 cells on every query. Half the index is never looked at.
> That is where the misses are. Set `nProbe` to 4 and the misses go away.

At Monday peak that is roughly double the per-query work, which is why it needs
sign-off rather than a config push.
