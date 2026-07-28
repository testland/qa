---
name: zephyr-scale-case-management
description: "Author and manage Zephyr Scale Cloud test cases via the REST API v2 - create tests, attach steps, link to Jira issues, organise into folders, manage test cycles. Covers Bearer-token auth, the /testcases endpoints, the testScript / steps shape, and folder hierarchy. Use for pre-execution case authoring in Jira-anchored teams using Zephyr Scale (formerly TM4J). Distinct from Zephyr's test-cycle / execution endpoints which post results."
---

# zephyr-scale-case-management

## Overview

Zephyr Scale Cloud (formerly Adaptavist TM4J, now SmartBear) exposes
a REST API v2 with Bearer-token authentication.

Per smartbear.com/test-management/zephyr-scale (Cloudflare-
protected; cite by stable URL).

For canonical anatomy, see
`test-case-anatomy-reference`.

## When to use

- Authoring tests in Jira-anchored teams using Zephyr Scale.
- Bulk-importing legacy cases from CSV / another TCM.
- Organising the case repository (folders, labels, components).
- Case-quality scans for Zephyr-using teams.

## Authoring

### Authentication

Zephyr Scale Cloud uses Bearer tokens generated from the Zephyr
Scale UI (API access tokens, per-user):

```bash
export ZS_TOKEN="<bearer-token-from-zephyr-scale-ui>"
```

```python
import requests, os

BASE = "https://api.zephyrscale.smartbear.com/v2"
HEADERS = {
    "Authorization": f"Bearer {os.environ['ZS_TOKEN']}",
    "Content-Type": "application/json",
}
```

### Create a test case

`POST /testcases`:

```python
def create_test_case(project_key, name, objective=None, precondition=None,
                     steps=None, owner=None, folder_id=None,
                     labels=None, components=None, priority="Normal",
                     status="Approved"):
    """
    steps: list of {"inline": {"description": "...", "expectedResult": "..."}}
    priority: Highest / High / Normal / Low / Lowest (per project config)
    status: Approved / Draft / Deprecated
    """
    body = {
        "projectKey": project_key,
        "name": name,
        "objective": objective,
        "precondition": precondition,
        "ownerId": owner,
        "folderId": folder_id,
        "labels": labels or [],
        "componentId": components,
        "priorityName": priority,
        "statusName": status,
    }
    r = requests.post(f"{BASE}/testcases", json=body, headers=HEADERS)
    r.raise_for_status()
    created = r.json()
    if steps:
        attach_steps(created["key"], steps)
    return created
```

### Test script + steps

Steps are managed via a separate testScript endpoint:

```python
def attach_steps(test_case_key, steps):
    """
    steps: list of {"inline": {"description": str, "expectedResult": str,
                                "testData": str}}
    """
    body = {"mode": "OVERWRITE", "items": [{"inline": s} for s in steps]}
    r = requests.post(f"{BASE}/testcases/{test_case_key}/teststeps",
                      json=body, headers=HEADERS)
    r.raise_for_status()
    return r.json()

steps = [
    {"description": "Navigate to /login",
     "expectedResult": "Login form rendered", "testData": ""},
    {"description": "Enter credentials and click Submit",
     "expectedResult": "Redirected to /dashboard",
     "testData": "alice@example.com / pw123"},
]
attach_steps("PROJ-T123", steps)
```

`mode: OVERWRITE` replaces the existing step list; `APPEND` adds
to it.

### Folders + Jira links

`create_folder` (folders nest; build the hierarchy first, then place cases) and
`link_to_jira` (resolve the Jira key -> issue ID via the Jira REST API first)
are in
[references/zephyr-scale-api-reference.md](references/zephyr-scale-api-reference.md),
alongside the migration field map and response shapes.

### Get + list

```python
case = requests.get(f"{BASE}/testcases/PROJ-T123", headers=HEADERS).json()

# Paginated list
def list_cases(project_key, max_results=100):
    cases = []
    start_at = 0
    while True:
        r = requests.get(f"{BASE}/testcases",
                         params={"projectKey": project_key,
                                 "startAt": start_at,
                                 "maxResults": max_results},
                         headers=HEADERS)
        r.raise_for_status()
        data = r.json()
        cases.extend(data["values"])
        if data["isLast"]:
            break
        start_at += max_results
    return cases
```

Response shape: `{"values": [...], "startAt", "maxResults", "total", "isLast"}`.

## Running

### Bulk import via CSV to JSON

Wrap each row in try/except, throttle to ~60 req/min (the tenant limit), and
tally successes so one failing row does not abort the batch:

```python
import csv, time

rows = list(csv.DictReader(open("legacy.csv")))
created, failed = [], []
for row in rows:
    try:
        case = create_test_case(
            project_key=row["project"],
            name=row["title"],
            objective=row.get("objective"),
            precondition=row.get("precondition"),
            priority=row.get("priority", "Normal"),
            labels=row.get("labels", "").split(",") if row.get("labels") else None,
        )
        steps = [
            {"description": s, "expectedResult": e, "testData": d}
            for s, e, d in zip(
                row["steps"].split("|"),
                row["expected"].split("|"),
                (row.get("data") or "").split("|"),
            )
        ]
        attach_steps(case["key"], steps)
        created.append(case["key"])
    except Exception as e:
        failed.append((row["title"], str(e)))
    time.sleep(1)  # ~60 req/min; a 429 means back off further

print(f"created {len(created)}, failed {len(failed)}")
```

**Verify:** assert `len(created) + len(failed) == len(rows)` and that `failed`
is empty before treating the import as complete. On any 429, increase the delay;
on other errors, fix the source row and re-run the failed titles.

The migration field map (source column -> Zephyr field) is in
[references/zephyr-scale-api-reference.md](references/zephyr-scale-api-reference.md).

## Parsing results

`create_test_case` returns `{"id", "key", "self"}`. The `key` is
the project-prefixed identifier (`PROJ-T123`). Build permalink:

```python
# Jira Cloud + Zephyr Scale share a tenant
url = f"https://your-tenant.atlassian.net/projects/{project_key}?selectedItem=com.thed.zephyr.tests%3Atestcases#testcase/{key}"
```

## CI integration

Sync per-spec front-matter to Zephyr Scale:

```yaml
- name: Sync to Zephyr Scale
  env:
    ZS_TOKEN: ${{ secrets.ZEPHYR_SCALE_TOKEN }}
  run: python scripts/sync-zephyr-scale.py specs/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Inline steps in test-case body (objective field) | Per-step pass/fail unavailable | Use `/teststeps` testScript endpoint |
| Hard-coded priority names | Project-specific enum may differ | Discover via project config endpoint |
| Flat folder hierarchy | Hundreds of cases unfindable | Create folders matching feature areas |
| Mixing `componentId` and `labels[]` randomly | Cross-team queries break | Component for ownership; labels for cross-cutting concerns |
| Bulk-create without rate throttling | 429s on >100 cases / min | Limit to ~60 req / min |
| Storing the Bearer token in repo | Token leak | Environment variable / secret store |

## Limitations

- **Server / Data Center API divergence.** Server / DC Zephyr has
  a separate REST shape; this skill covers Cloud.
- **No native severity.** Severity = Jira custom field; configure
  per project.
- **`statusName` enum is project-scoped.** `Approved`, `Draft`,
  `Deprecated` are defaults; custom statuses possible.
- **Linked-issues API surface is asymmetric.** Linking a test to an
  issue is via Zephyr; viewing linked tests from a Jira issue is
  via Zephyr's panel - script visibility may differ.
- **Rate limits.** ~60 req / min per tenant; bulk import needs
  throttling.

## References

- Zephyr Scale Cloud REST API v2 - 
  smartbear.com/test-management/zephyr-scale (Cloudflare-
  protected; cite by stable URL).
- Atlassian Marketplace - Zephyr Scale (formerly TM4J) listing.
- Sibling references:
  `test-case-anatomy-reference`.
- Sibling skills:
  `testrail-case-management`,
  `xray-case-management`,
  `allure-testops-case-management`,
  `qase-io-case-management`.
- Sibling-plugin neighbour:
  `zephyr-integration` (in the qa-test-reporting plugin) - different scope (result sync via test cycles).
