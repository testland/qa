# New director, first week, wants one testing verdict for the whole atlas monorepo

## Problem Description

I started as director of engineering here nine days ago. `atlas` is our
monorepo: `packages/ledger` is the money service, `packages/console` is the
customer-facing single-page app, and `packages/ingest` is a data pipeline that
was carved out of ledger on 2026-08-29, three weeks ago.

I have a staff-engineering review on the 24th and I want to open it with where
our testing actually stands. What I want from you is one verdict for atlas and
one migration plan — I do not want to stand up there with three different
stories, and the teams are going to argue about ownership regardless.

Everything I could get exported is in `data/packages/`. Our CI history API
produced the case counts and the per-suite runtimes. `data/change-shape/` has
whatever our estimation tooling had already classified per package; I did not
generate these and I have no idea how far back each one goes.

One thing I will say up front: `console` feels slow to me. Every time I open a
pull request there I am waiting. I assume it has the same problem as everything
else and I would like the plan to cover it.

Give me something I can defend if a staff engineer pushes on it. If some part
of this cannot be answered from what I have, I would rather know that on the
16th than find out on the 24th in front of everyone.

## Output Specification

1. `scripts/mix-report.js` — reads every file under `data/packages/` and
   `data/change-shape/` and writes `reports/mix-by-package.json`. It must run
   to completion with `node scripts/mix-report.js` on the supplied export
   without throwing, and with no dependencies.
2. `test/mix-report.test.js` — tests for it, running under `npm test` alongside
   the test already in the repo. `npm test` must pass when you are done.
3. `reports/atlas-review.md` — what I take to the review on the 24th.

Do not edit anything under `data/`, and do not change `lib/ratio.js` or
`test/ratio.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "atlas-tooling",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: lib/ratio.js ===============
export function pct(part, total) {
  if (!Number.isFinite(part) || !Number.isFinite(total)) return null;
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export function totalCases(layers) {
  return Object.values(layers).reduce((sum, l) => sum + (l.cases ?? 0), 0);
}

=============== FILE: test/ratio.test.js ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { pct, totalCases } from '../lib/ratio.js';

test('pct is a percentage to one decimal place', () => {
  assert.equal(pct(240, 323), 74.3);
});

test('pct returns null rather than dividing by zero', () => {
  assert.equal(pct(1, 0), null);
});

test('pct returns null for a non-numeric part', () => {
  assert.equal(pct(null, 323), null);
});

test('totalCases sums the layers', () => {
  assert.equal(totalCases({ unit: { cases: 240 }, integration: { cases: 22 }, e2e: { cases: 61 } }), 323);
});

=============== FILE: data/packages/ledger.json ===============
{
  "package": "packages/ledger",
  "exported": "2026-09-15",
  "runner": "github-hosted",
  "layers": {
    "unit": { "cases": 240, "files": 71, "serial_seconds": 143, "retry_and_pass_rate": 0.002 },
    "integration": { "cases": 22, "files": 9, "serial_seconds": 214, "retry_and_pass_rate": 0.009 },
    "e2e": { "cases": 61, "files": 18, "serial_seconds": 892, "retry_and_pass_rate": 0.038 }
  },
  "notes": "counts and timings from the last 30 green runs on main; complete."
}

=============== FILE: data/packages/console.json ===============
{
  "package": "packages/console",
  "exported": "2026-09-15",
  "runner": "github-hosted",
  "layers": {
    "unit": { "cases": 180, "files": 54, "serial_seconds": 96, "retry_and_pass_rate": 0.001 },
    "integration": { "cases": 74, "files": 26, "serial_seconds": 331, "retry_and_pass_rate": 0.005 },
    "e2e": { "cases": 44, "files": 14, "serial_seconds": 628, "retry_and_pass_rate": 0.021 }
  },
  "notes": "counts and timings from the last 30 green runs on main; complete. PR job wall clock 11m40s, of which 7m20s is the webpack build, not tests."
}

=============== FILE: data/packages/ingest.json ===============
{
  "package": "packages/ingest",
  "exported": "2026-09-15",
  "runner": "self-hosted-arm",
  "layers": {
    "unit": { "cases": 92, "files": 28, "serial_seconds": null, "retry_and_pass_rate": null },
    "integration": { "cases": 11, "files": 5, "serial_seconds": null, "retry_and_pass_rate": null },
    "e2e": { "cases": 3, "files": 2, "serial_seconds": null, "retry_and_pass_rate": null }
  },
  "notes": "self-hosted runners do not upload timing or retry data to the history API. Case counts are from the junit xml, which is uploaded. There is no timing for this package and there will not be until the runner is reconfigured; ticket OPS-2214, unscheduled."
}

=============== FILE: data/change-shape/ledger.json ===============
{
  "package": "packages/ledger",
  "window": "2026-06-17 to 2026-09-15",
  "window_days": 90,
  "commits_classified": 196,
  "distribution": {
    "service-layer": { "commits": 139, "pct_commits": 71 },
    "pure-logic": { "commits": 33, "pct_commits": 17 },
    "data-heavy": { "commits": 16, "pct_commits": 8 },
    "ui-heavy": { "commits": 8, "pct_commits": 4 }
  },
  "mixed_commits": 6
}

=============== FILE: data/change-shape/console.json ===============
{
  "package": "packages/console",
  "window": "2026-06-17 to 2026-09-15",
  "window_days": 90,
  "commits_classified": 174,
  "distribution": {
    "ui-heavy": { "commits": 115, "pct_commits": 66 },
    "pure-logic": { "commits": 31, "pct_commits": 18 },
    "service-layer": { "commits": 23, "pct_commits": 13 },
    "data-heavy": { "commits": 5, "pct_commits": 3 }
  },
  "mixed_commits": 11
}

=============== FILE: data/change-shape/ingest.json ===============
{
  "package": "packages/ingest",
  "window": "2026-09-06 to 2026-09-15",
  "window_days": 9,
  "commits_classified": 5,
  "distribution": {
    "data-heavy": { "commits": 2, "pct_commits": 40 },
    "service-layer": { "commits": 2, "pct_commits": 40 },
    "pure-logic": { "commits": 1, "pct_commits": 20 },
    "ui-heavy": { "commits": 0, "pct_commits": 0 }
  },
  "mixed_commits": 3,
  "notes": "package directory did not exist before 2026-08-29, so there is no earlier history at this path. 3 of the 5 commits are flagged mixed."
}

=============== FILE: docs/atlas-notes.md ===============
# atlas - what the teams say, collected 2026-09-14

**ledger** (team Mint, 6 engineers). Two production incidents in the last
quarter, both contract mismatches between ledger and the settlement service:
a field renamed on one side of the boundary and a minor-unit mismatch on
currency amounts. Unit tests passed through both. The end-to-end suite caught
one in staging; the other reached production. Mint's tech lead says they
"don't really write integration tests, we never set the fixtures up."

**console** (team Iris, 5 engineers). No incidents this quarter. Iris rewrote
their middle layer in March and says it is the part of the suite they trust
most. Pull-request wait time is the top complaint in their retro; their CI
config shows the webpack build at 7m20s of an 11m40s job.

**ingest** (team Kiln, 3 engineers). Carved out of ledger on 2026-08-29. Still
moving files in; two more extraction pull requests are open. Kiln asked not to
be measured on anything until the extraction lands, which they expect in
October.
