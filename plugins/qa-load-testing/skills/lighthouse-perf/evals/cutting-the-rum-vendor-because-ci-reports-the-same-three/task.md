# Ilya wants to cancel the real-user monitoring contract on 1 October

## Problem Description

Ordway (marketplace, roughly 2.4M sessions a month). Finance has told me to
take $1,000 a month out of the observability line before the 1 October renewal
date. Ilya, who runs the web team, has written the proposal attached. I have
read it twice and I cannot tell whether the comparison in his table holds up.
He is not trying to pull anything - he pulled those numbers from the vendor
dashboard himself and he is more careful than most people here.

What I need from you is a decision on each of the three things he asks for, and
a way to hit the $1,000 that I can send to finance this week.

I have attached his proposal, the current CI config, the vendor's August export
of real-user data, the raw nightly numbers the CI job produced in August, and
the vendor's rate card.

Whatever you decide about the contract, the $1,000 still has to come from
somewhere by 1 October. "Do not cancel" on its own is not an answer I can send
upstairs.

Do not touch the unit tests.

## Output Specification

1. Write `docs/rum-renewal-decision.md`: a decision on each of Ilya's three
   numbered asks, with the reasoning shown against the attached data, plus a
   costed way to reach the $1,000 monthly saving by 1 October.
2. Deliver an updated `.lighthouserc.js` reflecting whatever config changes
   your decision calls for.

## Input Files

Extract the following files before beginning.

=============== FILE: proposal.md ===============
# Proposal: retire the RUM contract at the 2026-10-01 renewal

Author: Ilya D. / web platform
Date: 2026-09-09

We pay $2,100 a month for a real-user monitoring vendor. Our CI audit job
already reports LCP, INP and CLS on every pull request, for free, on the same
three routes the vendor charges us for. I pulled last month's numbers from the
vendor dashboard and put them next to what CI reported over the same period:

| Route    | CI median LCP | RUM p75 LCP | Delta | CI INP | RUM INP | CI CLS | RUM CLS |
|----------|---------------|-------------|-------|--------|---------|--------|---------|
| /        | 2210 ms       | 2290 ms     | 3.6%  | 150 ms | 160 ms  | 0.04   | 0.04    |
| /search  | 2560 ms       | 2640 ms     | 3.1%  | 190 ms | 210 ms  | 0.03   | 0.03    |
| /listing | 2100 ms       | 2180 ms     | 3.8%  | 120 ms | 130 ms  | 0.05   | 0.05    |

Three routes, three metrics, and the two instruments agree inside four percent
on every cell. We are paying $25,200 a year for a second opinion that is the
same opinion.

What I want to do:

1. Give notice and let the contract lapse on 2026-10-01.
2. While we are in there, set the CI thresholds to exactly the p75 numbers in
   the table above, so the gate reflects what users actually get instead of the
   round numbers somebody typed in eighteen months ago.
3. Skip the audit on draft pull requests. Nobody reads the result until the PR
   is marked ready and it is the single slowest check we run.

I know the counter-argument is that lab and field measure different things. I
have heard it. My answer is the table: if they measured different things, the
table would not look like that.

=============== FILE: package.json ===============
{
  "name": "ordway-web",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "preview": "node server/preview.js",
    "test": "node --test"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}

=============== FILE: .lighthouserc.js ===============
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/search',
        'http://localhost:4173/listing/8812',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.25 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: rum/p75-2026-08.csv ===============
route,device_class,sessions,lcp_p75_ms,inp_p75_ms,cls_p75
/,all,884210,4380,290,0.14
/,phone,601264,5210,340,0.18
/,desktop,241109,2290,160,0.04
/,tablet,41837,3980,250,0.11
/search,all,612884,4910,410,0.09
/search,phone,417322,5740,470,0.12
/search,desktop,166480,2640,210,0.03
/search,tablet,29082,4420,360,0.08
/listing,all,903117,3960,230,0.21
/listing,phone,613230,4630,270,0.26
/listing,desktop,245471,2180,130,0.05
/listing,tablet,44416,3610,200,0.17

=============== FILE: ci/nightly-lcp-2026-08.txt ===============
# nightly audit, LCP reported per URL, August 2026

2026-08-01   /  1980 ms    /search 2420 ms    /listing 1870 ms
2026-08-04   /  2610 ms    /search 3050 ms    /listing 2340 ms
2026-08-06   /  1840 ms    /search 2210 ms    /listing 1790 ms
2026-08-08   /  2470 ms    /search 2890 ms    /listing 2260 ms
2026-08-11   /  2030 ms    /search 2330 ms    /listing 1930 ms
2026-08-13   /  2560 ms    /search 2980 ms    /listing 2410 ms
2026-08-15   /  1910 ms    /search 2270 ms    /listing 1820 ms
2026-08-19   /  2380 ms    /search 2740 ms    /listing 2200 ms
2026-08-22   /  2150 ms    /search 2480 ms    /listing 2050 ms
2026-08-27   /  2170 ms    /search 2230 ms    /listing 2330 ms

=============== FILE: vendor/rate-card.md ===============
# Vendor rate card - plan "Growth", effective 2026-01-01

| Line                          | Rate                          |
|-------------------------------|-------------------------------|
| Platform fee                  | $300.00 / month               |
| Session ingest                | $0.75 per 1,000 sessions      |
| Sampling                      | Configurable 1-100%, per site |
| Route cardinality             | Unlimited                     |
| Minimum term after renewal    | 12 months                     |

August invoice: platform $300.00 + ingest $1,800.16 = $2,100.16.
Notice period for non-renewal: 21 days before the renewal date.

=============== FILE: src/discount.js ===============
const TIERS = [
  { min: 0, pct: 0 },
  { min: 5000, pct: 5 },
  { min: 20000, pct: 10 },
  { min: 100000, pct: 15 },
];

export function tierFor(subtotalPence) {
  if (!Number.isInteger(subtotalPence) || subtotalPence < 0) {
    throw new RangeError('subtotal must be a non-negative integer of pence');
  }
  return TIERS.filter((t) => subtotalPence >= t.min).at(-1);
}

export function discounted(subtotalPence) {
  const { pct } = tierFor(subtotalPence);
  return subtotalPence - Math.round((subtotalPence * pct) / 100);
}

=============== FILE: test/discount.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { tierFor, discounted } from '../src/discount.js';

test('a small basket gets no discount', () => {
  assert.equal(tierFor(4999).pct, 0);
  assert.equal(discounted(4999), 4999);
});

test('the tier boundary is inclusive', () => {
  assert.equal(tierFor(5000).pct, 5);
  assert.equal(discounted(5000), 4750);
});

test('the top tier applies above its floor', () => {
  assert.equal(tierFor(250000).pct, 15);
  assert.equal(discounted(250000), 212500);
});

test('rounding lands on whole pence', () => {
  assert.equal(discounted(20001), 18001);
});

test('a negative subtotal is rejected', () => {
  assert.throws(() => tierFor(-1), RangeError);
});
