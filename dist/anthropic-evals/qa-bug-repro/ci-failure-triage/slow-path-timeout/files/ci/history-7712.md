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
