---
name: testrail-integration
description: "Syncs test runs / results / cases between an automated test suite and TestRail (Gurock / Idera) - opens a Test Run for the build (`add_run`), batches per-case results back via `add_results_for_cases` (preferred over per-test `add_result_for_case` - N+1 API calls vs 1), maps the test framework's pass/fail/skip to TestRail status IDs, and attaches build URL + version + elapsed time. Use when the team's test management is standalone TestRail (not a Jira app) and automated suites must update it without a human copy-paste step; when the TCM is instead a Jira app use xray-integration (Xray) or zephyr-integration (Zephyr Scale), and for hosted cross-run flakiness analytics rather than TCM sync use currents-integration."
---

# testrail-integration

## Overview

Teams that use TestRail as the source of truth for test cases and
runs need **automation result sync** - without it, automated runs
don't update TestRail and the test-management view drifts from
reality. This skill wires that sync.

The official documentation is at
**`support.testrail.com/hc/en-us/articles/...`** (the canonical
support knowledge base) and **`testrail.com/docs/api/`** (the API
reference). At the time of this skill's authoring (2026-05-05), both
were behind a 403 to automated WebFetch; the URLs above are the
canonical references that authors should consult in a real
browser.

The patterns documented below are the **stable, well-known TestRail
API shapes** that have been documented for many years across the
Gurock blog, multiple versions of the support KB, and the per-language
client libraries (Python `testrail`, Java `testrail-java-client`,
JavaScript `testrail-api`).

## When to use

- The team uses TestRail and runs both manual and automated tests;
  the automated results need to land in TestRail.
- A CI pipeline must auto-create a Test Run + populate results so
  release management has the full picture.
- The team manages test cases in TestRail and wants per-case mapping
  back to the automated test (via custom case ID labels in test
  names / annotations).

## How to use

1. Confirm the team's test management is standalone TestRail; generate a
   per-user API key (My Settings > API Keys) and set host / user / key.
2. Authenticate every request with HTTP Basic auth,
   `base64(email:api_key)` (Step 1).
3. Tag each automated test with its TestRail case ID - embedded in the test
   name (`C1234`) or via an annotation (Step 2).
4. Open a Test Run scoped to the covered cases: `add_run` with
   `include_all: false` + explicit `case_ids` (Step 3).
5. Map the framework's pass/fail/skip to TestRail status IDs and batch the
   results back with `add_results_for_cases` - one POST, not N (Step 4).
6. Optionally close the run on `main` (Step 5), then wire the whole thing as
   an `if: always()` CI step - full workflow, per-result fields, and
   untested-case handling in
   [references/ci-and-fields.md](references/ci-and-fields.md).

## Step 1 - Authentication

TestRail uses HTTP Basic auth with **email + API key** (preferred
over password - the API key is per-user, revocable):

```bash
# Generated in TestRail: My Settings → API Keys
TESTRAIL_API_KEY=<generated>
TESTRAIL_USER=test-runner@example.com
TESTRAIL_HOST=https://yourcompany.testrail.io
```

All requests use:

```
Authorization: Basic <base64(email:api_key)>
Content-Type: application/json
```

The base API URL is `${TESTRAIL_HOST}/index.php?/api/v2`. Every
endpoint is appended after `?/api/v2`.

## Step 2 - Map test names to TestRail case IDs

Two common patterns:

### Pattern A - Embed case ID in test name

```python
def test_C1234_can_add_to_cart():
    ...
```

A regex extracts `C1234` (the TestRail case ID) at sync time.

### Pattern B - Annotation / metadata

```java
@Test
@TestRailCase(id = 1234)
void canAddToCart() { ... }
```

Or in JS:

```javascript
test('can add to cart [C1234]', async () => {
  // ...
});
```

Pattern A is the lowest-friction; Pattern B is cleaner when the
test framework supports custom annotations. Either way, the sync
script needs a way to find the case ID from the test result.

## Step 3 - Open a Test Run for the build

```python
# scripts/testrail_sync.py
import base64, json, requests
from os import environ as env

API = f"{env['TESTRAIL_HOST']}/index.php?/api/v2"
AUTH = base64.b64encode(f"{env['TESTRAIL_USER']}:{env['TESTRAIL_API_KEY']}".encode()).decode()
HEADERS = {'Authorization': f'Basic {AUTH}', 'Content-Type': 'application/json'}

def open_run(project_id, suite_id, name, case_ids):
    r = requests.post(
        f'{API}/add_run/{project_id}',
        headers=HEADERS,
        json={
            'suite_id': suite_id,
            'name': name,
            'include_all': False,
            'case_ids': case_ids,
        },
    )
    r.raise_for_status()
    return r.json()['id']  # Run ID
```

`include_all: False` + `case_ids: [...]` opens a run scoped to the
exact cases the automated suite covers. Without this, a 5,000-case
project produces a 5,000-row Test Run with thousands of empty
cells.

## Step 4 - Batch results back

The well-known **status ID convention** for stock TestRail
installations:

| Status   | ID  |
|----------|----:|
| Passed   |  1  |
| Blocked  |  2  |
| Untested |  3  |
| Retest   |  4  |
| Failed   |  5  |

Custom status IDs (added by the project admin) follow 6+. Read the
`get_statuses` endpoint at sync-script init to confirm - don't
hard-code.

```python
def add_results(run_id, results):
    """results = [{'case_id': 1234, 'status_id': 1, 'comment': '...', 'elapsed': '12s'}]"""
    r = requests.post(
        f'{API}/add_results_for_cases/{run_id}',
        headers=HEADERS,
        json={'results': results},
    )
    r.raise_for_status()
    return r.json()
```

**Use `add_results_for_cases` (batch), not `add_result_for_case`
(per-case)**. A 200-test run is one POST instead of 200 POSTs;
TestRail's rate limit (180 req/min on shared cloud) makes per-case
posting flaky.

Each result entry accepts `case_id` + `status_id` (both required),
plus optional `comment`, `elapsed`, `version`, `defects`, and
`assignedto_id`. The full per-result field list is in
[references/ci-and-fields.md](references/ci-and-fields.md).

## Step 5 - Close the run

After all results are in:

```python
def close_run(run_id):
    requests.post(f'{API}/close_run/{run_id}', headers=HEADERS)
```

Closed runs are read-only - no further results can be added. Useful
for release-stamp runs; skip for runs that get re-run.

## Step 6 - Operating in CI

Run the sync as an `if: always()` step after the test step so failed
runs still update TestRail. The script parses `junit.xml`
(`junit-xml-analysis`), extracts case IDs (Step 2), opens a run scoped
to the covered cases (Step 3), batches results (Step 4), and optionally
closes the run on `main` only (Step 5). Supply `TESTRAIL_HOST` /
`TESTRAIL_USER` / `TESTRAIL_API_KEY` from CI secrets. The full GitHub
Actions workflow, the per-result field list, and handling for tests that
carry no case ID are in
[references/ci-and-fields.md](references/ci-and-fields.md).

## Worked example

A Jest suite syncing one build to TestRail project `42`, suite `7`:

1. Tests carry the case ID in the name (Step 2, Pattern A):
   `test('can add to cart [C1234]', ...)`.
2. Export credentials and run the suite to JUnit XML:

```bash
export TESTRAIL_HOST=https://acme.testrail.io
export TESTRAIL_USER=ci@acme.com
export TESTRAIL_API_KEY=...            # My Settings > API Keys
npm test -- --reporters=jest-junit
```

3. The sync script opens a run scoped to the covered cases, then batches
   the results:

```python
run_id = open_run(42, 7, "main · a1b2c3d", [1234])   # returns the Run ID
add_results(run_id, [
    {'case_id': 1234, 'status_id': 1, 'comment': 'green on CI', 'elapsed': '12s'},
])
```

Open the run in TestRail to see `C1234` marked Passed with the `12s`
elapsed time. Close the run (Step 5) only when this is the `main` build.

## Anti-patterns

| Anti-pattern                                                              | Why it fails                                                                  | Fix |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Per-test `add_result_for_case` calls                                      | N API calls; rate limit (180 req/min on Cloud) trips on suites >180 cases.   | `add_results_for_cases` batch (Step 4). |
| Hard-coded status IDs without `get_statuses`                              | Custom statuses break the mapping; "Failed" goes to "Custom Status" silently. | Fetch `get_statuses` at script init; build the map dynamically. |
| `include_all: True` on `add_run`                                          | The run includes every case in the suite, most as Untested; runs become noise. | `include_all: False` + explicit `case_ids: [...]`. |
| Posting credentials as URL params                                          | Secrets leak in proxy logs.                                                   | Always Basic auth header (Step 1). |
| No retry on 5xx                                                            | TestRail Cloud has occasional 502s; one transient failure loses the whole run. | Retry with exponential backoff on 5xx; cap at 3 attempts. |
| Closing every run, including PR runs                                       | Closed runs can't accept reruns; a PR retest after fixing flake fails to update. | Close only `main` runs (Step 6); PR runs stay open. |
| Storing case IDs in test code AND in TestRail                              | Two sources of truth; renames drift.                                          | TestRail is canonical; test code references via ID only (Step 2 Pattern A). |

## Limitations

- **Test cases must already exist in TestRail.** Pre-create cases
  manually or via `add_case` before the first sync; the sync script
  doesn't create cases on the fly.
- **Per-step results require a different endpoint.** `custom_step_results`
  is per-installation; the project admin must enable a custom field
  for steps before the API accepts step-level data.
- **Rate limits.** Cloud installations cap at 180 req/min per IP.
  Plan batching accordingly.
- **TestRail Cloud auth is per-user, not per-app.** OAuth / SSO is
  not supported for API access; the API key is the only mechanism.
- **No first-party JUnit XML import.** TestRail's own JUnit importer
  is a separate (deprecated) tool; the sync script approach in
  this skill is the modern path.

## References

- TestRail official documentation portal:
  `https://support.testrail.com/hc/en-us/categories/7080117421716`
  (categorized KB; per-endpoint articles).
- TestRail API Reference:
  `https://support.testrail.com/hc/en-us/sections/7077986539540`
  (Results / Runs / Cases / Statuses endpoints).
- These canonical URLs were 403 to automated WebFetch on
  2026-05-05; consult in a real browser. The patterns above are the
  stable shapes documented across multiple TestRail versions and
  the per-language client libraries (`testrail` Python,
  `testrail-api` JS).
- [references/ci-and-fields.md](references/ci-and-fields.md) - the full
  per-result field list, the end-to-end CI workflow, and untested-case
  handling.
- `junit-xml-analysis` - 
  upstream parser for the input the sync script consumes.
- `xray-integration`,
  `zephyr-integration` - sibling
  Jira-native alternatives.
- `currents-integration` - 
  different role: test analytics over time, not test management.
