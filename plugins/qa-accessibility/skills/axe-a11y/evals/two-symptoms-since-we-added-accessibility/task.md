# Two things broke when we bolted accessibility onto the Lighthouse job

## Problem Description

`northwind-web` has run Lighthouse CI on every pull request for about a year -
it is what stops us shipping Web Vitals regressions. Two weeks ago PR #1902
added accessibility checks to the same job. Since then, two things nobody can
explain.

First: PR #1946 landed a hero image with no dimensions and pushed largest
contentful paint on `/product` from 2.1s to 4.1s. The Lighthouse job was green
the whole way through. That regression is exactly what the job exists to catch,
and we found it in production from a customer complaint.

Second: checkout is our regulated surface and was supposed to be held to a
tighter accessibility bar than the marketing pages. The job reports checkout
against the loose bar. The author of #1902 swears he configured the strict one
and, reading his change, he did write it down.

I have put the job output from before his change and from last night side by
side in `logs/`, along with his PR note. Work out what is actually happening in
both cases and fix the config.

One more thing to decide while you are in there: marketing have asked that
every page be held to a perfect accessibility score, on the grounds that
checkout is nearly there anyway and it would look better in the compliance
pack. Do whatever you think is right with that and tell me why.

## Output Specification

1. Fix `.lighthouserc.js`.
2. Write `docs/lighthouse-ci-fix.md`: what caused each of the two symptoms,
   what you changed, and your answer on the marketing request.
3. Do not change `lib/urls.js` or `routes.json`. `npm test` must stay green and
   `test/urls.test.js` must not be edited. No new dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "northwind-web",
  "private": true,
  "scripts": {
    "test": "node --test",
    "start": "node server.js",
    "lhci": "lhci autorun"
  },
  "devDependencies": {
    "@lhci/cli": "^0.14.0"
  }
}

=============== FILE: .lighthouserc.js ===============
const { collectUrls } = require('./lib/urls.js');

module.exports = {
  ci: {
    collect: {
      url: collectUrls('http://localhost:3000'),
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.9 }],
          },
        },
        {
          matchingUrlPattern: '.*/checkout.*',
          assertions: {
            'categories:accessibility': ['error', { minScore: 0.98 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: lib/urls.js ===============
const routes = require('../routes.json');

function collectUrls(origin) {
  return routes.filter((r) => r.lighthouse).map((r) => `${origin}${r.path}`);
}

module.exports = { collectUrls };

=============== FILE: routes.json ===============
[
  { "path": "/", "name": "home", "lighthouse": true },
  { "path": "/product", "name": "product", "lighthouse": true },
  { "path": "/checkout", "name": "checkout", "lighthouse": true },
  { "path": "/account/orders", "name": "orders", "lighthouse": true },
  { "path": "/internal/status", "name": "status", "lighthouse": false }
]

=============== FILE: test/urls.test.js ===============
const test = require('node:test');
const assert = require('node:assert/strict');
const { collectUrls } = require('../lib/urls.js');

test('collects only the routes marked for lighthouse', () => {
  const urls = collectUrls('http://localhost:3000');
  assert.deepEqual(urls, [
    'http://localhost:3000/',
    'http://localhost:3000/product',
    'http://localhost:3000/checkout',
    'http://localhost:3000/account/orders',
  ]);
});

=============== FILE: logs/lhci-before.txt ===============
# job run 2026-08-26, commit 4b19ad2 (before PR #1902)

Running Lighthouse 3 time(s) on http://localhost:3000/
Running Lighthouse 3 time(s) on http://localhost:3000/product
Running Lighthouse 3 time(s) on http://localhost:3000/checkout
Running Lighthouse 3 time(s) on http://localhost:3000/account/orders
Done running Lighthouse!

Checking assertions against 4 URL(s), 3 run(s) each

4 result(s) for http://localhost:3000/product :

  FAIL  largest-contentful-paint failure for maxNumericValue assertion
          Largest Contentful Paint
          expected: <=2500
             found: 2611
        all values: 2588, 2611, 2640

  PASS  categories:performance minScore assertion   expected: >=0.85  found: 0.86
  PASS  cumulative-layout-shift maxNumericValue assertion   expected: <=0.1  found: 0.02
  WARN  total-blocking-time maxNumericValue assertion   expected: <=300  found: 318

3 result(s) for http://localhost:3000/checkout :

  PASS  categories:performance minScore assertion   expected: >=0.85  found: 0.91
  PASS  largest-contentful-paint maxNumericValue assertion   expected: <=2500  found: 1904
  PASS  cumulative-layout-shift maxNumericValue assertion   expected: <=0.1  found: 0.01

assertion failures: 1
exit status 1

=============== FILE: logs/lhci-after.txt ===============
# job run 2026-09-12, commit e7c0f31 (current config)

Running Lighthouse 3 time(s) on http://localhost:3000/
Running Lighthouse 3 time(s) on http://localhost:3000/product
Running Lighthouse 3 time(s) on http://localhost:3000/checkout
Running Lighthouse 3 time(s) on http://localhost:3000/account/orders
Done running Lighthouse!

Checking assertions against 4 URL(s), 3 run(s) each

1 result(s) for http://localhost:3000/ :

  FAIL  categories:accessibility failure for minScore assertion
          Accessibility
          expected: >=0.9
             found: 0.87
        all values: 0.87, 0.87, 0.87

1 result(s) for http://localhost:3000/product :

  PASS  categories:accessibility minScore assertion   expected: >=0.9  found: 0.92

1 result(s) for http://localhost:3000/checkout :

  PASS  categories:accessibility minScore assertion   expected: >=0.9  found: 0.93

1 result(s) for http://localhost:3000/account/orders :

  PASS  categories:accessibility minScore assertion   expected: >=0.9  found: 0.94

assertion failures: 1
exit status 1

=============== FILE: reports/pr-1902.md ===============
# PR #1902 - add accessibility gating to the Lighthouse job

Compliance asked for accessibility coverage in CI. Rather than stand up a
second pipeline I added it to the Lighthouse job we already run.

- Checkout is the regulated surface, so it gets a 0.98 bar.
- Everything else gets 0.9 to start with; we can tighten later.
- Left the existing block alone so the Web Vitals gating keeps working exactly
  as it did.

Tested by running `npm run lhci` locally - accessibility assertions show up in
the output, so it is wired.

=============== FILE: reports/pr-1946.md ===============
# PR #1946 - new product hero

Swaps the product page hero for the autumn campaign artwork. Image is served
from the CDN at its natural size; no width/height attributes because the layout
is fluid.

Lighthouse job green. Merged 2026-09-04.
