# Search results test timed out again - it's on our list of usual suspects

## Problem Description

`search.spec.ts` "shows results for a partial query" timed out on the merge
queue this morning. That test is on the "tests that have burned us" page the
team keeps in the wiki - it has gone red twice in the last couple of months and
both times a rerun went green, so the habit now is to press rerun and forget
it.

This morning the rerun also failed. The suggestion on the channel is to wrap it
in `test.retry(2)` and let the queue move, because the release train leaves at
16:00 and this test "has always been like this".

The queue is blocked behind it. We want the failure looked at properly before
anyone adds a retry, and we want the reasoning written down.

## Output Specification

Produce `triage-search-timeout.md` containing:

1. What kind of failure this is and who owns the next action.
2. The evidence from the attached files that supports it, quoting the specific
   lines and values you relied on.
3. The other explanations you considered and, for each, the specific observed
   value that rules it out.
4. The next action, and a direct answer on whether the retry wrapper should go
   in this morning.

If the attached material does not settle the question, say so and name exactly
what you would need to collect. Do not fill a gap with the most likely story.

Out of scope: writing the fix, editing tests, adding retries, or drafting a
bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/merge-queue-7712.log ===============
2026-08-17T09:14:02Z ##[group]Runner Image
2026-08-17T09:14:02Z Image: ubuntu-24.04   Version: 20260810.1.0   Label: acme-e2e-pool   Hardware: 4 vCPU / 16 GB
2026-08-17T09:14:02Z ##[endgroup]
2026-08-17T09:14:05Z ##[group]Run npx playwright test --project=chromium
2026-08-17T09:14:44Z   ok  tests/search.spec.ts:18:3 › loads the empty search page (1.9s)
2026-08-17T09:15:02Z   ok  tests/search.spec.ts:24:3 › shows the recent-search list (2.1s)
2026-08-17T09:15:37Z [api] GET /search?q=lap 200 in 14812 ms (queries: 412)
2026-08-17T09:15:37Z   x   tests/search.spec.ts:31:3 › shows results for a partial query
2026-08-17T09:15:37Z     Test timeout of 30000ms exceeded.
2026-08-17T09:15:37Z     Error: expect(locator).toBeVisible() failed
2026-08-17T09:15:37Z     Locator:  getByTestId('result-row').first()
2026-08-17T09:15:37Z     Expected: visible
2026-08-17T09:15:37Z     Timeout:  15000ms
2026-08-17T09:15:37Z       at tests/search.spec.ts:36:44
2026-08-17T09:15:59Z [api] GET /account 200 in 96 ms (queries: 2)
2026-08-17T09:16:01Z   ok  tests/account.spec.ts:12:3 › shows the plan card (2.2s)
2026-08-17T09:16:24Z   ok  tests/checkout.spec.ts:9:3 › completes a card payment (4.8s)
2026-08-17T09:16:31Z   1 failed, 28 passed (2m26s)
2026-08-17T09:16:32Z ##[group]Post job: resource capture
2026-08-17T09:16:32Z 09:16:32 up 4 min,  load average: 1.42, 1.11, 0.62
2026-08-17T09:16:32Z Average:     all   21.40    0.00    4.02    0.31    0.00   74.27
2026-08-17T09:16:32Z ##[endgroup]
2026-08-17T09:16:33Z ##[error]Process completed with exit code 1.

=============== FILE: ci/history-7712.md ===============
## `tests/search.spec.ts:31 shows results for a partial query`, last 50 runs

| Run offset | Result | Server timing line for GET /search |
|---|---|---|
| this run (7712) | fail, 30000ms test timeout | 200 in 14812 ms (queries: 412) |
| rerun of the same commit, 09:31 | fail, 30000ms test timeout | 200 in 15044 ms (queries: 412) |
| 1-12 runs ago | pass | 200 in 168-214 ms (queries: 3) |
| 41 runs ago | fail, 30000ms test timeout | 200 in 191 ms (queries: 3) |
| 47 runs ago | fail, 30000ms test timeout | 200 in 174 ms (queries: 3) |
| all other runs in the window | pass | 200 in 161-229 ms (queries: 3) |

- The failures 41 and 47 runs ago were both green on the next run of the same
  commit; both logs show the results row rendering after the assertion window.
- Runner image, label and hardware unchanged across all 50 runs.
- No other test failed in run 7712 or in the rerun.
- The "tests that have burned us" page is a wiki page. This repository has no
  flake list, quarantine annotation, or skip decorator, and nothing in CI reads
  the wiki page.

## Changes in the window

```
$ git log --oneline --since=2026-08-15
6a71e9c (2026-08-16 18:02) refactor(search): simplify facet lookup
41bb0d8 (2026-08-15 10:31) chore: bump prettier
```

```
$ git show 6a71e9c -- src/search/buildQuery.ts
@@ export async function search(term: string) {
-  const rows = await db.query(SEARCH_WITH_FACETS_SQL, [term]);
-  return rows.map(toResult);
+  const rows = await db.query(SEARCH_SQL, [term]);
+  return Promise.all(
+    rows.map(async (row) => ({
+      ...toResult(row),
+      facets: await findFacets(row.id),
+    })),
+  );
 }
```
