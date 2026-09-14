# Our perf gate has been green for seven months and customers say the reports page is unusable

## Problem Description

Fernbank, B2B analytics product, around 90 customers on annual contracts. We
have had a perf job on every PR since February. It has never once gone red.
Meanwhile support has fourteen open tickets about `/app/reports` taking eight to
eleven seconds to become usable, including one from Broadlake, who are up for
renewal in November and who put it in writing.

Two messages in the channel yesterday.

Priya (eng manager):

> The gate reports 0.94 on the home page every single run, so the bar is
> obviously too low. Raise the minimum to 0.98. If we hold ourselves to a higher
> score the gate will finally catch things like the reports page instead of
> waving everything through. Can someone do that today, it is a one-line change.

Ilya (front end):

> Bundle size is already handled — I put `budget.json` in back in May when we did
> the audit, and it is covered by the test suite. That side of it is done.

I started three weeks ago and I do not know either of them well enough to judge
who is right. What I can tell you is that our front end got a lot heavier this
year. Someone pulled a charting library and a date picker into the shared vendor
bundle in April and nobody noticed for a month. I have attached the build
output, a transfer-size measurement I took off a cold profile last week, the
route inventory, the support digest, and the config as it stands.

Do what you would do if this were your product, and then explain it in something
I can paste back into that channel.

## Output Specification

1. Update `.lighthouserc.js` in place — keep it a CommonJS `.js` file at the
   project root. You may add or edit other files at the project root if your
   change calls for it.
2. Write `docs/perf-gate-review.md`: what you changed, what each change catches
   that the current job does not, and a direct reply to Priya and to Ilya.
3. Do not modify anything under `test/`. `npm test` must still pass.

## Input Files

Extract the following files before beginning.

=============== FILE: .lighthouserc.js ===============
// Added 2026-02-11.
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5173/'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'Local:',
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

=============== FILE: budget.json ===============
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 2000 },
      { "resourceType": "stylesheet", "budget": 500 },
      { "resourceType": "image", "budget": 2000 },
      { "resourceType": "font", "budget": 300 },
      { "resourceType": "total", "budget": 4000 }
    ]
  }
]

=============== FILE: routes.md ===============
# Route inventory

| Path                | What it is                         | Auth       | Notes |
|---------------------|------------------------------------|------------|-------|
| `/`                 | Marketing home, statically built   | public     | CDN-cached. |
| `/pricing`          | Marketing pricing                  | public     | CDN-cached. |
| `/app/dashboard`    | Logged-in landing, 6 summary tiles | logged-in  | Redirects to `/login` without a session cookie. |
| `/app/reports`      | The report builder and viewer      | logged-in  | Redirects to `/login` without a session cookie. Loads the charting bundle, then fetches up to 90 days of series data. All fourteen tickets are about this page. |
| `/app/exports/new`  | Export request form, 11 fields     | logged-in  | Redirects to `/login` without a session cookie. Live validation on every field. |
| `/docs/*`           | Long-form help articles, MDX       | public     | CDN-cached. |

=============== FILE: scripts/preview.js ===============
'use strict';

// Serves the production build out of dist/ with a seeded demo tenant, so the
// app routes are reachable without a real login. `npm run preview`.

const http = require('node:http');

const PORT = Number(process.env.PORT || 5173);
const DEMO_SESSION = process.env.PREVIEW_SESSION || 'demo-tenant-8f21ac';

const server = http.createServer((req, res) => {
  // The client router 302s any /app/* request to /login unless the request
  // carries fernbank_session; the demo value below is accepted by the preview
  // build only.
  res.setHeader('x-preview', '1');
  res.end('preview');
});

server.listen(PORT, () => {
  console.log('  Local:   http://localhost:' + PORT + '/');
  console.log('  Demo session cookie: fernbank_session=' + DEMO_SESSION);
});

=============== FILE: build/bundle-report.txt ===============
$ npm run build -- --report

dist/assets/vendor-Ba91c2.js      2,412.88 kB  gzip: 780.41 kB
dist/assets/reports-D71f0a.js     1,341.02 kB  gzip: 412.77 kB
dist/assets/dashboard-C08b1c.js     302.10 kB  gzip:  96.44 kB
dist/assets/index-A5d3e8.js         118.44 kB  gzip:  38.02 kB
dist/assets/exports-E22c91.js        94.70 kB  gzip:  29.61 kB
dist/assets/index-Ff10ab.css         64.31 kB  gzip:  11.90 kB

Warning: some chunks are larger than 500 kB after minification.

$ git log --oneline -- package.json | head -3
8f21ac4  chore: add charting + date-picker deps (2026-04-09)
1d0e73b  chore: bump build tooling (2026-03-02)
a44bb90  chore: initial deps (2025-11-18)

=============== FILE: build/transfer-sizes.md ===============
# Transferred bytes, production build, cold cache

Chrome DevTools network panel, disable-cache on, 2026-09-08.

| Route              | script   | stylesheet | image   | font  | total    |
|--------------------|----------|------------|---------|-------|----------|
| `/`                |   41 kB  |     12 kB  |  190 kB | 48 kB |   291 kB |
| `/app/dashboard`   |  878 kB  |     12 kB  |   26 kB | 48 kB |   964 kB |
| `/app/reports`     | 1193 kB  |     12 kB  | 1604 kB | 48 kB |  2857 kB |
| `/app/exports/new` |  811 kB  |     12 kB  |   14 kB | 48 kB |   885 kB |

The image number on `/app/reports` is the chart tile thumbnails: 38 PNGs, none
of them resized server-side, all of them rendered at 180px wide.

=============== FILE: support/ticket-digest.md ===============
# Open tickets mentioning slowness, as of 2026-09-10

14 tickets, all `/app/reports`, opened between 2026-04-22 and 2026-09-08.

Representative quotes:

- "Clicking Reports and then waiting nine seconds staring at a grey box."
  (Broadlake, #4471, escalated, renewal 2026-11-30)
- "It eventually loads but the whole page jumps twice while I am trying to click
  the date range." (#4502)
- "Fine on my desktop, unusable on the laptop the analysts actually use."
  (#4519)
- "The first click on the date picker does nothing. The second one works."
  (#4530)

=============== FILE: package.json ===============
{
  "name": "fernbank-web",
  "version": "3.4.1",
  "private": true,
  "scripts": {
    "build": "node scripts/build.js",
    "preview": "node scripts/preview.js",
    "test": "node --test"
  },
  "devDependencies": {
    "@lhci/cli": "0.15.1"
  }
}

=============== FILE: src/format-bytes.js ===============
'use strict';

const UNITS = ['B', 'kB', 'MB', 'GB'];

function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('bad byte count');
  let i = 0;
  let v = n;
  while (v >= 1000 && i < UNITS.length - 1) {
    v /= 1000;
    i += 1;
  }
  return Math.round(v * 10) / 10 + ' ' + UNITS[i];
}

module.exports = { formatBytes };

=============== FILE: test/format-bytes.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBytes } = require('../src/format-bytes.js');

test('bytes below a thousand stay bytes', () => {
  assert.equal(formatBytes(512), '512 B');
});

test('a megabyte rounds to one decimal', () => {
  assert.equal(formatBytes(1341020), '1.3 MB');
});

test('exact thousand promotes a unit', () => {
  assert.equal(formatBytes(1000), '1 kB');
});

test('negative input throws', () => {
  assert.throws(() => formatBytes(-1), RangeError);
});

=============== FILE: test/budget.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const budget = JSON.parse(readFileSync(join(__dirname, '..', 'budget.json'), 'utf8'));

test('budget file is a non-empty array', () => {
  assert.ok(Array.isArray(budget) && budget.length > 0);
});

test('every budget entry declares the path it applies to', () => {
  for (const entry of budget) assert.equal(typeof entry.path, 'string');
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
