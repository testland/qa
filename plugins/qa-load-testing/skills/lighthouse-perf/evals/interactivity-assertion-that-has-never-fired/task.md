# Fourteen months, zero catches - Marek wants the blocking-time assertion gone

## Problem Description

Larkmead (restaurant booking, three routes that matter). Marek raised this in
the config cleanup ticket and I want a second opinion before I approve it.

His case, verbatim from the ticket:

> The `total-blocking-time` assertion has been in the config since July 2025.
> In fourteen months it has failed zero times. Meanwhile the two assertions
> next to it have caught nineteen regressions between them. It is dead weight
> and I want it out of the file.
>
> If you would rather keep something, the honest version is to switch the whole
> config to the mobile preset and drop the desktop run. 74% of our sessions are
> phones. The desktop run is measuring a machine almost none of our users have,
> and we would stop paying twice for the same three routes.
>
> Separately: please make this stop running on every push to every branch. The
> audit is 61% of our Actions minutes this month and most of that is people
> pushing WIP commits to their own branches.

I have attached the config, the workflow, and the assertion outcomes our CI
dashboard exports. One thing I never thought about until I pulled that export:
the two legs go red on the same mornings. I had assumed that just meant the
regressions were real on both kinds of device.

For what it is worth our session split is 74% phone, 26% desktop, and the
desktop 26% is where the money is - those are the corporate accounts booking
tables for twelve.

Do not touch the unit tests.

## Output Specification

1. Deliver whatever you change in `.lighthouserc.js` and
   `.github/workflows/lighthouse.yml`.
2. Write `docs/audit-config-findings.md` with your answer to each of Marek's
   three points and an explanation of the assertion history you were given.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "larkmead-booking",
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
const profile = process.env.LH_PROFILE === 'mobile' ? 'mobile' : 'desktop';

const shared = {
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
};

const mobileOnly = {
  'total-blocking-time': ['error', { maxNumericValue: 300 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
};

module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:8080/',
        'http://localhost:8080/search',
        'http://localhost:8080/book/step-1',
      ],
      numberOfRuns: 3,
      settings: {
        preset: profile,
        chromeFlags: '--no-sandbox',
      },
      startServerCommand: 'npm run preview',
      startServerReadyPattern: 'preview ready',
    },
    assert: {
      assertions: profile === 'mobile' ? { ...shared, ...mobileOnly } : shared,
    },
    upload: { target: 'temporary-public-storage' },
  },
};

=============== FILE: .github/workflows/lighthouse.yml ===============
name: lighthouse

on:
  push:
  pull_request:

jobs:
  audit:
    runs-on: ubuntu-latest
    name: lighthouse (${{ matrix.profile }})
    strategy:
      fail-fast: false
      matrix:
        profile: [desktop, mobile]
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Audit
        env:
          LH_PRESET: ${{ matrix.profile }}
        run: npx lhci autorun

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lh-${{ matrix.profile }}
          path: .lighthouseci/

=============== FILE: reports/assertion-outcomes.md ===============
# Assertion outcomes exported from the CI dashboard

Window: 2025-07-14 to 2026-09-11. 412 days, both matrix legs, 3 URLs per run.

| Assertion                 | Job leg              | Evaluated | Failed |
|---------------------------|----------------------|-----------|--------|
| largest-contentful-paint  | lighthouse (desktop) | 1236      | 11     |
| cumulative-layout-shift   | lighthouse (desktop) | 1236      | 8      |
| largest-contentful-paint  | lighthouse (mobile)  | 1236      | 11     |
| cumulative-layout-shift   | lighthouse (mobile)  | 1236      | 8      |
| total-blocking-time       | lighthouse (mobile)  | 0         | 0      |

The eleven LCP failures are all on /search (six of them the autocomplete bundle
in #2214, five the hero image in #2388). The eight layout-shift failures are
split /search 5, /book/step-1 3. Both legs list the same dates against the same
run numbers.

=============== FILE: src/slots.js ===============
const OPENING = { start: 17 * 60, end: 22 * 60 };

export function slotsFor(durationMins, stepMins = 30) {
  if (!Number.isInteger(durationMins) || durationMins <= 0) {
    throw new RangeError('duration must be a positive whole number of minutes');
  }
  const out = [];
  for (let t = OPENING.start; t + durationMins <= OPENING.end; t += stepMins) {
    out.push(label(t));
  }
  return out;
}

export function label(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

=============== FILE: test/slots.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { slotsFor, label } from '../src/slots.js';

test('minutes render as a 24-hour label', () => {
  assert.equal(label(17 * 60), '17:00');
  assert.equal(label(21 * 60 + 30), '21:30');
});

test('a two-hour booking stops early enough to finish', () => {
  const slots = slotsFor(120);
  assert.equal(slots[0], '17:00');
  assert.equal(slots.at(-1), '20:00');
});

test('a ninety-minute booking gets one more slot', () => {
  assert.equal(slotsFor(90).at(-1), '20:30');
});

test('a zero duration is rejected', () => {
  assert.throws(() => slotsFor(0), RangeError);
});
