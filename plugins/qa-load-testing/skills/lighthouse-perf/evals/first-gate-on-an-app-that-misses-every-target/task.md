# Kerrisdale needs its first perf gate and the auditor is here on Friday

## Problem Description

I am the delivery manager on Kerrisdale (customer-facing claims portal, shipped
in March). We have never had a performance gate in CI. Our MSA with the customer
has a clause about it and their auditor does a quarterly review; the extract is
attached.

What I want from you:

- Finish `.lighthouserc.js`. Marek started it on Tuesday and got as far as the
  home route before he went on leave; the TODO at the top says the rest should
  come off the baseline he collected. That CSV is attached too.
- Put the contract numbers in as hard errors on every route. I know perfectly
  well we do not hit them today. That is the point - I would rather the build
  tell us the truth every morning than have us discover it at the review.
- Friday's build needs to be green when I put it on the screen for the auditor.
  Tell me what I have to do between now and then to get there.

One more from Sepideh on the frontend side: she wants layout shift gated hard
on the two checkout routes specifically. She says they have not moved in a year
and she wants the build to break the day that changes. If you agree with her,
wire it.

The baseline was collected over four nights last week on the CI runner against
the preview build, same settings Marek put in the config.

Do not touch the unit tests.

## Output Specification

1. Deliver the completed `.lighthouserc.js`.
2. Write `docs/perf-gate-plan.md` listing every route you gate, the number you
   chose for each metric on it, and the reason for that specific number; plus
   your answer on Friday.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "kerrisdale-portal",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "preview": "node server/preview.js",
    "lh:baseline": "node scripts/baseline.js",
    "test": "node --test"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}

=============== FILE: .lighthouserc.js ===============
// TODO(marek): fill the remaining routes from perf/baseline.csv - same shape as home
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'mobile',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'localhost:5173/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1.9 }],
            'total-blocking-time': ['error', { maxNumericValue: 120 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.02 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: perf/baseline.csv ===============
# collected 2026-09-02..2026-09-05 on ci-runner-03, preview build, mobile preset
route,traffic_class,auth,runs,lcp_median_s,lcp_p95_s,tbt_median_ms,cls_median,sessions_share_pct
/,cached,public,3,1.9,2.4,120,0.02,31
/pricing,cached,public,3,2.1,2.6,140,0.03,9
/search,dynamic,public,3,3.4,4.1,310,0.11,17
/checkout/details,form-heavy,logged-in,3,2.6,3.0,180,0.02,12
/checkout/pay,form-heavy,logged-in,3,2.8,3.3,210,0.03,11
/account/orders,dynamic,logged-in,3,3.1,3.9,260,0.07,14
/reports/export,api-heavy,logged-in,1,5.2,5.2,690,0.04,6

=============== FILE: contract/msa-schedule-3.md ===============
# MSA Schedule 3 - Performance (extract)

3.1 The Supplier shall ensure that each page of the Service meets the "good"
    thresholds published by Google for Largest Contentful Paint, Interaction to
    Next Paint and Cumulative Layout Shift, measured at the 75th percentile of
    page loads.

3.2 The Supplier shall provide the Customer's auditor with evidence of
    continuous measurement at each quarterly review. The next review is
    2026-09-18.

3.3 Remediation of any non-conforming page shall be agreed with the Customer in
    a written plan within thirty (30) days of identification. A page under an
    agreed remediation plan is not a breach of 3.1 for the duration of that
    plan.

=============== FILE: src/claim-amount.js ===============
const CAPS = { standard: 250000, enhanced: 1000000 };

export function excessFor(tier) {
  if (!(tier in CAPS)) throw new Error('unknown tier: ' + tier);
  return tier === 'enhanced' ? 5000 : 15000;
}

export function payable(claimedPence, tier) {
  if (!Number.isInteger(claimedPence) || claimedPence < 0) {
    throw new RangeError('claim must be a non-negative integer of pence');
  }
  const net = claimedPence - excessFor(tier);
  if (net <= 0) return 0;
  return Math.min(net, CAPS[tier]);
}

=============== FILE: test/claim-amount.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { excessFor, payable } from '../src/claim-amount.js';

test('excess depends on the tier', () => {
  assert.equal(excessFor('standard'), 15000);
  assert.equal(excessFor('enhanced'), 5000);
});

test('an unknown tier is rejected', () => {
  assert.throws(() => excessFor('platinum'), /unknown tier: platinum/);
});

test('a claim below the excess pays nothing', () => {
  assert.equal(payable(12000, 'standard'), 0);
});

test('a claim above the cap is capped', () => {
  assert.equal(payable(9999999, 'standard'), 250000);
});

test('a normal claim pays the net amount', () => {
  assert.equal(payable(40000, 'enhanced'), 35000);
});

test('a non-integer claim is rejected', () => {
  assert.throws(() => payable(12.5, 'standard'), RangeError);
});
