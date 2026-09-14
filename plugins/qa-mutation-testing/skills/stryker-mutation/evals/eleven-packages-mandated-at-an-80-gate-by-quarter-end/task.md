# Eleven packages, an 80 gate mandated by 31 December, three of them already over 80

## Problem Description

Duncan sent the attached mail on Monday. Short version: every package in the
monorepo carries a blocking mutation gate at 80 by 31 December, on the argument
that we already gate line coverage at 80 and this is the same idea done
properly. He is the VP, the date is in his commitments to the exec, and "it is
hard" is not an answer he will take.

I ran the tool across all eleven packages overnight on Thursday. The summary is
attached. Three of them are already over 80, and Duncan's mail says to switch
those three to blocking on Monday as the proof that the programme is moving. I
have also attached the two package configs people keep asking me about, the
per-file breakdown for one package, the CI workflow, and the note our CI team
left about `packages/auth` last month.

What I need from you is a decision per package that I can defend in the
programme review on Tuesday, not a strategy. Specifically:

- Which packages go blocking on Monday. If that is fewer than three, I need to
  tell Duncan on Friday and I need the reason to be about the measurement rather
  than about the team being busy.
- What happens to the rest, with numbers and dates rather than "later".
- Where we will honestly be on 31 December. Duncan will read silence as
  agreement that all eleven will be gated at 80 by then, so if that is not going
  to happen it has to be written down.

Every one of these packages has had the mutation job running non-blocking for
about five months, so we are not starting from nothing and I do not want to be
told to go and measure a baseline first. The numbers in the summary are the
baseline.

## Output Specification

1. Write `docs/mutation-gate-rollout.md` — a row per package with the verdict,
   the threshold number if it gets one, the date, and the owner; the answer to
   Duncan about Monday and about 31 December.
2. Edit the `stryker.conf.json` of whichever packages your decision covers.
   Leave the others alone.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/mandate-2026-09-08.md ===============
From: Duncan Oyelaran, VP Engineering
To: Engineering leads
Date: Monday 8 September 2026
Subject: Mutation gate, all packages, 31 December

We gate line coverage at 80 and have done since 2024. Coverage at 80 has not
stopped a single incident this year, and the post-incident review for INC-2211
in June found the code path had tests that executed it and asserted nothing.
Mutation score measures the thing we thought coverage measured.

So: every package carries a blocking mutation gate at 80 by 31 December.

I am told three packages already clear 80. Switch those three to blocking on
Monday. I want the programme visibly started before the board pack goes out on
the 19th, and I want the remaining eight sequenced with dates by the end of the
month.

I do not need a discussion about whether 80 is the right number. It is the
number we use everywhere else.

=============== FILE: reports/monorepo-2026-09-11.md ===============
# Mutation run, all packages, 2026-09-11 (non-blocking)

| Package                 | Valid mutants | Detected | Score  |
|-------------------------|---------------|----------|--------|
| packages/notifications  | 1,140         | 959      | 84.12% |
| packages/pricing        | 1,204         | 1,006    | 83.55% |
| packages/auth           | 880           | 731      | 83.07% |
| packages/search         | 611           | 435      | 71.19% |
| packages/reporting      | 803           | 553      | 68.87% |
| packages/ingest         | 738           | 469      | 63.55% |
| packages/web-gateway    | 1,455         | 844      | 58.01% |
| packages/admin-ui       | 1,067         | 591      | 55.39% |
| packages/ledger         | 962           | 397      | 41.27% |
| packages/db-migrations  | 204           | 24       | 11.76% |
| packages/proto-gen      | 1,932         | 93       | 4.81%  |

Facts collected while assembling this, in no particular order:

- `packages/db-migrations` holds four files: `migrate-2024-06-11.js`,
  `migrate-2024-11-02.js`, `migrate-2025-03-30.js`, `migrate-2025-09-14.js`.
  Each was executed once against the production database on the date in its
  name. The package has no `test` script. Its README says "archived, retained
  for audit".
- `packages/proto-gen` has a `prebuild` script of `npm run proto`, which runs
  `protoc` over `schema/*.proto` and rewrites the whole of its `src/`. There are
  no hand-edited files in that package; `git log` shows every commit to `src/`
  authored by `ci-bot`.
- `packages/ledger` is the settlement engine. 397 of its 962 mutants are
  detected; 41 of the 962 are in the no-coverage column, the rest of the
  survivors are executed and not asserted on.
- `packages/auth` was run twice on the same commit `a41f00c` on Thursday. The
  first run printed 83.07%. The second printed 79.40%.
- Run wall-clock for all eleven: 4 hours 12 minutes on the nightly runner.

=============== FILE: packages/pricing/stryker.conf.json ===============
{
  "$schema": "../../node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "tap",
  "tap": { "testFiles": ["src/**/*.test.js"] },
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.js", "!src/**/*.test.js"],
  "reporters": ["progress", "clear-text", "html"],
  "thresholds": { "high": 80, "low": 60 }
}

=============== FILE: packages/notifications/stryker.conf.json ===============
{
  "$schema": "../../node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "tap",
  "tap": { "testFiles": ["src/**/*.test.js"] },
  "coverageAnalysis": "perTest",
  "mutate": ["src/**/*.js"],
  "reporters": ["progress", "clear-text", "html"],
  "thresholds": { "high": 80, "low": 60 }
}

=============== FILE: packages/notifications/reports/per-file-2026-09-11.txt ===============
--------------------------------|---------|----------|-----------|------------|----------|
File                            | % score | # killed | # timeout | # survived | # no cov |
--------------------------------|---------|----------|-----------|------------|----------|
All files                       |   84.12 |      951 |         8 |        173 |        8 |
 src/digest/digest.js           |   67.01 |      128 |         2 |         61 |        3 |
 src/digest/digest.test.js      |   97.92 |      141 |         0 |          3 |        0 |
 src/render/template.js         |   66.47 |      112 |         1 |         55 |        2 |
 src/render/template.test.js    |   98.53 |      134 |         0 |          2 |        0 |
 src/queue/dispatch.js          |   70.32 |      106 |         3 |         44 |        2 |
 src/queue/dispatch.test.js     |   97.58 |      121 |         0 |          3 |        0 |
 src/prefs/prefs.js             |   95.41 |      102 |         2 |          4 |        1 |
 src/prefs/prefs.test.js        |   99.07 |      107 |         0 |          1 |        0 |
--------------------------------|---------|----------|-----------|------------|----------|

=============== FILE: reports/ci-note-2026-08-20.md ===============
# CI team note — packages/auth

Filed 2026-08-20 by @ci-platform.

Over the last 500 runs of the `auth` unit suite on `main`, 37 failed and then
passed on retry with no change to the tree (7.4%). We have not found the cause.
The failures cluster in `src/session/*.test.js` and involve the fake clock the
suite installs in `beforeEach`. Ticket #5064 is open, unassigned, and has been
open since May.

The `auth` suite is the only one in the monorepo with automatic retries turned
on in the workflow (`--test-retries=2`).

=============== FILE: .github/workflows/mutation.yml ===============
name: mutation

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  mutation:
    runs-on: ubuntu-latest
    timeout-minutes: 360
    strategy:
      fail-fast: false
      matrix:
        package:
          - notifications
          - pricing
          - auth
          - search
          - reporting
          - ingest
          - web-gateway
          - admin-ui
          - ledger
          - db-migrations
          - proto-gen
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Mutation run
        working-directory: packages/${{ matrix.package }}
        run: npx stryker run
        continue-on-error: true

=============== FILE: packages/pricing/src/tiers.js ===============
const TIERS = [
  { name: 'free', upTo: 1000, unitCents: 0 },
  { name: 'growth', upTo: 50000, unitCents: 4 },
  { name: 'scale', upTo: Infinity, unitCents: 3 },
];

export function tierFor(units) {
  if (units < 0) throw new RangeError('units must not be negative');
  return TIERS.find((t) => units <= t.upTo);
}

export function chargeCents(units) {
  const tier = tierFor(units);
  return units * tier.unitCents;
}

=============== FILE: packages/pricing/src/tiers.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { tierFor, chargeCents } from './tiers.js';

test('the free tier covers its upper bound', () => {
  assert.equal(tierFor(1000).name, 'free');
});

test('one unit past the free bound is growth', () => {
  assert.equal(tierFor(1001).name, 'growth');
});

test('the scale tier catches everything above growth', () => {
  assert.equal(tierFor(50001).name, 'scale');
});

test('negative units are rejected', () => {
  assert.throws(() => tierFor(-1), RangeError);
});

test('free usage is free', () => {
  assert.equal(chargeCents(1000), 0);
});

test('growth usage charges four cents a unit', () => {
  assert.equal(chargeCents(20000), 80000);
});
