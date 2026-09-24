# The gate has been green for four months and /app/reports still takes nine seconds

## Problem Description

Stembridge Analytics. Fourteen support tickets since June say the same thing:
the reports page takes eight to ten seconds to become usable on a normal laptop
on office wifi. I have reproduced it myself, twice. Our CI audit job has not
gone red once since it landed on 2026-05-11.

Both of those cannot be true, and I would like to know which one is lying
before I spend a sprint on it.

Context you will need:

- `/app/reports` is behind login. The preview server the audit job starts is
  the production build with a fixed dev session; the script that starts it is
  in package.json and the middleware guarding `/app` is in the repo.
- Someone on the frontend team added `budget.json` at the root in April.
  Nobody has mentioned it since.
- Ilya's suggestion in the thread was to put a `categories:performance` minimum
  score of 0.9 on everything as an error, because "one number is easier to
  explain to the board than three". He may well be right that it is easier to
  explain. What I want to know is whether it would have caught this.

Attached: the config, the budget file, the last run summary the job produced,
the production bundle output from that same commit, and two request dumps
captured from a real logged-in session on `/app/reports`.

Whatever you change, do not raise a threshold or a budget number that is
already in the repo in order to get something to pass, and do not touch the
unit tests.

## Output Specification

1. Deliver the updated `.lighthouserc.js`, and `budget.json` if your answer
   involves it.
2. Write `docs/perf-gate-fix.md` stating why the gate was green for four months
   while the page took nine seconds, what the page's weight is actually made
   of, and what the gate will do differently on the next run.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "stembridge-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.js",
    "preview": "PREVIEW_SESSION=dev-preview-7f21 node server/preview.js",
    "test": "node --test"
  },
  "dependencies": {
    "cookie-parser": "1.4.7",
    "express": "4.21.2"
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
        'http://localhost:3000/',
        'http://localhost:3000/pricing',
        'http://localhost:3000/app/reports',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview listening',
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: 'localhost:3000/$',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '/pricing',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 1500 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
        {
          matchingUrlPattern: '/app/reports',
          assertions: {
            'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
            'total-blocking-time': ['error', { maxNumericValue: 300 }],
            'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
          },
        },
      ],
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: budget.json ===============
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 300000 },
      { "resourceType": "stylesheet", "budget": 100000 },
      { "resourceType": "image", "budget": 500000 },
      { "resourceType": "font", "budget": 100000 },
      { "resourceType": "total", "budget": 1500000 }
    ]
  }
]

=============== FILE: server/preview.js ===============
import express from 'express';
import cookieParser from 'cookie-parser';
import { join } from 'node:path';

const app = express();
app.use(cookieParser());

app.use('/app', (req, res, next) => {
  if (req.cookies.sb_session !== process.env.PREVIEW_SESSION) {
    return res.redirect(302, '/login');
  }
  next();
});

app.use(express.static(join(process.cwd(), 'dist')));

app.listen(3000, () => console.log('preview listening on http://localhost:3000'));

=============== FILE: reports/lhci-run-2026-09-08.md ===============
# Audit run 2026-09-08, median of 3, commit 6b1ae90

| requestedUrl                      | finalUrl                     | LCP     | TBT   | CLS  | transfer |
|-----------------------------------|------------------------------|---------|-------|------|----------|
| http://localhost:3000/            | http://localhost:3000/       | 1140 ms | 60 ms | 0.01 | 412 kB   |
| http://localhost:3000/pricing     | http://localhost:3000/pricing| 1310 ms | 70 ms | 0.02 | 488 kB   |
| http://localhost:3000/app/reports | http://localhost:3000/login  | 880 ms  | 30 ms | 0.00 | 301 kB   |

assert: 7 assertions evaluated, 0 failing
upload: https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/6b1ae90

=============== FILE: build/bundle-report.txt ===============
vite v6.3.2 building for production...
dist/assets/vendor-Ck2p9r.js       780.4 kB | gzip: 246.1 kB
dist/assets/reports-Bn44xw.js      402.9 kB | gzip: 131.6 kB
dist/assets/index-Dq81mz.js        118.7 kB | gzip:  38.2 kB
dist/assets/index-Hy20ab.css        71.3 kB | gzip:  12.4 kB
built in 21.44s

=============== FILE: reports/requests-app-reports.csv ===============
resourceType,requests,transferBytes
document,1,9088
script,4,426112
stylesheet,2,13701
image,38,1163776
font,3,71104
other,6,58122

=============== FILE: reports/images-app-reports.csv ===============
url,transferBytes,intrinsicWidth,intrinsicHeight,displayedWidth,displayedHeight
/img/avatars/a01.png,30612,1024,1024,40,40
/img/avatars/a02.png,29944,1024,1024,40,40
/img/avatars/a03.png,31208,1024,1024,40,40
/img/avatars/a04.png,28770,1024,1024,40,40
/img/avatars/a05.png,32001,1024,1024,40,40
/img/avatars/a06.png,30455,1024,1024,40,40
/img/avatars/a07.png,29118,1024,1024,40,40
/img/avatars/a08.png,31740,1024,1024,40,40
/img/logo-mark.png,18422,512,512,28,28
/img/empty-state.png,41996,1600,900,320,180
(28 further /img/avatars NN.png rows, 28.4-32.3 kB each, 1024x1024 intrinsic, 40x40 displayed)

=============== FILE: src/format.js ===============
export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('bytes must be non-negative');
  if (n < 1024) return n + ' B';
  const units = ['kB', 'MB', 'GB'];
  let value = n / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return value.toFixed(1) + ' ' + units[i];
}

export function formatMs(n) {
  if (!Number.isFinite(n) || n < 0) throw new RangeError('ms must be non-negative');
  return n < 1000 ? Math.round(n) + ' ms' : (n / 1000).toFixed(2) + ' s';
}

=============== FILE: test/format.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, formatMs } from '../src/format.js';

test('bytes below a kilobyte stay in bytes', () => {
  assert.equal(formatBytes(512), '512 B');
});

test('bytes scale to kB and MB', () => {
  assert.equal(formatBytes(1536), '1.5 kB');
  assert.equal(formatBytes(1048576), '1.0 MB');
});

test('milliseconds become seconds above a thousand', () => {
  assert.equal(formatMs(880), '880 ms');
  assert.equal(formatMs(9140), '9.14 s');
});

test('negative input is rejected', () => {
  assert.throws(() => formatBytes(-1), RangeError);
  assert.throws(() => formatMs(-1), RangeError);
});
