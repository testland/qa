---
name: testrail-integration
description: "Syncs test runs / results / cases between an automated test suite and TestRail (Gurock / Idera) - opens a Test Run for the build (`add_run`), batches per-case results back via `add_results_for_cases` (preferred over per-test `add_result_for_case` - N+1 API calls vs 1), maps the test framework's pass/fail/skip to TestRail status IDs, and attaches build URL + version + elapsed time. Use when the team uses TestRail for test management and wants automated suites to update TestRail without a human-driven copy-paste step."
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

Common per-result fields:

| Field        | Use                                                    |
|--------------|--------------------------------------------------------|
| `case_id`    | Required. The TestRail case ID.                        |
| `status_id`  | Required. Per the convention above.                    |
| `comment`    | The test framework's failure message + stack trace.    |
| `elapsed`    | Format: `'1h 30m 45s'` or `'45s'`. Optional.           |
| `version`    | Build version / commit SHA. Searchable in the UI.      |
| `defects`    | Comma-separated Jira / GitHub issue keys.               |
| `assignedto_id` | Auto-assign failures to a specific user.            |

## Step 5 - Close the run

After all results are in:

```python
def close_run(run_id):
    requests.post(f'{API}/close_run/{run_id}', headers=HEADERS)
```

Closed runs are read-only - no further results can be added. Useful
for release-stamp runs; skip for runs that get re-run.

## Step 6 - Wire into a CI pipeline

```yaml
- name: Run tests
  run: npm test -- --reporters=jest-junit
  env:
    JEST_JUNIT_OUTPUT_FILE: junit.xml

- name: Sync to TestRail
  if: always()
  env:
    TESTRAIL_HOST: ${{ secrets.TESTRAIL_HOST }}
    TESTRAIL_USER: ${{ secrets.TESTRAIL_USER }}
    TESTRAIL_API_KEY: ${{ secrets.TESTRAIL_API_KEY }}
    TESTRAIL_PROJECT_ID: '42'
    TESTRAIL_SUITE_ID: '7'
    BUILD_VERSION: ${{ github.sha }}
  run: python scripts/testrail_sync.py junit.xml
```

The sync script:

1. Parses `junit.xml` (see `junit-xml-analysis`).
2. Extracts case IDs from test names (Step 2).
3. Opens a run named `<branch> · <sha-short>` (Step 3).
4. Batches results (Step 4).
5. Optionally closes the run (Step 5) - typically only on `main`.

## Step 7 - Handling untested case IDs

Tests that have no TestRail case ID (case removed; new test;
intentional sync-skip) need explicit handling:

```python
unmapped = [t for t in tests if extract_case_id(t['name']) is None]
if unmapped:
    print(f"Warning: {len(unmapped)} tests have no TestRail case ID:")
    for t in unmapped:
        print(f"  - {t['name']}")
```

Don't silently drop unmapped tests - they're candidates for either
new TestRail cases or naming-pattern fixes.

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
- `junit-xml-analysis` - 
  upstream parser for the input the sync script consumes.
- `xray-integration`,
  `zephyr-integration` - sibling
  Jira-native alternatives.
- `currents-integration` - 
  different role: test analytics over time, not test management.
