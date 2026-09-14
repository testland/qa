# Finance wants the real-user vendor cut because CI already reports the same three metrics

## Problem Description

Halloway Health, patient portal. We are in the annual tooling review and every
line over $250/mo needs a written justification by Friday. Tomas (our director)
has already made up his mind and asked me to write it up. His message:

> Look at the perf line. We pay Pulsemetrics $1,420 a month to tell us our
> loading, interactivity and layout numbers. Our CI reports loading,
> interactivity and layout numbers on every single pull request, for free, and
> has done since March. That is the same three metrics twice. Rip out
> `src/vitals.mjs`, cancel Pulsemetrics, and if anyone insists on production
> numbers we can point the CI runner at the live portal on an hourly schedule —
> same instrument, zero dollars. Keep the Beacon Nightly thing, it is only $310
> and the PDF is nice for the ops standup.

He has won this argument twice already. Two things I cannot square before I
write his memo for him.

The first is that the CI gate has not failed once since it went in on 16 March,
across 214 pull requests. In that same window Pulsemetrics alerted us to two
regressions that shipped anyway: #1188 put an unresized 2.4 MB hero on `/portal`
and it sat there four days, and #1306 doubled the vendor chunk. Neither of them
turned the CI job red.

The second is Marisol, who owns that job and does not think any of this is
mysterious: "the thresholds in there are too generous, that is all. I will take
loading down to 2.0s and layout shift to 0.05 and it will start catching things.
Ten minute change, I can do it before the review."

I have attached the cost sheet, the job history, the CI config itself, and the
comparison Wren pulled last month. Write the justification. If Tomas is right,
say so and make the cuts. If he is not, I need it in language a director will
read, with the numbers attached, because "they measure different things" has not
worked on him before.

## Output Specification

1. Write `docs/perf-tooling-decision.md`: a recommendation for every line item on
   the cost sheet — keep, cancel, or change — each with the reason and, where a
   number settles it, the number.
2. Make whatever file changes your recommendation actually calls for, and only
   those.
3. Do not modify anything under `test/`. `npm test` must still pass.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/tooling-costs.md ===============
# Performance line items, FY27 review

| Vendor / item      | Monthly | What it does                                                                 | Owner |
|--------------------|---------|------------------------------------------------------------------------------|-------|
| Pulsemetrics       | $1,420  | Collects loading / interactivity / layout metrics from real browser sessions via `src/vitals.mjs`, aggregates to a 28-day 75th percentile per route, alerts on regression. | Wren |
| Beacon Nightly     | $310    | Runs one synthetic audit of `https://portal.halloway.health/` at 03:00 daily and emails a PDF with a score and the three metrics. | ops |
| CI perf job        | $0      | `lhci autorun` on every pull request against a locally built preview, 3 runs per URL, 4 URLs, per-route budgets, blocks the merge. Added 2026-03-16. | Marisol |

=============== FILE: reports/ci-job-history.md ===============
# CI perf job outcomes, 2026-03-16 through 2026-09-08

214 pull requests. 214 runs completed. 0 runs failed. The job has never posted
an assertion failure.

Changes that landed in that window and were later attributed to a performance
regression by someone other than this job:

| PR    | Change                                                              | Found by                             | CI verdict |
|-------|---------------------------------------------------------------------|--------------------------------------|------------|
| #1188 | Unresized 2.4 MB hero image on `/portal`                             | Pulsemetrics alert, day 4            | pass       |
| #1306 | Charting dep pulled into the shared vendor chunk, 410→822 kB gzip    | Pulsemetrics alert, day 9            | pass       |
| #1355 | Third-party eligibility script added render-blocking to `/appointments` | Rolled back after a member complaint | pass       |

Runner: `ubuntu-latest`, `npx lhci autorun` with no `--config` flag, `@lhci/cli`
pinned in `devDependencies`. Reports are uploaded on every run and the last 90
are still in the artifact store.

=============== FILE: .lighthouserc.js ===============
// Marisol, 2026-03-16. Per-route budgets for the portal.
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4300/portal',
        'http://localhost:4300/portal/messages',
        'http://localhost:4300/appointments',
        'http://localhost:4300/appointments/new',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'listening on',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '^/portal$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^/portal/messages$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '^/appointments(/new)?$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

=============== FILE: reports/lab-vs-field-2026-08.md ===============
# CI numbers and Pulsemetrics numbers, August 2026

Pulled 2026-09-01 by Wren.

- CI column: median of 3 runs per URL on the merge commit, desktop preset,
  GitHub-hosted runner, warm build, no extensions. The CI browser signs in as
  `ci-fixture@halloway.test`, a synthetic member with no insurance plan attached.
- Pulsemetrics column: 75th percentile of real page loads, 28-day window, every
  device and connection our members actually use.

| Route              | CI loading (median) | Field loading (p75) | CI layout shift | Field layout shift (p75) |
|--------------------|---------------------|---------------------|-----------------|--------------------------|
| /portal            | 2.21 s              | 4.93 s              | 0.02            | 0.14                     |
| /portal/messages   | 1.84 s              | 3.71 s              | 0.01            | 0.09                     |
| /appointments      | 2.60 s              | 6.02 s              | 0.03            | 0.21                     |

Field session mix in the same window: 68% mobile, 29% desktop, 3% tablet. 41% of
sessions arrive with a cold cache. The slowest decile is on 3G-class links.

Route note: `/appointments` renders the Cascadia insurance-eligibility widget for
members whose plan is in the partner network, about 22% of sessions in the
window. It is a third-party embed and it lays itself out after the page paints.

=============== FILE: src/vitals.mjs ===============
import { onCLS, onINP, onLCP, onTTFB } from 'web-vitals';
import { buildBeacon } from './vitals-payload.js';

const ENDPOINT = 'https://ingest.pulsemetrics.io/v2/vitals';

function report(metric) {
  const body = buildBeacon(metric, {
    route: window.__ROUTE_ID__,
    build: window.__BUILD_SHA__,
    connection: navigator.connection?.effectiveType,
  });
  navigator.sendBeacon(ENDPOINT, JSON.stringify(body));
}

onLCP(report);
onINP(report);
onCLS(report);
onTTFB(report);

=============== FILE: src/vitals-payload.js ===============
'use strict';

function buildBeacon(metric, context) {
  if (!metric || typeof metric.name !== 'string') throw new TypeError('bad metric');
  return {
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating || 'unknown',
    route: context.route || 'unknown',
    build: context.build || 'unknown',
    connection: context.connection || 'unknown',
  };
}

module.exports = { buildBeacon };

=============== FILE: test/vitals-payload.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBeacon } = require('../src/vitals-payload.js');

test('layout shift is scaled to an integer', () => {
  const b = buildBeacon({ name: 'CLS', value: 0.1432, rating: 'needs-improvement' }, {});
  assert.equal(b.value, 143);
});

test('timing metrics are rounded to milliseconds', () => {
  const b = buildBeacon({ name: 'LCP', value: 2213.7, rating: 'good' }, { route: '/portal' });
  assert.equal(b.value, 2214);
  assert.equal(b.route, '/portal');
});

test('missing context falls back to unknown', () => {
  const b = buildBeacon({ name: 'INP', value: 180 }, {});
  assert.equal(b.build, 'unknown');
  assert.equal(b.rating, 'unknown');
});

test('a malformed metric throws', () => {
  assert.throws(() => buildBeacon(null, {}), TypeError);
});

=============== FILE: test/lighthouserc.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../.lighthouserc.js');

test('config exposes a ci block with a collect section', () => {
  assert.ok(config.ci, 'ci block missing');
  assert.ok(config.ci.collect, 'ci.collect missing');
});

test('every collected url parses', () => {
  const urls = config.ci.collect.url;
  assert.ok(Array.isArray(urls) && urls.length > 0, 'collect.url must be a non-empty array');
  for (const u of urls) assert.doesNotThrow(() => new URL(u), 'unparseable url: ' + u);
});

=============== FILE: package.json ===============
{
  "name": "halloway-portal",
  "version": "7.2.4",
  "private": true,
  "scripts": {
    "build": "node scripts/build.js",
    "start": "node scripts/serve.js",
    "test": "node --test"
  },
  "dependencies": {
    "web-vitals": "4.2.4"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}
