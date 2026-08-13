# Zephyr Scale - vendor specifics

Reference detail for [test-management-sync](../SKILL.md). "Zephyr"
disambiguates into three Jira test-management products that are **not
API-compatible** - picking the right one is step zero:

| Product                               | Origin / current owner            | Key API host pattern                                  |
|---------------------------------------|------------------------------------|-------------------------------------------------------|
| **Zephyr Scale** (formerly TM4J)      | Adaptavist -> SmartBear           | `https://api.zephyrscale.smartbear.com/v2/`           |
| **Zephyr Squad** (the older one)      | Atlassian -> SmartBear            | `https://prod-api.zephyr4jiracloud.com/connect/`      |
| **Zephyr Enterprise** (server-only)   | SmartBear                          | On-prem Jira; per-instance                             |

This page covers **Zephyr Scale Cloud** as the primary path - it's
the most-deployed Zephyr variant in 2026 and the one new projects
pick. Notes for Squad / Enterprise are inline.

The official documentation is at **`support.smartbear.com/zephyr-scale-cloud/`**.
At the time of authoring (2026-05-05), the documentation site was
behind WebFetch limits (auth/region-gated content); the URL is the
canonical reference for real-browser navigation. Patterns below are
the stable shapes documented across the SmartBear KB and per-language
clients (`zephyr-scale-python-client`, the Postman collection
SmartBear ships, and the `mgechev/zephyr-scale-cloud-cli` community
client).

## Authenticate (Zephyr Scale Cloud)

Zephyr Scale Cloud uses a long-lived API token (generated via
"API Access Tokens" in the Zephyr Scale settings) sent as a Bearer
token:

```bash
ZEPHYR_TOKEN=<long-lived-token>

curl -H "Authorization: Bearer $ZEPHYR_TOKEN" \
  'https://api.zephyrscale.smartbear.com/v2/healthcheck'
```

Unlike Xray Cloud, no JWT exchange step - the token is used directly.

The token is **per-account, not per-project** - guard it with the
same care as a Jira admin credential.

If the team uses **Zephyr Squad**, the endpoints + auth differ
significantly - see the Squad-specific REST API docs and the
distinct `prod-api.zephyr4jiracloud.com` host.

## Map test methods to Zephyr Test Cases

Two patterns mirror the TestRail / Xray approach.

### Pattern A - Embed Test Case key in test name

```python
def test_TC1234_can_add_to_cart():
    ...
```

```javascript
test('can add to cart [TC1234]', async () => { /* ... */ });
```

A regex extracts `TC1234` (the Zephyr Scale Test Case key) at
sync time.

### Pattern B - JUnit metadata via custom adapter

For Java / TestNG:

```java
@Test
@TestCaseKey("PROJ-T1234")
public void canAddToCart() { /* ... */ }
```

The `@TestCaseKey` annotation is provided by community adapters
(no first-party SmartBear annotation library at the time of writing);
a small custom JUnit extension reads the annotation and emits a
Zephyr-compatible JSON file alongside the JUnit XML.

## Open a Test Cycle for the build

```python
# scripts/zephyr_sync.py
import os, requests

BASE = 'https://api.zephyrscale.smartbear.com/v2'
HEADERS = {
    'Authorization': f"Bearer {os.environ['ZEPHYR_TOKEN']}",
    'Content-Type': 'application/json',
}
PROJECT_KEY = os.environ['JIRA_PROJECT_KEY']    # e.g. "CALC"

def open_cycle(name, version=None):
    r = requests.post(f'{BASE}/testcycles', headers=HEADERS, json={
        'projectKey': PROJECT_KEY,
        'name': name,                          # e.g. "Build #1234"
        'plannedStartDate': iso_now(),
        'description': f'Automated cycle for {os.environ.get("BUILD_VERSION", "")}',
        'jiraProjectVersion': version,         # optional Jira version ID
    })
    r.raise_for_status()
    return r.json()['key']                      # e.g. "CALC-R42"
```

The returned `key` (e.g. `CALC-R42`) is the Test Cycle's identifier;
results land inside it.

## Post execution results

Per the documented Zephyr Scale Cloud `/testexecutions` endpoint
shape (consistent across SmartBear KB versions):

```python
def post_execution(cycle_key, test_case_key, status, comment=None,
                   actual_end_date=None, execution_time=None):
    r = requests.post(f'{BASE}/testexecutions', headers=HEADERS, json={
        'projectKey': PROJECT_KEY,
        'testCycleKey': cycle_key,
        'testCaseKey': test_case_key,           # e.g. "CALC-T1234"
        'statusName': status,                   # 'Pass' | 'Fail' | 'Blocked' | 'Not Executed'
        'comment': comment,
        'actualEndDate': actual_end_date,       # ISO-8601
        'executionTime': execution_time,        # milliseconds
    })
    r.raise_for_status()
    return r.json()
```

`statusName` accepts the Zephyr-installed status names. For projects
with custom statuses, query `/statuses?projectKey=...&statusType=TEST_EXECUTION`
at script init to confirm the available names - don't hard-code beyond
the four built-ins (`Pass`, `Fail`, `Blocked`, `Not Executed`).

## Batch multiple results

The `/testexecutions` endpoint is per-execution. For batched POSTs,
the documented `/automations/executions` endpoint accepts a payload
that wraps multiple results - the exact shape is variant per Zephyr
Scale version. The conservative pattern is to retry per-execution
with bounded concurrency:

```python
from concurrent.futures import ThreadPoolExecutor

def post_all(cycle_key, results, max_concurrent=5):
    with ThreadPoolExecutor(max_workers=max_concurrent) as ex:
        list(ex.map(lambda r: post_execution(cycle_key, **r), results))
```

`max_concurrent=5` keeps under the rate limit (60 req/min on most
plans) for typical run sizes.

## Wire into CI

```yaml
- name: Run tests
  run: npm test -- --reporters=jest-junit

- name: Sync to Zephyr Scale
  if: always()
  env:
    ZEPHYR_TOKEN: ${{ secrets.ZEPHYR_TOKEN }}
    JIRA_PROJECT_KEY: 'CALC'
    BUILD_VERSION: ${{ github.sha }}
  run: python scripts/zephyr_sync.py junit.xml
```

The script:

1. Parses `junit.xml` (`junit-xml-analysis`).
2. Extracts Test Case keys.
3. Opens a Test Cycle.
4. Posts executions with bounded concurrency (above).

## Folder + label organization

Zephyr Scale Test Cases live in folders. Two patterns:

- **Per-feature folder**: `Checkout/`, `Cart/`, `Auth/` - automated
  tests in those folders sync to Test Cases there.
- **Per-tier folder**: `Smoke/`, `Regression/`, `Edge cases/` -
  automated tests carry a tier label that the sync script translates
  to folder.

The folder structure is created via the Zephyr UI; the sync script
references existing Test Case keys and doesn't create folders on
the fly.

## JUnit XML import (alternative path)

Zephyr Scale also accepts a JUnit XML file via the
`/automations/executions/junit` endpoint with a multipart body. This
is simpler than the per-execution sync but loses per-test
metadata (no comment, no execution time per case beyond what JUnit
XML carries):

```bash
curl -X POST "https://api.zephyrscale.smartbear.com/v2/automations/executions/junit?projectKey=$JIRA_PROJECT_KEY&autoCreateTestCases=true" \
  -H "Authorization: Bearer $ZEPHYR_TOKEN" \
  -F "file=@junit.xml"
```

Per-execution POST is preferred when comment / evidence matters;
this JUnit XML import is the lightweight default.

## Worked example

A Jest suite syncing one build to project `CALC`:

1. Tests carry the Test Case key in the name (Pattern A):
   `test('can add to cart [CALC-T1234]', ...)`.
2. Export the token and run tests to JUnit XML:

```bash
export ZEPHYR_TOKEN=...             # from Zephyr Scale > API Access Tokens
export JIRA_PROJECT_KEY=CALC
npm test -- --reporters=jest-junit
```

3. The sync script opens a cycle, then posts one execution:

```python
cycle = open_cycle("Build #1234")           # returns e.g. "CALC-R42"
post_execution(cycle, "CALC-T1234", "Pass",
               comment="green on CI", execution_time=1240)
```

The execution lands inside cycle `CALC-R42`; open it in Jira to see
the Pass recorded against `CALC-T1234`.

## Zephyr-specific anti-patterns

| Anti-pattern                                                              | Why it fails                                                                  | Fix |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Targeting Zephyr Squad endpoints with Zephyr Scale auth                   | Different host, different auth model; immediate 401.                          | Confirm the variant (see the variant table at the top). |
| Hard-coding `statusName: "Pass"` / `"Fail"` only                          | Custom statuses installed by the project break silently.                      | Query `/statuses` at init; cache the valid set. |
| Per-execution POST with 1000 tests, no concurrency                        | Single-threaded; 30+ minutes for a release run.                              | Bounded concurrency (above). |
| Per-execution POST with unbounded concurrency                             | Trips rate limit (60/min); execution drops.                                   | `max_workers=5`. |
| Reusing one Test Cycle across many builds                                 | Cycle accumulates noise; release sign-off is unreadable.                      | One Cycle per build; Cycles can be archived per release. |
| `autoCreateTestCases=true` in CI                                          | Every renamed test creates a new Test Case; folder fills with orphans.       | Pre-create Test Cases manually; sync references existing keys. |
| Treating the API token as session-scoped                                  | Token is long-lived per-account; no refresh.                                  | Store in CI secrets; rotate via Zephyr Scale settings, not per-run. |

## Limitations

- **Three Zephyr products with different APIs.** Squad and Scale
  diverged years ago; Enterprise is its own thing. Check which
  variant the team has before pattern-matching tutorials.
- **No first-party adapter library across all languages.** SmartBear
  ships Postman collections + Java reference clients;
  Python / JS / Ruby teams use community-maintained adapters with
  varying maintenance status.
- **Folder + Test Case management is a UI workflow.** Programmatic
  Test Case creation exists but is fragile across versions; the
  sync-to-existing-cases pattern is more durable.
- **Documentation site is auth/region-gated.** Per the source-fetch
  failure documented above (2026-05-05), the canonical references
  require real-browser navigation; per-language client repos are
  the most reliable programmatic source.

## References

- `https://support.smartbear.com/zephyr-scale-cloud/` - canonical
  Zephyr Scale Cloud documentation portal (auth/region-gated;
  consult in a real browser).
- `https://support.smartbear.com/zephyr-scale-cloud/api-docs/` -
  REST API reference for Scale Cloud.
- `https://support.smartbear.com/zephyr-squad-cloud/` - Squad Cloud
  reference (different product, different API).
