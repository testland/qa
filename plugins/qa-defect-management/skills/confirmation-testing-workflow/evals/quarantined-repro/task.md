# BUG-2870 went green in CI on the fix build - can I move it on?

## Problem Description

BUG-2870 (facet counts on the search page stay stale after a facet is
deselected) is in Fixed against commit `c0b8f31`. The end-to-end test that was
written when the defect was raised, `tests/e2e/filter-counts.spec.js`, was
force-run against the fix build in CI job 9931 and came back green - the
developer pasted the job link into the ticket and asked me to close it.

That spec has not been part of the required check for a while; the CI
configuration for it is in `ci/quarantine.json`, and job 9931's raw log is in
`ci/rerun-9931.txt`.

I have no browser access to staging this week, so the written steps in the
ticket are not something I can walk through myself today.

## Output Specification

1. Write `qa-record/BUG-2870.md`: whether this defect can move to Verified
   on the evidence available, and why. If it cannot, the file must name the
   blocker specifically and give the concrete action - or actions - that would
   produce evidence good enough to decide, so whoever picks this up next knows
   exactly what to do.
2. Do not edit `ci/quarantine.json`, `issues/BUG-2870.md`, or anything under
   `ci/`. Do not change the CI configuration to force the spec back into the
   required check as part of this task.

## Input Files

Extract the following files before beginning.

=============== FILE: issues/BUG-2870.md ===============
# BUG-2870 - Facet counts stay stale after a facet is deselected

**Status:** Fixed (awaiting verification)
**Reported:** 2026-05-28 by qa
**Fix commit:** `c0b8f31` on `main`, merged 2026-08-04

## Reproduction steps (staging web UI)

1. Search "boots", apply facet Colour=Black. Counts recompute.
2. Deselect Colour=Black.
3. Observed: the Size facet still shows the counts from the filtered result
   set. Expected: counts recompute against the unfiltered result set.

Automated equivalent: `tests/e2e/filter-counts.spec.js`, added 2026-05-29,
red on the commit before the fix.

## Comments

**2026-08-05 j.novak:** CI job 9931 ran the spec against the fix build and it
passed. Good to close from my side.

=============== FILE: package.json ===============
{
  "name": "search-ui",
  "version": "7.2.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/filterCounts.js ===============
'use strict';

function recount(items, activeFacets) {
  const pool = items.filter((item) =>
    Object.entries(activeFacets).every(([k, v]) => item[k] === v),
  );
  const counts = {};
  for (const item of pool) {
    for (const [k, v] of Object.entries(item)) {
      counts[k] = counts[k] || {};
      counts[k][v] = (counts[k][v] || 0) + 1;
    }
  }
  return counts;
}

module.exports = { recount };

=============== FILE: tests/filterCounts.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { recount } = require('../src/filterCounts');

const ITEMS = [
  { colour: 'black', size: '40' },
  { colour: 'black', size: '41' },
  { colour: 'tan', size: '41' },
];

test('recount narrows to the active facet', () => {
  assert.deepEqual(recount(ITEMS, { colour: 'black' }).size, { 40: 1, 41: 1 });
});

test('recount with no active facet counts everything', () => {
  assert.deepEqual(recount(ITEMS, {}).size, { 40: 1, 41: 2 });
});

=============== FILE: ci/quarantine.json ===============
{
  "policy": "Quarantined specs run in the nightly job only. They do not gate merges and are excluded from the required check. Each is retried up to 3 times; the spec is reported as passed if any attempt passes.",
  "specs": [
    {
      "path": "tests/e2e/filter-counts.spec.js",
      "quarantinedSince": "2026-06-02",
      "reason": "intermittent 30s timeout waiting for the facet panel under parallel load; passes on rerun",
      "retries": 3,
      "observedPassRate30d": 0.62
    },
    {
      "path": "tests/e2e/checkout-guest.spec.js",
      "quarantinedSince": "2026-04-19",
      "reason": "flaky on webkit",
      "retries": 3,
      "observedPassRate30d": 0.71
    }
  ]
}

=============== FILE: ci/rerun-9931.txt ===============
CI job 9931 - manual rerun requested by j.novak
build commit: a4d0c92   branch: main

Running 1 spec (quarantined set, retries enabled)

  tests/e2e/filter-counts.spec.js
    attempt 1: FAILED - TimeoutError: waiting for selector
               ".facet-panel[data-loaded=true]" exceeded 30000ms
    attempt 2: passed (11.4s)

  1 passed (1 flaked)

Exit code 0

=============== FILE: ops/checks.txt ===============
$ curl -s https://search.staging.internal/internal/build-info
{"service":"search-ui","commit":"a4d0c92","branch":"main","deployedAt":"2026-08-05T06:02:44Z"}

$ git merge-base --is-ancestor c0b8f31 a4d0c92; echo $?
0
