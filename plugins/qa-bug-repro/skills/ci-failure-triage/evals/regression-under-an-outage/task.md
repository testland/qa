# 14 reds in the overnight build during the docs-index outage

## Problem Description

Overnight build 8842 came back with 14 failing tests. The internal
`docs-index` service was down from 01:50 to 03:10 - the status page confirms
it, and the on-call for that service has already posted the incident note.

The plan on the channel this morning is to rerun the build and carry on, since
"the whole thing is just the outage". One person pushed back because one of the
14 does not look like the others, but got told the build is noise and the rerun
will sort it out.

We ship the release branch at noon. We want the 14 reds looked at properly
before anyone presses rerun, so that if something real is hiding in there we
find it now rather than in production.

## Output Specification

Produce `triage-build-8842.md` containing:

1. A one-line disposition for each group of failures the outage accounts for -
   a single line per group is enough, and say what makes them one group.
2. A full write-up for any failure the outage does not account for: what kind
   of failure it is, who owns the next action, the evidence from the attached
   files with the specific lines and values, and the other explanations you
   considered with the specific observed value that rules each one out.
3. Whether the "rerun and carry on" plan is safe as it stands, and what you
   would do instead.

If the attached material does not settle a question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: fixing anything, editing tests, or drafting a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/build-8842.log ===============
2026-08-13T02:41:09Z ##[group]Run npx jest --ci --reporters=default
2026-08-13T02:42:55Z  FAIL  tests/docs/search-index.spec.ts
2026-08-13T02:42:55Z   ● Test suite failed to run
2026-08-13T02:42:55Z     FetchError: request to http://docs-index.internal:8080/v1/reindex failed,
2026-08-13T02:42:55Z     reason: connect ECONNREFUSED 10.4.2.19:8080
2026-08-13T02:42:55Z       at ClientRequest.<anonymous> (node_modules/node-fetch/lib/index.js:1501:11)
2026-08-13T02:42:55Z       at tests/support/docsIndexFixture.ts:22:18 (beforeAll)
2026-08-13T02:43:12Z  FAIL  tests/docs/article-render.spec.ts
2026-08-13T02:43:12Z     FetchError: connect ECONNREFUSED 10.4.2.19:8080 at tests/support/docsIndexFixture.ts:22:18 (beforeAll)
2026-08-13T02:43:29Z  FAIL  tests/docs/breadcrumbs.spec.ts
2026-08-13T02:43:29Z     FetchError: connect ECONNREFUSED 10.4.2.19:8080 at tests/support/docsIndexFixture.ts:22:18 (beforeAll)
2026-08-13T02:43:44Z  (9 further suites under tests/docs/ failed identically: same
2026-08-13T02:43:44Z   FetchError, same ECONNREFUSED 10.4.2.19:8080, same beforeAll frame in
2026-08-13T02:43:44Z   tests/support/docsIndexFixture.ts:22 - full list in the run summary)
2026-08-13T02:51:07Z  FAIL  tests/pricing/discount.spec.ts
2026-08-13T02:51:07Z   ● applies the seasonal discount to a subtotal
2026-08-13T02:51:07Z     expect(received).toBe(expected) // Object.is equality
2026-08-13T02:51:07Z     Expected: 8000
2026-08-13T02:51:07Z     Received: 8001
2026-08-13T02:51:07Z       42 |   const total = applyDiscount({ subtotal: 10001, rate: 0.2 });
2026-08-13T02:51:07Z     > 44 |   expect(total).toBe(8000);
2026-08-13T02:51:07Z       at tests/pricing/discount.spec.ts:44:19
2026-08-13T02:51:31Z  PASS  tests/pricing/tax.spec.ts (4.108 s)
2026-08-13T02:51:44Z  PASS  tests/pricing/currency.spec.ts (2.771 s)
2026-08-13T02:53:02Z Test Suites: 13 failed, 96 passed, 109 total
2026-08-13T02:53:02Z Tests:       14 failed, 1204 passed, 1218 total
2026-08-13T02:53:02Z Time:        711.4 s
2026-08-13T02:53:03Z ##[error]Process completed with exit code 1.

=============== FILE: ci/history-8842.md ===============
## Per-test history, last 50 main-branch runs

| Test | Failures in 50 | Notes |
|---|---|---|
| tests/docs/** (13 suites) | 13 each, all in build 8842 | never failed before build 8842 |
| tests/pricing/discount.spec.ts | 1 (build 8842) | 43 consecutive passes before it; also failed on the retry of build 8842 at 03:44, which ran the same commit while docs-index was still down |
| tests/pricing/tax.spec.ts | 0 | |
| tests/pricing/currency.spec.ts | 0 | |

- Runner image `ubuntu-24.04 / 20260810.1.0` on every run in the window,
  unchanged for 11 days.
- No quarantine list, flake list, or skip annotation exists in this repository.
- docs-index incident window: 2026-08-13 01:50 to 03:10 UTC (status page).

=============== FILE: ci/window-diff.txt ===============
$ git log --oneline --since=2026-08-12
5d1c7aa (2026-08-12 17:31) chore: tidy discount rounding
9e30b12 (2026-08-12 14:08) docs: add a runbook for the docs-index fixture

$ git show 5d1c7aa -- src/pricing/applyDiscount.ts
@@ export function applyDiscount({ subtotal, rate }: Args): number {
-  return Math.round(subtotal * (1 - rate));
+  return Math.ceil(subtotal * (1 - rate));
 }

$ git show 9e30b12 --stat
 docs/runbooks/docs-index-fixture.md | 41 +++++++++++++++++++++++++++++
 1 file changed, 41 insertions(+)
