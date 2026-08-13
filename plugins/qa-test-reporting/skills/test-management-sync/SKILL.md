---
name: test-management-sync
description: "Syncs automated test results into test management tools - TestRail (standalone, `add_run` + batched `add_results_for_cases`), Xray for Jira (JWT auth + `/api/v2/import/execution/*`), and Zephyr Scale (Bearer token + `/testexecutions`) - from CI. The body carries the vendor-independent push-results workflow (map tests to case IDs, open a run / execution / cycle per build, batch results back, close on main only, run as an `if: always()` step) with TestRail as the worked example; full vendor specifics live in references/ (testrail.md, xray.md, zephyr.md). Use when automated suites must keep the team's test management view in sync without a human copy-paste step; for hosted cross-run flakiness analytics rather than TCM sync use currents-integration, and for authoring / migrating test CASES rather than pushing results see qa-test-management's tcm-case-management."
---

# test-management-sync

## Overview

Teams that manage test cases in a test management tool need
**automation result sync** - without it, automated runs don't update
the tool and the test-management view drifts from reality. The sync
job has the same five-step shape across every vendor; only the auth
model, the endpoints, and the case-ID scheme differ.

This skill wires that sync: the vendor-independent workflow below,
TestRail as the worked example, and per-vendor API detail in
`references/`.

## Vendor routing

| Vendor | Shape | Auth | Results API | Reference |
|---|---|---|---|---|
| **TestRail** (Gurock / Idera) | Standalone TCM (not a Jira app) | Basic (email + API key) | `add_run` + batched `add_results_for_cases` | [references/testrail.md](references/testrail.md) |
| **Xray** | Jira app (Test / Test Execution issue types) | Cloud: `client_id`+`client_secret` → 24h JWT; Server/DC: PAT | `/api/v2/import/execution/{junit,cucumber,nunit,testng,robot}` | [references/xray.md](references/xray.md) |
| **Zephyr Scale** (SmartBear, formerly TM4J) | Jira app (Test Cycles) | Long-lived Bearer token | `POST /testexecutions` (or bulk `/automations/executions/junit`) | [references/zephyr.md](references/zephyr.md) |

Routing rules:

- Test management is **standalone TestRail** → [references/testrail.md](references/testrail.md).
- Test management is a **Jira app** → Xray ([references/xray.md](references/xray.md)) or
  Zephyr Scale ([references/zephyr.md](references/zephyr.md)) - check which app the Jira
  instance has installed; Zephyr further disambiguates into Scale / Squad / Enterprise
  (the zephyr reference's variant table).
- The team wants **cross-run flakiness analytics**, not case sync →
  `currents-integration` (different job entirely).

## When to use

- The team runs both manual and automated tests and the automated
  results need to land in the test management tool.
- A CI pipeline must auto-create a run / execution / cycle per build
  and populate results so release management has the full picture.
- The team manages test cases in the tool and wants per-case mapping
  back to the automated test (via case-ID labels in test names or
  annotations).

## The push-results workflow (vendor-independent)

Every vendor sync follows the same five steps:

1. **Authenticate** from CI secrets - never URL params, never logged
   (TestRail: Basic email+key; Xray Cloud: JWT exchange per run;
   Zephyr Scale: Bearer token).
2. **Map tests to case IDs** - embed the vendor's case ID / issue key
   in the test name (`test('adds to cart [C1234]')`) or use an
   annotation (`@XrayTest(key=...)`, `@TestRailCase(id=...)`,
   `@TestCaseKey(...)`). Name-embedding is lowest-friction; either
   way the sync script must recover the ID from the result.
3. **Open a container per build** - a TestRail Test Run, an Xray Test
   Execution, or a Zephyr Test Cycle - scoped to exactly the cases
   the automated suite covers, named `<branch> · <sha-short>`.
4. **Batch results back** - one batched POST (or bounded-concurrency
   loop) rather than one call per test; every vendor has a rate limit
   that per-test posting trips on real suites.
5. **Close / finalize on `main` only** - closed containers are
   read-only; PR runs stay open so flake-fix reruns can update them.

Run the sync as an `if: always()` CI step after the test step so
failed runs still update the tool. The input is the runner's JUnit
XML - parse it with `junit-xml-analysis`.

## Worked example - TestRail

A Jest suite syncing one build to TestRail project `42`, suite `7`.

1. Tests carry the case ID in the name (Step 2, name-embedding):
   `test('can add to cart [C1234]', ...)`.
2. Export credentials and run the suite to JUnit XML:

```bash
export TESTRAIL_HOST=https://acme.testrail.io
export TESTRAIL_USER=ci@acme.com
export TESTRAIL_API_KEY=...            # My Settings > API Keys
npm test -- --reporters=jest-junit
```

3. The sync script opens a run scoped to the covered cases
   (`include_all: False` + explicit `case_ids` - without this a
   5,000-case project produces a 5,000-row run of empty cells), then
   batches the results in **one** POST:

```python
run_id = open_run(42, 7, "main · a1b2c3d", [1234])   # add_run → Run ID
add_results(run_id, [                                 # add_results_for_cases (batch)
    {'case_id': 1234, 'status_id': 1, 'comment': 'green on CI', 'elapsed': '12s'},
])
```

`status_id: 1` is Passed per the stock convention (1 Passed /
2 Blocked / 3 Untested / 4 Retest / 5 Failed) - but read
`get_statuses` at script init and verify every ID in your map exists,
because TestRail accepts unknown IDs and writes to the wrong status
silently. Full script, per-result fields, and CI wiring:
[references/testrail.md](references/testrail.md).

4. Open the run in TestRail to see `C1234` marked Passed with the
   `12s` elapsed time. Close the run only when this is the `main`
   build (Step 5).

For the same build against Xray the container is a Test Execution
fed by `POST /api/v2/import/execution/junit?projectKey=...`
([references/xray.md](references/xray.md)); against Zephyr Scale it
is a Test Cycle fed by `POST /testexecutions`
([references/zephyr.md](references/zephyr.md)).

## Anti-patterns (all vendors)

| Anti-pattern                                                              | Why it fails                                                                  | Fix |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Per-test result POSTs                                                     | N API calls trip every vendor's rate limit (TestRail 180 req/min, Zephyr 60 req/min). | Batch (TestRail `add_results_for_cases`, Xray format import) or bound concurrency (Zephyr). |
| Hard-coded status IDs / names                                             | Custom statuses break the mapping silently.                                   | Fetch the status list at script init; build the map dynamically. |
| Auto-creating cases / issues from CI                                      | Every renamed test creates a new case; the project fills with orphans.        | Pre-create cases; sync references existing IDs only. |
| Posting credentials as URL params or logging tokens                        | Secrets leak in proxy logs / CI logs.                                          | Auth headers only; mask tokens (`::add-mask::`). |
| Closing every run, including PR runs                                       | Closed runs can't accept the rerun after a flake fix.                          | Close / finalize only `main` runs. |
| One container reused across many builds                                    | The run accumulates noise; release sign-off is unreadable.                    | One run / execution / cycle per build. |
| Sync step not `if: always()`                                               | Failed test runs - the ones release management most needs - never sync.        | `if: always()` after the test step. |

## Limitations

- **Cases must already exist in the tool.** The sync maps results to
  existing case IDs; it doesn't author cases (that's
  qa-test-management's `tcm-case-management`).
- **The mapping lives in test names / annotations.** Renames that
  drop the ID silently unmap the test - surface unmapped tests as
  warnings, never drop them (per-vendor references show how).
- **Vendor APIs differ in batch semantics.** TestRail batches
  natively, Xray imports whole runner files, Zephyr Scale is
  per-execution with bounded concurrency - don't port one vendor's
  script shape blindly to another.

## References

- [references/testrail.md](references/testrail.md) - TestRail auth, case-ID mapping, `add_run` / `add_results_for_cases` / `close_run`, per-result fields, CI wiring, untested-case handling.
- [references/xray.md](references/xray.md) - Xray Cloud JWT auth, per-format import endpoints, `@XrayTest` / `@Requirement` mapping, `testExecKey` lifecycle, Playwright reporter.
- [references/zephyr.md](references/zephyr.md) - Zephyr Scale variant disambiguation, Bearer auth, Test Cycles, `/testexecutions`, bounded-concurrency batching, bulk JUnit import.
- `junit-xml-analysis` - upstream parser for the input every sync script consumes.
- `currents-integration` - different role: test analytics over time, not test management.
