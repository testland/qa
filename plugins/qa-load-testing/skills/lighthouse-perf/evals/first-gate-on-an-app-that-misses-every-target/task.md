# Land our first Web Vitals gate before the October board demo

## Problem Description

Quillbase, ~40 engineers, B2B document workspace. We already collect Lighthouse
reports on every PR — that part has worked since June — but the config has no
assertions in it at all, so the job is green no matter what anyone ships. I need
to close that this sprint.

Dana (our PM) wrote the ask and I am pasting it verbatim because she will be in
the review:

> Use Google's published numbers. 2.5 seconds, 200 milliseconds, 0.1. Same three
> on every route so it is one rule everyone can remember, and set every one of
> them to hard-fail. If it is a warning nobody fixes it — we have proved that
> twice. The marketing pages are already fast so they will just pass, which is
> fine, that is what passing looks like. I want to be able to say on 1 October
> that the gate is live.

I am with her on this. If the dashboard goes red on day one that is information,
not a problem — the team can look at it and decide what to do about it.

I have attached the current numbers: thirty days of real-user data from our
analytics, the median of last week's runs on the merge commit for the same
routes, how much of our traffic each route carries, and what each route actually
is.

One wrinkle. `/share/:token` went live nine days ago — it is the public
read-only viewer you get when someone shares a document link. Sanjay measured it
once, on the afternoon our self-hosted runner was also building the Android app,
and that single run is the only number anyone has for it. Dana wants it in the
gate with the rest because it is customer-facing and it is the first thing a
prospect ever sees.

Context you will not get from the CSV: the dashboard rewrite lands in Q1, and
the reports page is slow because it fans out to four internal services that the
platform team owns, not us.

Give me the config and something I can put in front of Dana on Thursday.

## Output Specification

1. Add the assertion configuration to `.lighthouserc.js`. Keep the existing
   `collect` block as it is apart from anything your assertions genuinely need.
   It must stay a CommonJS `.js` file at the project root.
2. Write `docs/vitals-budget.md`: every route, the number you set for each of the
   three metrics, whether it fails the build or only reports, and the reason for
   that specific number.
3. Do not modify anything under `test/`. `npm test` must still pass.

## Input Files

Extract the following files before beginning.

=============== FILE: perf/baseline-2026-09.csv ===============
route,auth,traffic_share,field_lcp_p75_ms,field_inp_p75_ms,field_cls_p75,lab_lcp_median_ms,lab_inp_median_ms,lab_cls_median
/,public,0.41,1180,74,0.02,980,61,0.01
/pricing,public,0.12,1310,88,0.03,1040,70,0.02
/app/dashboard,logged-in,0.28,4120,386,0.19,3870,340,0.17
/app/reports,logged-in,0.11,5600,240,0.07,5210,225,0.06
/app/invoices/new,logged-in,0.08,2900,210,0.14,2740,190,0.12
/share/:token,public,,,,,3110,168,0.22

=============== FILE: perf/README.md ===============
# Where these numbers come from

- `field_*` columns: 75th percentile over a 28-day window, all devices, from the
  analytics SDK already embedded in the app. 62% of those sessions are mobile.
- `lab_*` columns: median of 3 runs per URL on the merge commit, desktop preset,
  GitHub-hosted runner, week of 2026-09-01 — except `/share/:token`, see below.
- `traffic_share`: fraction of total page loads in the same window.

Route notes:

- `/` and `/pricing` are statically generated and served from the CDN edge. They
  have looked like this for eighteen months.
- `/app/dashboard` is the logged-in landing page. Rewrite scheduled for Q1.
- `/app/reports` fans out to four internal services on load; owned by platform.
- `/app/invoices/new` is the invoice composer. Users type in it continuously and
  it renders a live preview pane beside the form; the preview is what moves the
  layout around while they type.
- `/share/:token` is the public read-only document viewer, shipped 2026-09-04.
  Its row is one run taken on 2026-09-11 on the self-hosted runner while that
  machine was also building the Android app — not a median of three, and nobody
  has repeated it. The analytics SDK is not on this route yet, so there is no
  field column; roughly 1,100 sessions have hit it since launch.

=============== FILE: .lighthouserc.js ===============
// Collect-only since 2026-06-18. No assertions yet — that is the open work.
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4000/',
        'http://localhost:4000/pricing',
        'http://localhost:4000/app/dashboard',
        'http://localhost:4000/app/reports',
        'http://localhost:4000/app/invoices/new',
        'http://localhost:4000/share/9f2c1ad4',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'listening on',
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

=============== FILE: package.json ===============
{
  "name": "quillbase-web",
  "version": "2.9.0",
  "private": true,
  "scripts": {
    "build": "node scripts/build.js",
    "start": "node scripts/serve.js",
    "test": "node --test"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}

=============== FILE: src/percentile.js ===============
'use strict';

function percentile(values, p) {
  if (!values.length) throw new RangeError('no values');
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.min(Math.max(idx, 0), sorted.length - 1)];
}

module.exports = { percentile };

=============== FILE: test/percentile.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { percentile } = require('../src/percentile.js');

test('p75 of ten ordered values', () => {
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 75), 8);
});

test('p50 of a single value is that value', () => {
  assert.equal(percentile([5], 50), 5);
});

test('unordered input is sorted first', () => {
  assert.equal(percentile([9, 1, 4, 7], 50), 4);
});

test('empty input throws', () => {
  assert.throws(() => percentile([], 75), RangeError);
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
