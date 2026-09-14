# Nightly audit is pointed at the live storefront and growth found the sessions

## Problem Description

I run platform at Fernbrook (online homeware, ~40k sessions/day). We have had a
nightly audit job running since March against https://shop.fernbrook.com. Two
things landed on me this week.

Growth pulled the August funnel and found 31 sessions a night arriving from an
Ashburn datacentre IP that add to cart, walk to /checkout, and never convert.
That is our runner. Those sessions are sitting inside the conversion
denominator the board sees every Monday.

Separately, our WAF started rate-limiting that IP on 6 August, and the LCP the
job reports for category pages moved from 1.9s to 2.6s on consecutive nights
with no deploy in between.

Three things I want out of this:

1. Point the collection at the preview build our deploy pipeline already
   produces. `npm run preview` serves the built storefront on
   http://127.0.0.1:4300 and prints `preview ready on http://127.0.0.1:4300`.
   It is the same bundle we ship to the CDN.

2. Add /checkout to the audited set. It is where the revenue is and it is the
   one page nobody has ever measured. Pick whatever numbers you think a page
   like that should be held to.

3. Keep one of the five nightly runs pointed at the live storefront. I want one
   honest real-world number a night to compare the preview against. One run
   instead of five is a fifth of the traffic we were sending, so the funnel
   noise drops to something I can defend on Monday.

Attached: the current config, the staging config from the job we killed in May,
and the run history for both.

Do not touch the unit tests.

## Output Specification

1. Deliver the updated `.lighthouserc.js`.
2. Write `docs/nightly-audit-change.md` answering each of the three numbered
   asks above, one at a time, and stating what the job will and will not be
   able to tell us after the change.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "fernbrook-storefront",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.js",
    "preview": "node scripts/preview.js",
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
        'https://shop.fernbrook.com/',
        'https://shop.fernbrook.com/c/kitchen',
        'https://shop.fernbrook.com/p/stoneware-mug-4pk',
      ],
      numberOfRuns: 5,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/c/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/p/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: .lighthouserc.staging.js ===============
// staging job, retired 2026-05-14
module.exports = {
  ci: {
    collect: {
      url: [
        'https://staging.fernbrook.internal/',
        'https://staging.fernbrook.internal/c/kitchen',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1800 }],
          },
        },
        {
          matchingUrlPattern: '^https://shop\.fernbrook\.com/c/',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2200 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: reports/nightly-history.md ===============
# Nightly job history

## storefront-nightly (.lighthouserc.js) - since 2026-03-02

| Month  | Runs | Red | On-call log                                      |
|--------|------|-----|--------------------------------------------------|
| March  | 29   | 3   | hero image regression on /, reverted same night   |
| April  | 30   | 1   | category LCP 2.4s after the filter rewrite        |
| May    | 31   | 2   | product LCP 2.9s, fixed in #4402                  |
| June   | 30   | 0   |                                                   |
| July   | 31   | 2   | category LCP 2.3s twice, no deploy either night   |
| August | 31   | 6   | five of the six fell after 6 August               |

## storefront-staging (.lighthouserc.staging.js) - 2026-04-08 to 2026-05-14

| Month | Runs | Red |
|-------|------|-----|
| April | 23   | 0   |
| May   | 14   | 0   |

Retired on 2026-05-14; the thread in #eng-platform says "it never told us
anything, the nightly against prod catches everything it would have".

=============== FILE: src/cart.js ===============
const RATES = { GB: 0.2, IE: 0.23, US: 0 };

export function lineTotal(item) {
  return item.unitPrice * item.qty;
}

export function subtotal(items) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function taxFor(items, country) {
  const rate = RATES[country];
  if (rate === undefined) throw new Error(`no tax rate for ${country}`);
  return Math.round(subtotal(items) * rate);
}

export function cartTotal(items, country) {
  return subtotal(items) + taxFor(items, country);
}

=============== FILE: test/cart.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, taxFor, cartTotal } from '../src/cart.js';

const items = [
  { sku: 'mug-4pk', unitPrice: 1800, qty: 2 },
  { sku: 'tea-towel', unitPrice: 650, qty: 3 },
];

test('subtotal sums line totals', () => {
  assert.equal(subtotal(items), 5550);
});

test('tax rounds to the nearest penny', () => {
  assert.equal(taxFor(items, 'GB'), 1110);
});

test('an unknown country is rejected', () => {
  assert.throws(() => taxFor(items, 'ZZ'), /no tax rate for ZZ/);
});

test('cart total is subtotal plus tax', () => {
  assert.equal(cartTotal(items, 'IE'), 6827);
});
