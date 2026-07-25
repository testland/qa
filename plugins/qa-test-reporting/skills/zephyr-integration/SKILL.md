---
name: zephyr-integration
description: "Syncs automated test results to Zephyr Scale for Jira (formerly TM4J / SmartBear / Adaptavist) - picks the right product variant (Scale Cloud vs Squad vs Enterprise), authenticates with a long-lived API token sent as a Bearer header, opens a Test Cycle for the build, posts per-test-case executions via the `POST /testexecutions` endpoint (or bulk JUnit XML via `/automations/executions/junit`), and maps automated test methods to Zephyr Test Cases via `@TestCaseKey`-style annotations or test-name parsing. Use when the team's Jira test management is Zephyr Scale (the most common Zephyr variant in 2026) and CI must keep Test Cycles in sync with automation."
---

# zephyr-integration

## Overview

"Zephyr" disambiguates into three Jira test-management products
that are **not API-compatible** - picking the right one is step
zero:

| Product                               | Origin / current owner            | Key API host pattern                                  |
|---------------------------------------|------------------------------------|-------------------------------------------------------|
| **Zephyr Scale** (formerly TM4J)      | Adaptavist -> SmartBear           | `https://api.zephyrscale.smartbear.com/v2/`           |
| **Zephyr Squad** (the older one)      | Atlassian -> SmartBear            | `https://prod-api.zephyr4jiracloud.com/connect/`      |
| **Zephyr Enterprise** (server-only)   | SmartBear                          | On-prem Jira; per-instance                             |

This skill covers **Zephyr Scale Cloud** as the primary path - 
it's the most-deployed Zephyr variant in 2026 and the one new
projects pick. Notes for Squad / Enterprise are inline.

The official documentation is at **`support.smartbear.com/zephyr-scale-cloud/`**.
At the time of authoring (2026-05-05), the documentation site was
behind WebFetch limits (auth/region-gated content); the URL is the
canonical reference for real-browser navigation. Patterns below are
the stable shapes documented across the SmartBear KB and per-language
clients (`zephyr-scale-python-client`, the Postman collection
SmartBear ships, and the `mgechev/zephyr-scale-cloud-cli` community
client).

## When to use

- The team uses Jira + Zephyr Scale and needs CI-side automation
  to update Zephyr Test Cycles.
- A release-process gate is "all Zephyr Test Cycles for the release
  must be green" - automated runs need to feed the cycle.
- The team is migrating from TestRail or Xray to Zephyr Scale and
  needs the same automation-sync pattern.

If the team uses **Zephyr Squad**, the endpoints + auth differ
significantly - see the Squad-specific REST API docs and the
distinct `prod-api.zephyr4jiracloud.com` host.

## How to use

1. Confirm the variant is Zephyr Scale Cloud (see the Overview
   variant table); Squad / Enterprise use different hosts and auth.
2. Authenticate with the long-lived API token as a Bearer header
   (below).
3. Map each automated test to a Zephyr Test Case key (name-embedded
   or `@TestCaseKey` annotation), open a Test Cycle for the build,
   and `POST /testexecutions` one result per test case.
4. Batch the run with bounded concurrency and wire it into CI - the
   batch helper, the full CI workflow, folder / label organization,
   and the bulk JUnit XML import path are in
   [references/api-wiring.md](references/api-wiring.md).

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

For a lighter path that skips per-execution POSTs, Zephyr Scale also
ingests a JUnit XML file directly via `/automations/executions/junit`
- see [references/api-wiring.md](references/api-wiring.md).

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
the Pass recorded against `CALC-T1234`. To sync the whole run,
extract every key from the JUnit XML and post with bounded
concurrency - see [references/api-wiring.md](references/api-wiring.md).

## Operating in CI

Run the sync as an `if: always()` step after the test step so failed
runs still update Zephyr. The script parses `junit.xml`
(`junit-xml-analysis`), extracts Test Case keys, opens one Test Cycle
per build, and posts executions with bounded concurrency (keep
`max_workers=5` to stay under the 60 req/min rate limit). Supply
`ZEPHYR_TOKEN` from CI secrets. The full GitHub Actions workflow, the
batch helper, folder / label organization, and the bulk JUnit XML
import alternative are in
[references/api-wiring.md](references/api-wiring.md).

## Anti-patterns

| Anti-pattern                                                              | Why it fails                                                                  | Fix |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------|-----|
| Targeting Zephyr Squad endpoints with Zephyr Scale auth                   | Different host, different auth model; immediate 401.                          | Confirm the variant (see the Overview variant table). |
| Hard-coding `statusName: "Pass"` / `"Fail"` only                          | Custom statuses installed by the project break silently.                      | Query `/statuses` at init; cache the valid set. |
| Per-execution POST with 1000 tests, no concurrency                        | Single-threaded; 30+ minutes for a release run.                              | Bounded concurrency (see references/api-wiring.md). |
| Per-execution POST with unbounded concurrency                             | Trips rate limit (60/min); execution drops.                                   | `max_workers=5` (see references/api-wiring.md). |
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
- [references/api-wiring.md](references/api-wiring.md) - the bounded-
  concurrency batch helper, the full GitHub Actions workflow, folder /
  label organization, and the bulk JUnit XML import path.
- `junit-xml-analysis` - upstream
  parser for the input the sync script consumes.
- `xray-integration`,
  `testrail-integration` - 
  sibling test-management integrations with the same architecture
  but different APIs.
