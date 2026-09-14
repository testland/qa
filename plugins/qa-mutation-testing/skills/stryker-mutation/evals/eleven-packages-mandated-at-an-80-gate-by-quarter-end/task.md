# VP wants all eleven packages gated at 80 by 31 December

## Problem Description

Our VP of Engineering came back from a conference and sent the note attached as
`docs/mandate-2026-09-08.md`. Short version: every package in `platform-api`
gets mutation testing, the gate is 80, PRs blocked below it, done by quarter
end. Our platform lead has already drafted the plan in the same document — one
config at the repo root mutating `packages/*/src/**`, blocking on every PR from
the day it lands.

I am the one who has to run this and I have a week before the planning review
where I either agree to it or say something better. I have pulled the state of
all eleven packages into `reports/packages.md` — coverage, suite runtime, test
count, and how often each suite fails on a rerun of the same commit, measured
over the last 300 CI runs.

Two packages I can tell you about from experience. `pricing` is the one where
review comments keep saying "this test does not really check anything" — I have
attached its discount module and the spec that goes with it so you can judge.
`web-gateway` is the one everybody reruns; the failures are timing and nobody
has owned it since Marco left.

What I need back is the thing I would actually land this week — a real config
file, not a proposal — plus a note I can send upward. The note has to survive
contact with the VP, which means every package I am not doing needs a reason
that is about the measurement being worthless there rather than about us being
busy, and the quarter-end position has to be stated honestly rather than
implied. He will read "phase two" as "done in December" unless I spell it out.

## Output Specification

1. Write the config file you would land this week, at the path it belongs at,
   and edit the `package.json` of whichever package it covers to add what it
   needs.
2. Write `docs/rollout.md` — which packages are in the first step and which are
   not, a reason per excluded package, what the gate number is and when it
   starts blocking anything, and what exists at quarter end.
3. Do not edit `docs/mandate-2026-09-08.md`, `packages/pricing/src/discount.ts`
   or `packages/pricing/test/discount.spec.ts`.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/mandate-2026-09-08.md ===============
# From: VP Engineering — 8 September 2026

Subject: quality push, Q4

Team,

I spent Thursday at a testing conference and the thing I took away is that line
coverage is a vanity number. The technique that actually measures whether tests
work is mutation testing — they inject bugs and see whether your suite notices.
A team at a company our size reported 80%+ across their codebase.

So: every package in platform-api, mutation tested, 80% or the PR does not
merge, by 31 December. I have told the board this is our Q4 quality commitment.

---

## Plan (drafted by platform lead, same thread)

Root `stryker.conf.json`:

```json
{
  "testRunner": "vitest",
  "mutate": ["packages/*/src/**/*.ts"],
  "thresholds": { "high": 90, "low": 80, "break": 80 }
}
```

CI: run it on every pull request against `main`, blocking. One config, eleven
packages, no per-package special cases — if we start carving out exceptions on
day one we will still be carving them out in March.

=============== FILE: reports/packages.md ===============
# platform-api — package state, pulled 2026-09-09

Flake rate = share of the last 300 CI runs where the suite failed and then
passed on a rerun of the identical commit.

| Package          | Lines | Line cov | Tests | Suite runtime | Flake rate | What it is                          |
|------------------|-------|----------|-------|---------------|------------|-------------------------------------|
| pricing          | 2,180 | 94.1%    |   206 | 11 s          | 0.0%       | discounts, tiers, proration         |
| tax              | 1,640 | 88.7%    |   174 | 9 s           | 0.3%       | rate lookup and rounding            |
| invoice-render   | 3,910 | 82.4%    |   241 | 34 s          | 0.7%       | PDF and HTML invoice layout         |
| entitlements     | 1,205 | 86.0%    |   139 | 7 s           | 0.0%       | plan to feature mapping             |
| ledger           | 4,320 | 80.9%    |   402 | 58 s          | 1.0%       | double-entry postings               |
| notifications    | 2,050 | 71.2%    |   118 | 21 s          | 2.1%       | email and webhook fan-out           |
| ingest           | 6,740 | 41.3%    |    94 | 46 s          | 1.4%       | partner CSV and JSON import         |
| web-gateway      | 5,110 | 77.8%    |   288 | 22 min        | 7.4%       | HTTP edge, auth, rate limiting      |
| admin-ui         | 8,900 | 63.5%    |   331 | 4 min         | 3.2%       | internal React admin app            |
| migrations       | 1,870 | 12.0%    |    11 | 3 s           | 0.0%       | one-shot SQL migration runners      |
| sdk-codegen      | 2,240 |  0.0%    |     0 | n/a           | n/a        | generates the client SDK from spec  |

Notes:

- `ingest` is 6,740 lines behind 94 tests. The 41% is the honest figure; the
  untested half is partner-specific parsing branches added over two years.
- `web-gateway` reruns are a standing joke. The failures are timing — socket
  teardown and a retry loop — and they land on whichever test is unlucky, not
  on one particular test.
- `migrations` are one-shot scripts, run once against production and then dead.
- `sdk-codegen` has no tests because it has no hand-written code; its output is
  regenerated from the spec on every release.
- Every suite in the table runs on Vitest except `admin-ui`, which is on Jest.

=============== FILE: packages/pricing/src/discount.ts ===============
export interface Tier {
  name: string;
  minSeats: number;
  pctOff: number;
}

export const TIERS: Tier[] = [
  { name: 'starter', minSeats: 1, pctOff: 0 },
  { name: 'team', minSeats: 10, pctOff: 10 },
  { name: 'business', minSeats: 50, pctOff: 20 },
  { name: 'enterprise', minSeats: 250, pctOff: 30 },
];

export function tierFor(seats: number): Tier {
  let chosen = TIERS[0];
  for (const t of TIERS) {
    if (seats >= t.minSeats) chosen = t;
  }
  return chosen;
}

export function discountedCents(listCents: number, seats: number): number {
  const tier = tierFor(seats);
  const off = Math.round((listCents * tier.pctOff) / 100);
  return listCents - off;
}

export function prorate(listCents: number, daysLeft: number, daysInPeriod: number): number {
  if (daysLeft <= 0) return 0;
  if (daysLeft >= daysInPeriod) return listCents;
  return Math.round((listCents * daysLeft) / daysInPeriod);
}

=============== FILE: packages/pricing/test/discount.spec.ts ===============
import { describe, it, expect } from 'vitest';
import { tierFor, discountedCents, prorate } from '../src/discount';

describe('tierFor', () => {
  it('returns a tier for a small account', () => {
    expect(tierFor(3)).toBeTruthy();
  });

  it('returns a tier for a large account', () => {
    expect(tierFor(500)).toBeTruthy();
  });

  it('returns something with a name', () => {
    expect(typeof tierFor(60).name).toBe('string');
  });
});

describe('discountedCents', () => {
  it('does not charge more than list', () => {
    expect(discountedCents(10000, 60)).toBeLessThanOrEqual(10000);
  });

  it('returns a number', () => {
    expect(typeof discountedCents(10000, 12)).toBe('number');
  });
});

describe('prorate', () => {
  it('is zero when nothing is left', () => {
    expect(prorate(10000, 0, 30)).toBe(0);
  });

  it('is positive mid-period', () => {
    expect(prorate(10000, 15, 30)).toBeGreaterThan(0);
  });
});

=============== FILE: packages/pricing/package.json ===============
{
  "name": "@platform/pricing",
  "version": "3.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "5.6.2",
    "vitest": "2.1.4"
  }
}
